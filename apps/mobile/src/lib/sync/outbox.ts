import * as Crypto from 'expo-crypto';
import { and, eq, inArray, lt, or } from 'drizzle-orm';
import { db } from '@/db/client';
import { syncOutbox, type SyncOutboxItem } from '@/db/schema';
import { SYNC_CONSTANTS } from '@repo/utils/constants';
import { log } from '@repo/utils';
import type { SyncEntityType, SyncActionType, FolderChanges, NoteChanges } from '@repo/types';
import { triggerSync } from './sync-events';
// import { triggerSync } from './sync-events';

export type OutboxPayloadData = FolderChanges | NoteChanges;

/**
 * Enqueues a local mutation into SQLite sync_outbox.
 * - Stores changes directly in sync_outbox.payload without an extra wrapper.
 * - Coalesces into an existing PENDING queue item for this record.
 * - If the existing item is IN_FLIGHT, keeps it immutable and inserts a NEW PENDING item.
 */
export async function enqueueOutbox(
  entity: SyncEntityType,
  entityId: string,
  action: SyncActionType,
  changes: FolderChanges | NoteChanges,
  version?: number
): Promise<void> {
  const now = new Date().toISOString();

  try {
    // Check if there is an existing PENDING outbox item for this entity & entityId
    const [pendingItem] = await db
      .select()
      .from(syncOutbox)
      .where(
        and(
          eq(syncOutbox.entity, entity),
          eq(syncOutbox.entityId, entityId),
          eq(syncOutbox.status, 'pending')
        )
      )
      .limit(1);

    if (pendingItem) {
      // Coalesce changes into the existing pending item
      let existingChanges: Record<string, unknown> = {};
      try {
        existingChanges = JSON.parse(pendingItem.payload);
      } catch {
        existingChanges = {};
      }

      const mergedChanges = {
        ...existingChanges,
        ...changes,
        ...(version !== undefined && { version }),
      };

      await db
        .update(syncOutbox)
        .set({
          action,
          payload: JSON.stringify(mergedChanges),
          updatedAt: now,
          retryCount: 0,
        })
        .where(eq(syncOutbox.id, pendingItem.id));

      log('[Sync:Outbox:Coalesced]', {
        entity,
        entityId,
        action,
        version: (mergedChanges as { version?: number }).version,
      });
    } else {
      // No PENDING item exists (either none or existing is in_flight).
      // Create a NEW PENDING queue item with an immutable mutationId.
      const id = Crypto.randomUUID();
      const mutationId = `${entity}:${action}:${id}`;

      const payloadChanges = {
        ...changes,
        ...(version !== undefined && { version }),
      };

      await db.insert(syncOutbox).values({
        id,
        entity,
        entityId,
        action,
        status: 'pending',
        mutationId,
        payload: JSON.stringify(payloadChanges),
        createdAt: now,
        updatedAt: now,
        retryCount: 0,
      });

      log('[Sync:Outbox:Enqueued]', {
        mutationId,
        entity,
        entityId,
        action,
        version,
      });
    }

    // Sync triggers are orchestrated exclusively by the SyncManager (network transitions,
    // app foregrounding, auth changes, and Ably real-time invalidations) rather than firing on every granular enqueue.
    triggerSync();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    log('[Sync:Outbox:Error]', { action: 'enqueueOutbox', error: message });
    console.log('[🚨] [Outbox] Failed to enqueue mutation:', message);
  }
}

/**
 * Fetches pending mutations from SQLite outbox up to BATCH_SIZE.
 */
export async function getPendingOutbox(
  limit: number = SYNC_CONSTANTS.BATCH_SIZE
): Promise<SyncOutboxItem[]> {
  try {
    return await db
      .select()
      .from(syncOutbox)
      .where(
        or(
          eq(syncOutbox.status, 'pending'),
          and(
            eq(syncOutbox.status, 'failed')
            // lt(syncOutbox.retryCount, SYNC_CONSTANTS.MAX_RETRIES)
          )
        )
      )
      .orderBy(syncOutbox.createdAt)
      .limit(limit);
  } catch (err) {
    console.log('[🚨] [Outbox] Failed to read pending outbox:', err);
    return [];
  }
}

/**
 * Marks outbox items as in_flight during an active push cycle.
 * Once in_flight, the items are immutable; new local edits will create a separate PENDING item.
 */
export async function markOutboxInFlight(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const now = new Date().toISOString();
  try {
    await db
      .update(syncOutbox)
      .set({ status: 'in_flight', updatedAt: now })
      .where(inArray(syncOutbox.id, ids));
    log('[Sync:Outbox:InFlight]', { count: ids.length, ids });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    log('[Sync:Outbox:Error]', { action: 'markOutboxInFlight', error: message });
    console.log('[🚨] [Outbox] Failed to mark items in_flight:', message);
  }
}

/**
 * Marks completed mutations as SUCCESS by pruning them from the outbox.
 */
export async function markOutboxSuccess(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  try {
    await db.delete(syncOutbox).where(inArray(syncOutbox.id, ids));
    log('[Sync:Outbox:Success]', { count: ids.length, prunedIds: ids });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    log('[Sync:Outbox:Error]', { action: 'markOutboxSuccess', error: message });
    console.log('[🚨] [Outbox] Failed to clear successful outbox items:', message);
  }
}

/**
 * Handles mutation failure:
 * - If terminal error (e.g. 4xx) or retryCount reaches MAX_RETRIES: marks FAILED.
 * - Otherwise: resets status to PENDING for retry and increments retryCount.
 */
export async function markOutboxFailed(
  ids: string[],
  isTerminal: boolean,
  errorMessage: string
): Promise<void> {
  if (ids.length === 0) return;
  const now = new Date().toISOString();

  try {
    const items = await db
      .select()
      .from(syncOutbox)
      .where(inArray(syncOutbox.id, ids));

    for (const item of items) {
      const nextRetries = item.retryCount + 1;
      const shouldFail = isTerminal || nextRetries >= SYNC_CONSTANTS.MAX_RETRIES;

      await db
        .update(syncOutbox)
        .set({
          status: shouldFail ? 'failed' : 'pending',
          retryCount: nextRetries,
          lastError: errorMessage,
          updatedAt: now,
        })
        .where(eq(syncOutbox.id, item.id));
    }
    log('[Sync:Outbox:Failed]', {
      count: ids.length,
      isTerminal,
      error: errorMessage,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    log('[Sync:Outbox:Error]', { action: 'markOutboxFailed', error: message });
    console.log('[🚨] [Outbox] Failed to handle outbox failure state:', message);
  }
}

/**
 * Resets stale in_flight items and recoverable failed items back to pending on startup.
 */
export async function resetInFlightOnStartup(): Promise<void> {
  const now = new Date().toISOString();
  try {
    // 1. Reset stale in-flight items from app crashes/abrupt closes
    await db
      .update(syncOutbox)
      .set({ status: 'pending', updatedAt: now })
      .where(eq(syncOutbox.status, 'in_flight'));

    // 2. Automatically recover any failed items that still have valid retries remaining
    await db
      .update(syncOutbox)
      .set({ status: 'pending', updatedAt: now })
      .where(
        and(
          eq(syncOutbox.status, 'failed'),
          lt(syncOutbox.retryCount, SYNC_CONSTANTS.MAX_RETRIES)
        )
      );

    log('[Sync:Outbox:StartupRecovery]', 'Reset in-flight and recoverable failed items to pending on startup.');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    log('[Sync:Outbox:Error]', { action: 'resetInFlightOnStartup', error: message });
    console.log('[🚨] [Outbox] Failed to reset in_flight/failed items on startup:', message);
  }
}

/**
 * Returns the count of pending, in_flight, and recoverable failed outbox items.
 */
export async function getOutboxCount(): Promise<number> {
  try {
    const items = await db
      .select({ id: syncOutbox.id })
      .from(syncOutbox)
      .where(
        or(
          inArray(syncOutbox.status, ['pending', 'in_flight']),
          and(
            eq(syncOutbox.status, 'failed'),
            lt(syncOutbox.retryCount, SYNC_CONSTANTS.MAX_RETRIES)
          )
        )
      );
    return items.length;
  } catch {
    return 0;
  }
}
