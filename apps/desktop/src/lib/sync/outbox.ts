import { db } from '@/db/client';
import { syncOutbox, type SyncOutboxItem } from '@/db/schema';
import { eq, and, inArray, lt, desc, asc, count, sql } from 'drizzle-orm';
import type {
  SyncEntityType,
  SyncActionType,
  OutboxPayloadData,
  SyncFailureCategory,
} from '@repo/types';
import { classifySyncPushFailure } from '@repo/utils';
import { SYNC_CONSTANTS } from '@repo/utils/constants';

export type { OutboxPayloadData, SyncFailureCategory };
export { classifySyncPushFailure };

export async function enqueueOutbox(
  entity: SyncEntityType,
  entityId: string,
  action: SyncActionType,
  changes: OutboxPayloadData,
  version?: number
): Promise<void> {
  const now = new Date().toISOString();

  try {
    // Check if there is already a pending or failed item for this entity & entityId
    const existing = await db
      .select()
      .from(syncOutbox)
      .where(
        and(
          eq(syncOutbox.entity, entity),
          eq(syncOutbox.entityId, entityId),
          inArray(syncOutbox.status, ['pending', 'failed'])
        )
      )
      .orderBy(desc(syncOutbox.createdAt))
      .limit(1);

    const pendingItem = existing[0];

    if (pendingItem) {
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
          payload: JSON.stringify(mergedChanges),
          status: 'pending',
          action,
          updatedAt: now,
        })
        .where(eq(syncOutbox.id, pendingItem.id));
    } else {
      const id = `outbox-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const mutationId = `desk-${entity}:${action}:${id}`;
      const payload = JSON.stringify({
        ...changes,
        ...(version !== undefined && { version }),
      });

      await db.insert(syncOutbox).values({
        id,
        entity,
        entityId,
        action,
        status: 'pending',
        mutationId,
        payload,
        createdAt: now,
        updatedAt: now,
        retryCount: 0,
      });
    }
  } catch (err: unknown) {
    console.error('[Outbox:EnqueueError]', err);
  }
}

export async function getPendingOutbox(
  limit = SYNC_CONSTANTS.BATCH_SIZE
): Promise<SyncOutboxItem[]> {
  try {
    return await db
      .select()
      .from(syncOutbox)
      .where(
        and(
          eq(syncOutbox.status, 'pending'),
          lt(syncOutbox.retryCount, SYNC_CONSTANTS.MAX_RETRIES)
        )
      )
      .orderBy(asc(syncOutbox.createdAt))
      .limit(limit);
  } catch (err: unknown) {
    console.error('[Outbox:getPendingOutbox:Error]', err);
    return [];
  }
}

export async function markOutboxInFlight(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const now = new Date().toISOString();

  try {
    await db
      .update(syncOutbox)
      .set({ status: 'in_flight', updatedAt: now })
      .where(inArray(syncOutbox.id, ids));
  } catch (err: unknown) {
    console.error('[Outbox:markOutboxInFlight:Error]', err);
  }
}

export async function markOutboxSuccess(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const now = new Date().toISOString();

  try {
    await db
      .update(syncOutbox)
      .set({ status: 'success', updatedAt: now })
      .where(inArray(syncOutbox.id, ids));
  } catch (err: unknown) {
    console.error('[Outbox:markOutboxSuccess:Error]', err);
  }
}

export async function markOutboxFailed(
  ids: string[],
  errorMessage: string,
  status?: number
): Promise<void> {
  if (ids.length === 0) return;
  const category = classifySyncPushFailure(status);
  const now = new Date().toISOString();

  try {
    if (category === 'transient_no_penalty') {
      await db
        .update(syncOutbox)
        .set({ status: 'pending', lastError: errorMessage, updatedAt: now })
        .where(inArray(syncOutbox.id, ids));
    } else {
      await db
        .update(syncOutbox)
        .set({
          retryCount: sql`${syncOutbox.retryCount} + 1`,
          status: sql`CASE WHEN ${syncOutbox.retryCount} + 1 >= ${SYNC_CONSTANTS.MAX_RETRIES} THEN 'failed' ELSE 'pending' END`,
          lastError: errorMessage,
          updatedAt: now,
        })
        .where(inArray(syncOutbox.id, ids));
    }
  } catch (err: unknown) {
    console.error('[Outbox:markOutboxFailed:Error]', err);
  }
}

export async function getOutboxCount(): Promise<number> {
  try {
    const res = await db
      .select({ val: count() })
      .from(syncOutbox)
      .where(eq(syncOutbox.status, 'pending'));

    return res[0]?.val ?? 0;
  } catch (err: unknown) {
    console.error('[Outbox:getOutboxCount:Error]', err);
    return 0;
  }
}
