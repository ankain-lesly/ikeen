import { db } from '@/db/client';
import { syncOutbox } from '@/db/schema';
import { eq, and, inArray, lt, desc, asc, count, sql } from 'drizzle-orm';
import type {
  SyncEntityType,
  SyncActionType,
  FolderChanges,
  NoteChanges,
  BlockChanges,
} from '@repo/types';

export type OutboxPayloadData = FolderChanges | NoteChanges | BlockChanges;

export type SyncFailureCategory =
  | 'transient_no_penalty'
  | 'server_error'
  | 'client_rejected';

export function classifySyncPushFailure(status?: number): SyncFailureCategory {
  if (
    status === undefined ||
    status === 0 ||
    status === 401 ||
    status === 403 ||
    status === 408 ||
    status === 429
  ) {
    return 'transient_no_penalty';
  }
  if (status >= 500 && status < 600) {
    return 'server_error';
  }
  return 'client_rejected';
}

export interface RawOutboxItem {
  id: string;
  entity: SyncEntityType;
  entity_id: string;
  action: SyncActionType;
  status: 'pending' | 'in_flight' | 'success' | 'failed';
  mutation_id: string;
  payload: string;
  created_at: string;
  updated_at: string;
  retry_count: number;
  last_error: string | null;
}

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

export async function getPendingOutbox(limit = 50): Promise<RawOutboxItem[]> {
  try {
    const rows = await db
      .select()
      .from(syncOutbox)
      .where(and(eq(syncOutbox.status, 'pending'), lt(syncOutbox.retryCount, 5)))
      .orderBy(asc(syncOutbox.createdAt))
      .limit(limit);

    return rows.map((r) => ({
      id: r.id,
      entity: r.entity,
      entity_id: r.entityId,
      action: r.action,
      status: r.status,
      mutation_id: r.mutationId,
      payload: r.payload,
      created_at: r.createdAt,
      updated_at: r.updatedAt,
      retry_count: r.retryCount,
      last_error: r.lastError,
    }));
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
          status: sql`CASE WHEN ${syncOutbox.retryCount} + 1 >= 5 THEN 'failed' ELSE 'pending' END`,
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
