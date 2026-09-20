import { AppState, type AppStateStatus } from 'react-native';
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import * as Ably from 'ably';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { syncMetadata } from '@/db/schema';
import { SYNC_CONSTANTS } from '@repo/utils/constants';
import type {
  SyncEntityType,
  SyncActionType,
  FolderMutationPayload,
  NoteMutationPayload,
  FolderChanges,
  NoteChanges,
} from '@repo/types';
import { useAuthStore } from '../auth/auth-store';
import { upsertFolderFromSync, migrateGuestFolders } from '../queries/folders';
import { upsertNoteFromSync, migrateGuestNotes } from '../queries/notes';
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
    NetInfo.addEventListener((state: NetInfoState) => {
      if (state.isConnected && state.isInternetReachable) {
        useSyncStore.getState().setStatus('idle');
        this.sync().catch(() => {});
      } else {
        useSyncStore.getState().setStatus('offline');
      }
    });

    // 2. Listen for app foregrounding
    AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        this.sync().catch(() => {});
      }
    });

    // 3. Listen for auth state changes
    useAuthStore.subscribe((state, prevState) => {
      // Transition from Guest -> Authenticated
      if (state.isAuthenticated && !prevState.isAuthenticated && state.user) {
        this.migrateGuestNotes(state.user.id)
          .then(() => this.connectRealtime(state.user!.id))
          .then(() => this.sync())
          .catch((err) => console.error('[SyncManager] Auth transition error:', err));
      }

      // Transition from Authenticated -> Logged Out
      if (!state.isAuthenticated && prevState.isAuthenticated) {
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
      const auth = await syncApi.getRealtimeAuth();
      if (!auth.enabled || !auth.tokenRequest) {
        return;
      }

      this.ablyClient = new Ably.Realtime({
        authCallback: async (_data, callback) => {
          try {
            const freshAuth = await syncApi.getRealtimeAuth();
            callback(null, freshAuth.tokenRequest);
          } catch (err: any) {
            callback(err, null);
          }
        },
      });

      this.ablyChannel = this.ablyClient.channels.get(`user:${userId}`);
      this.ablyChannel.subscribe('sync:invalidate', () => {
        this.pull().catch(() => {});
      });
    } catch {
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
      await migrateGuestFolders(targetUserId);
      await migrateGuestNotes(targetUserId);
      await this.updatePendingCount();
    } catch (err) {
      console.error('[SyncManager] Failed to migrate guest notes:', err);
    }
  }

  /**
   * Pushes all pending outbox mutations to the backend in batches of SYNC_CONSTANTS.BATCH_SIZE.
   */
  async push(): Promise<void> {
    const { isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated) return;

    while (true) {
      const items = await getPendingOutbox(SYNC_CONSTANTS.BATCH_SIZE);
      if (items.length === 0) {
        break;
      }

      const batchIds = items.map((i) => i.id);
      await markOutboxInFlight(batchIds);

      const folderMutations: FolderMutationPayload[] = [];
      const noteMutations: NoteMutationPayload[] = [];

      for (const item of items) {
        try {
          let payloadData: any = {};
          try {
            payloadData = JSON.parse(item.payload);
          } catch {
            payloadData = {};
          }

          const changes = payloadData.changes ?? payloadData;
          const version = payloadData.version;
          const updatedAt = payloadData.updatedAt || item.updatedAt;

          if (item.entity === 'folders') {
            folderMutations.push({
              id: item.entityId,
              mutationId: item.mutationId || `${item.entity}:${item.action}:${item.id}`,
              action: item.action as SyncActionType,
              version,
              updatedAt,
              changes: changes as FolderChanges,
            });
          } else if (item.entity === 'notes') {
            // Adapt tags if present in changes
            if (changes.tags) {
              if (typeof changes.tags === 'string') {
                try {
                  changes.tags = JSON.parse(changes.tags);
                } catch {
                  changes.tags = [];
                }
              }
            }
            noteMutations.push({
              id: item.entityId,
              mutationId: item.mutationId || `${item.entity}:${item.action}:${item.id}`,
              action: item.action,
              version,
              updatedAt,
              changes: changes,
            });
          }
        } catch (parseErr) {
          console.warn('[SyncManager] Failed to format outbox payload:', parseErr);
        }
      }

      try {
        await syncApi.push({
          clientTimestamp: new Date().toISOString(),
          folders: folderMutations,
          notes: noteMutations,
        });

        await markOutboxSuccess(batchIds);
      } catch (err: any) {
        const status = err?.status || err?.response?.status;
        const isTerminal = typeof status === 'number' && status >= 400 && status < 500;
        await markOutboxFailed(batchIds, isTerminal, err?.message || 'Push failed');
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
    const response = await syncApi.pull(since);

    // Apply Folders via unified queries module
    for (const f of response.folders) {
      await upsertFolderFromSync({ ...f, userId: user?.id });
    }

    // Apply Notes via unified queries module (adapts native string[] tags to SQLite JSON)
    for (const n of response.notes) {
      await upsertNoteFromSync({ ...n, userId: user?.id });
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

    try {
      await this.push();
      await this.pull();
      useSyncStore.getState().setStatus('idle');
    } catch (err: any) {
      console.error('[SyncManager] Sync failed:', err);
      useSyncStore.getState().setError(err?.message || 'Sync failed');
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
