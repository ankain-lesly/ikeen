import { db } from '@/db/client';
import { syncMetadata } from '@/db/schema';
import { eq } from 'drizzle-orm';
import type {
  FolderChanges,
  NoteChanges,
  BlockChanges,
  FolderMutationPayload,
  NoteMutationPayload,
  BlockMutationPayload,
} from '@repo/types';
import { SYNC_CONSTANTS } from '@repo/utils/constants';
import {
  getPendingOutbox,
  getOutboxCount,
  markOutboxInFlight,
  markOutboxSuccess,
  markOutboxFailed,
} from './outbox';
import { upsertFolderFromSync } from '@/lib/queries/folders';
import { upsertNoteFromSync } from '@/lib/queries/notes';
import { syncApi } from './sync-api';
import { useSyncStore } from './use-sync';

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
  private isInitialized = false;

  init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // 1. Initial count
    void this.updatePendingCount();

    // 2. Window focus listener
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', () => {
        void this.sync();
      });

      // 3. Online/offline listeners
      window.addEventListener('online', () => {
        useSyncStore.getState().setStatus('idle');
        void this.sync();
      });

      window.addEventListener('offline', () => {
        useSyncStore.getState().setStatus('offline');
      });
    }
  }

  async updatePendingCount(): Promise<number> {
    const count = await getOutboxCount();
    useSyncStore.getState().setPendingCount(count);
    return count;
  }

  async sync(): Promise<void> {
    if (this.isSyncing) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      useSyncStore.getState().setStatus('offline');
      return;
    }

    if (!syncApi.isAuthenticated()) {
      // Offline / guest mode on desktop
      return;
    }

    this.isSyncing = true;
    useSyncStore.getState().setStatus('syncing');

    try {
      await this.push();
      await this.pull();
      useSyncStore.getState().setStatus('idle');
      notifySyncComplete();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[DesktopSync:Error]', message);
      useSyncStore.getState().setLastError(message);
    } finally {
      this.isSyncing = false;
      await this.updatePendingCount();
    }
  }

  async push(): Promise<void> {
    const items = await getPendingOutbox(SYNC_CONSTANTS.BATCH_SIZE);
    if (items.length === 0) return;

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
            mutationId: item.mutationId,
            action: item.action,
            version,
            updatedAt,
            changes: changes as FolderChanges,
          });
        } else if (item.entity === 'notes') {
          noteMutations.push({
            id: item.entityId,
            mutationId: item.mutationId,
            action: item.action,
            version,
            updatedAt,
            changes: changes as NoteChanges,
          });
        } else if (item.entity === 'note_blocks') {
          blockMutations.push({
            id: item.entityId,
            mutationId: item.mutationId,
            action: item.action,
            version,
            updatedAt,
            changes: changes as BlockChanges,
          });
        }
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
      });

      await markOutboxSuccess(batchIds);
    } catch (err: any) {
      const status = err?.status ?? err?.response?.status;
      const message = err?.message || 'Sync push failed';
      await markOutboxFailed(batchIds, message, status);
      throw err;
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

    // 5. Update last_pulled_at metadata using pure Drizzle ORM
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
  }
}

export const syncManager = new DesktopSyncManager();
