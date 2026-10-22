import { AppState, type AppStateStatus } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import * as Ably from 'ably';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { syncMetadata } from '@/db/schema';
import { SYNC_CONSTANTS } from '@repo/utils/constants';
import { log } from '@repo/utils';
import type {
  FolderMutationPayload,
  NoteMutationPayload,
  BlockMutationPayload,
  FolderChanges,
  NoteChanges,
  BlockChanges,
} from '@repo/types';
import { useAuthStore } from '../auth/auth-store';
import { upsertFolderFromSync, migrateGuestFolders } from '../queries/folders';
import { upsertNoteFromSync, migrateGuestNotes } from '../queries/notes';
import { upsertBlockFromSync } from '../queries/note-blocks';
import {
  getOutboxCount,
  getPendingOutbox,
  markOutboxInFlight,
  markOutboxSuccess,
  markOutboxFailed,
  resetInFlightOnStartup,
} from './outbox';
import { registerSyncTrigger } from './sync-events';
import { syncApi } from './sync-api';
import { useSyncStore } from './use-sync';

class SyncManager {
  private isSyncing = false;
  private syncQueued = false;
  private ablyClient: Ably.Realtime | null = null;
  private ablyChannel: Ably.RealtimeChannel | null = null;
  private isInitialized = false;

  /**
   * Initializes real-time subscriptions, network listener, and app-state handlers.
   */
  init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Register trigger for reactive outbox enqueueing (eliminates query circular dependency)
    registerSyncTrigger(() => {
      this.sync().catch(() => {});
    });

    // Reset any stranded in_flight mutations from previous app session crash
    resetInFlightOnStartup()
      .then(() => this.updatePendingCount())
      .catch(() => {});

    // 1. Listen for network changes
    NetInfo.addEventListener((state) => {
      log('[Sync:Network]', {
        isConnected: state.isConnected,
        isInternetReachable: state.isInternetReachable,
      });
      if (state.isConnected && state.isInternetReachable) {
        useSyncStore.getState().setStatus('idle');
        // toast.success('Syncing...');
        this.sync().catch(() => {});
      } else {
        // toast.error('Offline');
        useSyncStore.getState().setStatus('offline');
      }
    });

    // 2. Listen for app foregrounding
    AppState.addEventListener('change', (state: AppStateStatus) => {
      log('[Sync:AppState]', { appState: state });
      if (state === 'active') {
        this.sync().catch(() => {});
      }
    });

    // 3. Listen for auth state changes
    useAuthStore.subscribe((state, prevState) => {
      // Transition from Guest -> Authenticated
      if (state.isAuthenticated && !prevState.isAuthenticated && state.user) {
        log('[Sync:Auth:Change]', {
          transition: 'guest_to_authenticated',
          userId: state.user.id,
        });
        this.migrateGuestNotes(state.user.id)
          .then(() => this.connectRealtime(state.user!.id))
          .then(() => this.sync())
          .catch((err: unknown) => {
            const message = err instanceof Error ? err.message : String(err);
            log('[Sync:Auth:Error]', { error: message });
            console.log('[🚨] [SyncManager] Auth transition error:', message);
          });
      }

      // Transition from Authenticated -> Logged Out
      if (!state.isAuthenticated && prevState.isAuthenticated) {
        log('[Sync:Auth:Change]', { transition: 'logged_out' });
        this.disconnectRealtime();
      }
    });

    // Initial check: if already authenticated on startup
    const authState = useAuthStore.getState();
    if (authState.isAuthenticated && authState.user) {
      this.connectRealtime(authState.user.id).catch(() => {});
      this.sync().catch(() => {});
    } else {
      this.updatePendingCount();
    }
  }

  /**
   * Connects to Ably Realtime to receive sync:invalidate events.
   */
  private async connectRealtime(userId: string) {
    this.disconnectRealtime();

    try {
      log('[Sync:Realtime:Connecting]', { userId });
      const auth = await syncApi.getRealtimeAuth();
      if (!auth.enabled || !auth.tokenRequest) {
        return;
      }

      this.ablyClient = new Ably.Realtime({
        authCallback: async (_data, callback) => {
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
        log('[Sync:Realtime:InvalidateReceived]', { userId });
        this.pull().catch(() => {});
      });
      log('[Sync:Realtime:Connected]', { userId });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      log('[Sync:Realtime:Error]', { error: message });
      // Ably connection error is non-fatal; sync will continue over polling
    }
  }

  /**
   * Disconnects Ably Realtime.
   */
  private disconnectRealtime() {
    if (this.ablyChannel) {
      try {
        this.ablyChannel.unsubscribe();
      } catch {}
      this.ablyChannel = null;
    }
    if (this.ablyClient) {
      try {
        this.ablyClient.close();
      } catch {}
      this.ablyClient = null;
    }
    log('[Sync:Realtime:Disconnected]');
  }

  /**
   * Updates the reactive pending mutations count for UI display.
   */
  async updatePendingCount() {
    const count = await getOutboxCount();
    useSyncStore.getState().setPendingCount(count);
  }

  /**
   * Migrates local notes and folders created in Guest Mode (strictly where userId IS NULL) to the cloud.
   */
  async migrateGuestNotes(userId?: string) {
    const targetUserId = userId ?? useAuthStore.getState().user?.id;
    if (!targetUserId) return;

    try {
      log('[Sync:GuestMigration:Start]', { targetUserId });
      await migrateGuestFolders(targetUserId);
      await migrateGuestNotes(targetUserId);
      await this.updatePendingCount();
      log('[Sync:GuestMigration:Success]', { targetUserId });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      log('[Sync:GuestMigration:Error]', { error: message });
      console.log('[🚨] [SyncManager] Failed to migrate guest notes:', message);
    }
  }

  /**
   * Pushes all pending outbox mutations to the backend in batches of SYNC_CONSTANTS.BATCH_SIZE.
   */
  async push(): Promise<void> {
    const { isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated) return;

    let batchIndex = 0;

    while (true) {
      const items = await getPendingOutbox(SYNC_CONSTANTS.BATCH_SIZE);
      if (items.length === 0) {
        break;
      }

      const batchIds = items.map((i) => i.id);
      await markOutboxInFlight(batchIds);

      const folderMutations: FolderMutationPayload[] = [];
      const noteMutations: NoteMutationPayload[] = [];
      const blockMutations: BlockMutationPayload[] = [];

      for (const item of items) {
        try {
          let payloadData: Record<string, unknown> = {};
          try {
            payloadData = JSON.parse(item.payload);
          } catch {
            payloadData = {};
          }

          const changes = (payloadData.changes ?? payloadData) as
            | FolderChanges
            | NoteChanges
            | BlockChanges;
          const version = payloadData.version as number | undefined;
          const updatedAt = (payloadData.updatedAt as string | undefined) || item.updatedAt;

          if (item.entity === 'folders') {
            folderMutations.push({
              id: item.entityId,
              mutationId: item.mutationId || `${item.entity}:${item.action}:${item.id}`,
              action: item.action,
              version,
              updatedAt,
              changes: changes as FolderChanges,
            });
          } else if (item.entity === 'notes') {
            const noteChanges = changes as NoteChanges;
            // Adapt tags if present in changes
            if (noteChanges.tags) {
              if (typeof noteChanges.tags === 'string') {
                try {
                  noteChanges.tags = JSON.parse(noteChanges.tags);
                } catch {
                  noteChanges.tags = [];
                }
              }
            }
            noteMutations.push({
              id: item.entityId,
              mutationId: item.mutationId || `${item.entity}:${item.action}:${item.id}`,
              action: item.action,
              version,
              updatedAt,
              changes: noteChanges,
            });
          } else if (item.entity === 'note_blocks') {
            blockMutations.push({
              id: item.entityId,
              mutationId: item.mutationId || `${item.entity}:${item.action}:${item.id}`,
              action: item.action,
              version,
              updatedAt,
              changes: changes as BlockChanges,
            });
          }
        } catch (parseErr: unknown) {
          const message = parseErr instanceof Error ? parseErr.message : String(parseErr);
          log('[Sync:Push:ParseError]', { error: message });
          console.warn('[SyncManager] Failed to format outbox payload:', message);
        }
      }

      batchIndex++;

      log('[Sync:Push:Dispatch]', {
        syncBatchCount: batchIndex,
        itemsCount: items.length,
        foldersCount: folderMutations.length,
        notesCount: noteMutations.length,
        blocksCount: blockMutations.length,
      });

      try {
        await syncApi.push({
          clientTimestamp: new Date().toISOString(),
          folders: folderMutations,
          notes: noteMutations,
          note_blocks: blockMutations,
        });

        await markOutboxSuccess(batchIds);
        log('[Sync:Push:Success]', { itemsCount: items.length });
      } catch (err: unknown) {
        const errorObj = err as {
          status?: number;
          response?: { status?: number };
          message?: string;
        };
        const status = errorObj?.status ?? errorObj?.response?.status;
        const errorMessage = errorObj?.message || 'Push failed';

        log('[Sync:Push:Error]', {
          batchCount: batchIds.length,
          status,
          error: errorMessage,
        });

        await markOutboxFailed(batchIds, status, errorMessage);
        throw err;
      }
    }

    await this.updatePendingCount();
  }

  /**
   * Pulls all updated deltas from the backend since last_pulled_at.
   */
  async pull(): Promise<void> {
    const { isAuthenticated, user } = useAuthStore.getState();
    if (!isAuthenticated) return;

    // Read last pulled timestamp
    const [meta] = await db
      .select()
      .from(syncMetadata)
      .where(eq(syncMetadata.key, 'last_pulled_at'))
      .limit(1);

    const since = meta?.value ?? null;
    log('[Sync:Pull:Request]', { since: since ?? 'epoch' });

    try {
      const response = await syncApi.pull(since);

      // Apply Folders via unified queries module
      for (const f of response.folders) {
        await upsertFolderFromSync({ ...f, userId: user?.id });
      }

      // Apply Notes via unified queries module (adapts native string[] tags to SQLite JSON)
      for (const n of response.notes) {
        await upsertNoteFromSync({ ...n, userId: user?.id });
      }

      // Apply Note Blocks (LWW — skips if local is newer)
      if (response.note_blocks?.length) {
        for (const b of response.note_blocks) {
          await upsertBlockFromSync(b);
        }
      }

      // Save new checkpoint
      await db
        .insert(syncMetadata)
        .values({
          key: 'last_pulled_at',
          value: response.serverTimestamp,
          updatedAt: new Date().toISOString(),
        })
        .onConflictDoUpdate({
          target: syncMetadata.key,
          set: {
            value: response.serverTimestamp,
            updatedAt: new Date().toISOString(),
          },
        });

      useSyncStore.getState().setLastSyncedAt(response.serverTimestamp);
      log('[Sync:Pull:Success]', {
        foldersCount: response.folders.length,
        notesCount: response.notes.length,
        blocksCount: response.note_blocks?.length ?? 0,
        serverTimestamp: response.serverTimestamp,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      log('[Sync:Pull:Error]', { error: message });
      throw err;
    }
  }

  /**
   * Runs an end-to-end sync cycle (push pending mutations, then pull cloud deltas).
   */
  async sync(): Promise<void> {
    const { isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated) return;

    if (this.isSyncing) {
      this.syncQueued = true;
      return;
    }

    this.isSyncing = true;
    useSyncStore.getState().setStatus('syncing');
    log('[Sync:Cycle:Start]');

    try {
      await this.push();
      await this.pull();
      // TODO: FEAT:  Add Media Sync Later
      useSyncStore.getState().setStatus('idle');
      log('[Sync:Cycle:Success]');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      log('[Sync:Cycle:Error]', { error: message });
      console.log('[🚨] [SyncManager] Sync failed:', message);
      useSyncStore.getState().setError(message || 'Sync failed');
    } finally {
      this.isSyncing = false;
      await this.updatePendingCount();

      if (this.syncQueued) {
        this.syncQueued = false;
        setTimeout(() => {
          this.sync().catch(() => {});
        }, 50);
      }
    }
  }
}

export const syncManager = new SyncManager();
