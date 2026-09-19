import * as Crypto from 'expo-crypto';
import { eq, inArray } from 'drizzle-orm';
import { db } from '@/db/client';
import { syncOutbox, type SyncOutboxItem } from '@/db/schema';

/**
 * Enqueues a local mutation into SQLite sync_outbox.
 * If an item for this entityId is already queued, updates it to coalesce pending changes.
 */
export async function enqueueOutbox(
  entity: 'folders' | 'notes',
  entityId: string,
  action: 'upsert' | 'delete',
  payloadData: any
): Promise<void> {
  const now = new Date().toISOString();
  const payloadStr = JSON.stringify(payloadData);

  try {
    // Check if there is an existing pending outbox entry for this entityId
    const existing = await db
      .select()
      .from(syncOutbox)
      .where(eq(syncOutbox.entityId, entityId))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(syncOutbox)
        .set({
          action,
          payload: payloadStr,
          createdAt: now,
          retryCount: 0,
        })
        .where(eq(syncOutbox.id, existing[0].id));
    } else {
      await db.insert(syncOutbox).values({
        id: Crypto.randomUUID(),
        entity,
        entityId,
        action,
        payload: payloadStr,
        createdAt: now,
        retryCount: 0,
      });
    }
  } catch (err) {
    console.error('[Outbox] Failed to enqueue mutation:', err);
  }
}

/**
 * Fetches all pending mutations from SQLite outbox.
 */
export async function getPendingOutbox(): Promise<SyncOutboxItem[]> {
  try {
    return await db
      .select()
      .from(syncOutbox)
      .orderBy(syncOutbox.createdAt);
  } catch (err) {
    console.error('[Outbox] Failed to read pending outbox:', err);
    return [];
  }
}

/**
 * Removes completed mutations from the outbox.
 */
export async function clearOutboxItems(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  try {
    await db.delete(syncOutbox).where(inArray(syncOutbox.id, ids));
  } catch (err) {
    console.error('[Outbox] Failed to clear outbox items:', err);
  }
}

/**
 * Returns the count of pending outbox items.
 */
export async function getOutboxCount(): Promise<number> {
  try {
    const items = await db.select({ id: syncOutbox.id }).from(syncOutbox);
    return items.length;
  } catch {
    return 0;
  }
}
