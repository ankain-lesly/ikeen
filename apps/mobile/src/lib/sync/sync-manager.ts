import { AppState, type AppStateStatus } from 'react-native';
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import * as Ably from 'ably';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { syncMetadata } from '@/db/schema';
import { useAuthStore } from '../auth/auth-store';
import { upsertFolderFromSync, migrateGuestFolders } from '../queries/folders';
import { upsertNoteFromSync, migrateGuestNotes } from '../queries/notes';
import { clearOutboxItems, getOutboxCount, getPendingOutbox } from './outbox';
import { syncApi } from './sync-api';
import { useSyncStore } from './use-sync';

class SyncManager {
  private isSyncing = false;
  private ablyClient: Ably.Realtime | null = null;
  private ablyChannel: Ably.RealtimeChannel | null = null;
  private isInitialized = false;

  /**
   * Initializes real-time subscriptions, network listener, and app-state handlers.
   */
  init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

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
   * Pushes all pending outbox mutations to the backend.
   */
  async push(): Promise<void> {
    const { isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated) return;

    const items = await getPendingOutbox();
    if (items.length === 0) {
      await this.updatePendingCount();
      return;
    }

    const folderMutations: any[] = [];
    const noteMutations: any[] = [];
    const processedIds: string[] = [];

    for (const item of items) {
      try {
        const payload = JSON.parse(item.payload);
        if (item.entity === 'folders') {
          folderMutations.push(payload);
        } else if (item.entity === 'notes') {
          // Adapt tags: ensure payload has string[] for the API
          let tagsArray: string[] = [];
          if (Array.isArray(payload.tags)) {
            tagsArray = payload.tags;
          } else if (typeof payload.tags === 'string') {
            try {
              tagsArray = JSON.parse(payload.tags);
            } catch {
              tagsArray = [];
            }
          }
          payload.tags = tagsArray;
          noteMutations.push(payload);
        }
        processedIds.push(item.id);
      } catch (parseErr) {
        console.warn('[SyncManager] Failed to parse outbox payload:', parseErr);
        processedIds.push(item.id); // clear invalid item
      }
    }

    await syncApi.push({
      clientTimestamp: new Date().toISOString(),
      folders: folderMutations,
      notes: noteMutations,
    });

    await clearOutboxItems(processedIds);
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
    if (!isAuthenticated || this.isSyncing) return;

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
    }
  }
}

export const syncManager = new SyncManager();
