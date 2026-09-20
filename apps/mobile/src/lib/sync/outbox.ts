import * as Crypto from 'expo-crypto';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { syncOutbox, type SyncOutboxItem } from '@/db/schema';
import { SYNC_CONSTANTS } from '@repo/utils/constants';
import type { SyncEntityType, SyncActionType, FolderChanges, NoteChanges } from '@repo/types';
import { triggerSync } from './sync-events';

export interface OutboxPayloadData {
  changes: FolderChanges | NoteChanges;
  version?: number;
  updatedAt: string;
}

/**
 * Enqueues a local mutation into SQLite sync_outbox.
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
      let existingChanges: Record<string, any> = {};
      try {
        const parsed = JSON.parse(pendingItem.payload);
        existingChanges = parsed.changes || parsed;
      } catch {
        existingChanges = {};
      }

      const mergedChanges = { ...existingChanges, ...changes };
      const updatedPayload: OutboxPayloadData = {
        changes: mergedChanges,
        version: version ?? pendingItem.retryCount,
        updatedAt: now,
      };

      await db
        .update(syncOutbox)
        .set({
          action,
          payload: JSON.stringify(updatedPayload),
          updatedAt: now,
          retryCount: 0,
        })
        .where(eq(syncOutbox.id, pendingItem.id));
    } else {
      // No PENDING item exists (either none or existing is in_flight).
      // Create a NEW PENDING queue item with an immutable mutationId.
      const id = Crypto.randomUUID();
      const mutationId = `${entity}:${action}:${id}`;

      const payload: OutboxPayloadData = {
        changes,
        version,
        updatedAt: now,
      };

      await db.insert(syncOutbox).values({
        id,
        entity,
        entityId,
        action,
        status: 'pending',
        mutationId,
        payload: JSON.stringify(payload),
        createdAt: now,
        updatedAt: now,
        retryCount: 0,
      });
    }
    triggerSync();
  } catch (err) {
    console.error('[Outbox] Failed to enqueue mutation:', err);
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
      .where(eq(syncOutbox.status, 'pending'))
      .orderBy(syncOutbox.createdAt)
      .limit(limit);
  } catch (err) {
    console.error('[Outbox] Failed to read pending outbox:', err);
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
  } catch (err) {
    console.error('[Outbox] Failed to mark items in_flight:', err);
  }
}

/**
 * Marks completed mutations as SUCCESS by pruning them from the outbox.
 */
export async function markOutboxSuccess(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  try {
    await db.delete(syncOutbox).where(inArray(syncOutbox.id, ids));
  } catch (err) {
    console.error('[Outbox] Failed to clear successful outbox items:', err);
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
  } catch (err) {
    console.error('[Outbox] Failed to handle outbox failure state:', err);
  }
}

/**
 * Resets any stale in_flight items back to pending on startup (recovery from app crash).
 */
export async function resetInFlightOnStartup(): Promise<void> {
  try {
    await db
      .update(syncOutbox)
      .set({ status: 'pending', updatedAt: new Date().toISOString() })
      .where(eq(syncOutbox.status, 'in_flight'));
  } catch (err) {
    console.error('[Outbox] Failed to reset in_flight items on startup:', err);
  }
}

/**
 * Returns the count of pending and in_flight outbox items.
 */
export async function getOutboxCount(): Promise<number> {
  try {
    const items = await db
      .select({ id: syncOutbox.id })
      .from(syncOutbox)
      .where(inArray(syncOutbox.status, ['pending', 'in_flight']));
    return items.length;
  } catch {
    return 0;
  }
}
