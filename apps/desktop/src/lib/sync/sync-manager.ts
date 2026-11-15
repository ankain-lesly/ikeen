import { db } from '@/db/client';
import { syncMetadata } from '@/db/schema';
import { eq } from 'drizzle-orm';
import * as Ably from 'ably';
import type {
  FolderMutationPayload,
  NoteMutationPayload,
  BlockMutationPayload,
  ReminderMutationPayload,
} from '@repo/types';
import { SYNC_CONSTANTS } from '@repo/utils/constants';
import {
  getPendingOutbox,
  getOutboxCount,
  markOutboxInFlight,
  markOutboxSuccess,
  markOutboxFailed,
  resetOutboxInFlightOnStartup,
} from './outbox';
import { upsertFolderFromSync } from '@/lib/queries/folders';
import { upsertNoteFromSync } from '@/lib/queries/notes';
import { upsertBlockFromSync } from '@/lib/queries/note-blocks';
import { upsertReminderFromSync } from '@/lib/queries/reminders';
import { syncApi } from './sync-api';
import { useSyncStore } from './use-sync';
import { useAuthStore } from '@/stores/use-auth-store';
import {
  processMediaUploadQueue,
  resetMediaInFlightOnStartup,
} from '@/lib/media/upload-service';

type SyncTriggerCallback = () => void;
const listeners = new Set<SyncTriggerCallback>();

export function onSyncComplete(callback: SyncTriggerCallback): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

function notifySyncComplete() {
  for (const cb of listeners) {
    try {
      cb();
    } catch (err: unknown) {
      console.error('[SyncManager:ListenerError]', err);
    }
  }
}

class DesktopSyncManager {
  private isSyncing = false;
  private syncQueued = false;
  private isInitialized = false;
  private ablyClient: Ably.Realtime | null = null;
  private ablyChannel: Ably.RealtimeChannel | null = null;
  private lastFocusSyncTime = 0;
  private readonly MIN_FOCUS_SYNC_INTERVAL_MS = 30_000;

  init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // 1. Startup outbox & media recovery
    void resetOutboxInFlightOnStartup().then(() => {
      void this.updatePendingCount();
    });
    void resetMediaInFlightOnStartup().then(() => {
      void processMediaUploadQueue();
    });

    // Check initial auth state
    if (!syncApi.isAuthenticated()) {
      useSyncStore.getState().setStatus('offline');
    }

    // 2. Window focus listener with 30s throttle
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', () => {
        if (!syncApi.isAuthenticated()) return;
        const now = Date.now();
        if (now - this.lastFocusSyncTime < this.MIN_FOCUS_SYNC_INTERVAL_MS) {
          return;
        }
        this.lastFocusSyncTime = now;
        void this.sync();
        void processMediaUploadQueue();
      });

      // 3. Online/offline listeners
      window.addEventListener('online', () => {
        if (syncApi.isAuthenticated()) {
          useSyncStore.getState().setStatus('idle');
          void this.sync();
          void processMediaUploadQueue();
        } else {
          useSyncStore.getState().setStatus('offline');
        }
      });

      window.addEventListener('offline', () => {
        useSyncStore.getState().setStatus('offline');
      });
    }

    // 4. Observe Auth State Changes for Ably Realtime
    useAuthStore.subscribe((state, prevState) => {
      // Transition: Guest -> Authenticated
      if (state.isAuthenticated && !prevState.isAuthenticated && state.user) {
        this.connectRealtime(state.user.id).catch(() => {});
        void this.sync();
      }

      // Transition: Authenticated -> Logged Out
      if (!state.isAuthenticated && prevState.isAuthenticated) {
        this.disconnectRealtime();
      }
    });

    // Initial check: if already authenticated on startup
    const authState = useAuthStore.getState();
    if (authState.isAuthenticated && authState.user) {
      this.connectRealtime(authState.user.id).catch(() => {});
    }
  }

  /**
   * Connects to Ably Realtime using server token authentication
   */
  async connectRealtime(userId: string) {
    this.disconnectRealtime();

    try {
      const auth = await syncApi.getRealtimeAuth();
      if (!auth.enabled || !auth.tokenRequest) {
        return;
      }

      let cachedToken: Ably.TokenRequest | null =
        (auth.tokenRequest as unknown as Ably.TokenRequest) || null;

      this.ablyClient = new Ably.Realtime({
        authCallback: async (_data, callback) => {
          if (cachedToken) {
            const token = cachedToken;
            cachedToken = null;
            callback(null, token);
            return;
          }
          try {
            const freshAuth = await syncApi.getRealtimeAuth();
            callback(null, freshAuth.tokenRequest as unknown as Ably.TokenRequest);
          } catch (err: unknown) {
            callback(err instanceof Error ? err.message : String(err), null);
          }
        },
      });

      this.ablyChannel = this.ablyClient.channels.get(`user:${userId}`);
      this.ablyChannel.subscribe('sync:invalidate', () => {
        void this.pull();
      });
    } catch (err: unknown) {
      console.warn('[DesktopSync:RealtimeConnectionFailed]', err);
    }
  }

  /**
   * Disconnects and cleans up Ably Realtime channel
   */
  disconnectRealtime() {
    if (this.ablyChannel) {
      try {
        this.ablyChannel.unsubscribe();
      } catch {
        // ignore
      }
      this.ablyChannel = null;
    }
    if (this.ablyClient) {
      try {
        this.ablyClient.close();
      } catch {
        // ignore
      }
      this.ablyClient = null;
    }
  }

  async updatePendingCount(): Promise<number> {
    const count = await getOutboxCount();
    useSyncStore.getState().setPendingCount(count);
    return count;
  }

  async sync(): Promise<{ success: boolean; error?: string }> {
    if (this.isSyncing) {
      this.syncQueued = true;
      return { success: true };
    }
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      useSyncStore.getState().setStatus('offline');
      return { success: false, error: 'No network connection available' };
    }

    if (!syncApi.isAuthenticated()) {
      useSyncStore.getState().setStatus('offline');
      return {
        success: false,
        error: 'Authentication required. Please sign in to sync with the server.',
      };
    }

    this.isSyncing = true;
    useSyncStore.getState().setStatus('syncing');

    try {
      await this.push();
      await this.pull();
      useSyncStore.getState().setStatus('idle');
      notifySyncComplete();
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[DesktopSync:Error]', message);
      useSyncStore.getState().setLastError(message);
      return { success: false, error: message };
    } finally {
      this.isSyncing = false;
      await this.updatePendingCount();

      if (this.syncQueued) {
        this.syncQueued = false;
        setTimeout(() => {
          void this.sync();
        }, 50);
      }
    }
  }

  async push(): Promise<void> {
    while (true) {
      const items = await getPendingOutbox(SYNC_CONSTANTS.BATCH_SIZE);
      if (items.length === 0) break;

      const batchIds = items.map((i) => i.id);
      await markOutboxInFlight(batchIds);

      const folderMutations: FolderMutationPayload[] = [];
      const noteMutations: NoteMutationPayload[] = [];
      const blockMutations: BlockMutationPayload[] = [];
      const reminderMutations: ReminderMutationPayload[] = [];

      for (const item of items) {
        try {
          const payloadData: Record<string, unknown> = JSON.parse(item.payload || '{}');
          const changes = (payloadData.changes ?? payloadData) as Record<string, any>;
          const version = payloadData.version as number | undefined;
          const updatedAt = (payloadData.updatedAt as string | undefined) || item.updatedAt;

          if (item.entity === 'notes' && typeof changes.tags === 'string') {
            try {
              changes.tags = JSON.parse(changes.tags);
            } catch {
              changes.tags = [];
            }
          }

          const mutation = {
            id: item.entityId,
            mutationId: item.mutationId,
            action: item.action,
            version,
            updatedAt,
            changes,
          };

          if (item.entity === 'folders') folderMutations.push(mutation as FolderMutationPayload);
          else if (item.entity === 'notes') noteMutations.push(mutation as NoteMutationPayload);
          else if (item.entity === 'note_blocks') blockMutations.push(mutation as BlockMutationPayload);
          else if (item.entity === 'reminders') reminderMutations.push(mutation as ReminderMutationPayload);
        } catch (err: unknown) {
          console.warn('[DesktopSync:PayloadFormatError]', err);
        }
      }

      try {
        await syncApi.push({
          clientTimestamp: new Date().toISOString(),
          folders: folderMutations,
          notes: noteMutations,
          note_blocks: blockMutations,
          reminders: reminderMutations,
        });

        await markOutboxSuccess(batchIds);
      } catch (err: any) {
        const status = err?.status ?? err?.response?.status;
        const message = err?.message || 'Sync push failed';
        await markOutboxFailed(batchIds, message, status);
        throw err;
      }
    }
  }

  async pull(): Promise<void> {
    // 1. Get lastPulledAt from sync_metadata using pure Drizzle ORM
    const [meta] = await db
      .select({ value: syncMetadata.value })
      .from(syncMetadata)
      .where(eq(syncMetadata.key, 'last_pulled_at'))
      .limit(1);

    const lastPulledAt = meta?.value ?? null;

    // 2. Fetch deltas from server
    const pullData = await syncApi.pull(lastPulledAt);

    // 3. Apply incoming folders with Last-Write-Wins (LWW) via Drizzle
    if (pullData.folders && pullData.folders.length > 0) {
      for (const folder of pullData.folders) {
        await upsertFolderFromSync(folder);
      }
    }

    // 4. Apply incoming notes with Last-Write-Wins (LWW) via Drizzle
    if (pullData.notes && pullData.notes.length > 0) {
      for (const note of pullData.notes) {
        await upsertNoteFromSync(note);
      }
    }

    // 5. Apply incoming note_blocks with Last-Write-Wins (LWW) via Drizzle
    if (pullData.note_blocks && pullData.note_blocks.length > 0) {
      for (const block of pullData.note_blocks) {
        await upsertBlockFromSync(block);
      }
    }

    // 6. Apply incoming reminders with Last-Write-Wins (LWW) via Drizzle
    if (pullData.reminders && pullData.reminders.length > 0) {
      for (const reminder of pullData.reminders) {
        await upsertReminderFromSync(reminder);
      }
    }

    // 7. Update last_pulled_at metadata using pure Drizzle ORM
    const now = new Date().toISOString();
    await db
      .insert(syncMetadata)
      .values({
        key: 'last_pulled_at',
        value: pullData.serverTimestamp,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: syncMetadata.key,
        set: {
          value: pullData.serverTimestamp,
          updatedAt: now,
        },
      });

    useSyncStore.getState().setLastSyncedAt(pullData.serverTimestamp);
    notifySyncComplete();
    void processMediaUploadQueue();
  }
}

export const syncManager = new DesktopSyncManager();
