import * as Crypto from 'expo-crypto';
import { and, asc, desc, eq, isNull, like, sql, type SQL } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

import { db } from '@/db/client';
import { folders, notes } from '@/db/schema';
import type {
  CreateFolderInput,
  Folder,
  FolderWithCount,
  ListFoldersOptions,
  UpdateFolderInput,
} from '@/lib/types/folders';
import { enqueueOutbox } from '@/lib/sync/outbox';
import { syncManager } from '@/lib/sync/sync-manager';

// ============================================================================
// Internal Query Builder for Folders
// ============================================================================

function buildFoldersQuery(options: ListFoldersOptions = {}) {
  const conditions: SQL[] = [];

  if (!options.includeDeleted) {
    conditions.push(isNull(folders.deletedAt));
  }

  if (options.search) {
    const term = `%${options.search}%`;
    conditions.push(like(folders.name, term));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const orderClauses = [];
  const direction = options.orderDirection === 'asc' ? asc : desc;

  if (options.orderBy === 'name') {
    orderClauses.push(direction(folders.name));
  } else if (options.orderBy === 'createdAt') {
    orderClauses.push(direction(folders.createdAt));
  } else {
    orderClauses.push(direction(folders.updatedAt));
  }
  orderClauses.push(asc(folders.sortOrder));

  return db
    .select({
      id: folders.id,
      name: folders.name,
      color: folders.color,
      icon: folders.icon,
      isLocked: folders.isLocked,
      pinCode: folders.pinCode,
      sortOrder: folders.sortOrder,
      createdAt: folders.createdAt,
      updatedAt: folders.updatedAt,
      deletedAt: folders.deletedAt,
      noteCount: sql<number>`count(${notes.id})`.mapWith(Number),
    })
    .from(folders)
    .leftJoin(
      notes,
      and(
        eq(notes.folderId, folders.id),
        isNull(notes.deletedAt),
        eq(notes.isArchived, false)
      )
    )
    .where(whereClause)
    .groupBy(folders.id)
    .orderBy(...orderClauses);
}

// ============================================================================
// Reactive Hooks
// ============================================================================

/**
 * Reactive hook: Automatically updates when folders or their notes change.
 */
export function useLiveFolders(options: ListFoldersOptions = {}) {
  const query = buildFoldersQuery(options);
  const result = useLiveQuery(query, [
    options.search,
    options.orderBy,
    options.orderDirection,
    options.includeDeleted,
  ]);

  return {
    ...result,
    data: (result.data ?? []) as FolderWithCount[],
  };
}

/**
 * Reactive hook for a single folder with its active note count.
 */
export function useLiveFolder(id: string) {
  const query = db
    .select({
      id: folders.id,
      name: folders.name,
      color: folders.color,
      icon: folders.icon,
      isLocked: folders.isLocked,
      pinCode: folders.pinCode,
      sortOrder: folders.sortOrder,
      createdAt: folders.createdAt,
      updatedAt: folders.updatedAt,
      deletedAt: folders.deletedAt,
      noteCount: sql<number>`count(${notes.id})`.mapWith(Number),
    })
    .from(folders)
    .leftJoin(
      notes,
      and(
        eq(notes.folderId, folders.id),
        isNull(notes.deletedAt),
        eq(notes.isArchived, false)
      )
    )
    .where(and(eq(folders.id, id), isNull(folders.deletedAt)))
    .groupBy(folders.id)
    .limit(1);

  const res = useLiveQuery(query, [id]);

  return {
    ...res,
    data: (res.data?.[0] ?? null) as FolderWithCount | null,
  };
}

// ============================================================================
// Imperative Read Queries
// ============================================================================

/**
 * Fetches a single folder by ID.
 */
export async function getFolderById(id: string): Promise<FolderWithCount | null> {
  const [folder] = await db
    .select({
      id: folders.id,
      name: folders.name,
      color: folders.color,
      icon: folders.icon,
      isLocked: folders.isLocked,
      pinCode: folders.pinCode,
      sortOrder: folders.sortOrder,
      createdAt: folders.createdAt,
      updatedAt: folders.updatedAt,
      deletedAt: folders.deletedAt,
      noteCount: sql<number>`count(${notes.id})`.mapWith(Number),
    })
    .from(folders)
    .leftJoin(
      notes,
      and(
        eq(notes.folderId, folders.id),
        isNull(notes.deletedAt),
        eq(notes.isArchived, false)
      )
    )
    .where(and(eq(folders.id, id), isNull(folders.deletedAt)))
    .groupBy(folders.id);

  return (folder ?? null) as FolderWithCount | null;
}

// ============================================================================
// Imperative Write Mutations
// ============================================================================

/**
 * Creates a new folder in SQLite.
 */
export async function createFolder(input: CreateFolderInput): Promise<Folder> {
  const id = input.id ?? Crypto.randomUUID();
  const now = new Date().toISOString();

  const [created] = await db
    .insert(folders)
    .values({
      id,
      name: input.name.trim(),
      color: input.color ?? '#3b82f6',
      icon: input.icon ?? (input.isLocked ? 'lock' : 'folder'),
      isLocked: input.isLocked ?? false,
      pinCode: input.pinCode ?? null,
      sortOrder: 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    })
    .returning();

  await enqueueOutbox('folders', created.id, 'upsert', created);
  syncManager.sync().catch(() => {});

  return created;
}

/**
 * Updates an existing folder.
 */
export async function updateFolder(
  id: string,
  input: UpdateFolderInput
): Promise<Folder> {
  const now = new Date().toISOString();
  const valuesToUpdate: Partial<typeof folders.$inferInsert> = {
    updatedAt: now,
  };

  if (input.name !== undefined) valuesToUpdate.name = input.name.trim();
  if (input.color !== undefined) valuesToUpdate.color = input.color;
  if (input.icon !== undefined) valuesToUpdate.icon = input.icon;
  if (input.isLocked !== undefined) {
    valuesToUpdate.isLocked = input.isLocked;
    if (input.isLocked && valuesToUpdate.icon === undefined) {
      valuesToUpdate.icon = 'lock';
    } else if (!input.isLocked && valuesToUpdate.icon === 'lock') {
      valuesToUpdate.icon = 'folder';
    }
  }
  if (input.pinCode !== undefined) valuesToUpdate.pinCode = input.pinCode;
  if (input.sortOrder !== undefined) valuesToUpdate.sortOrder = input.sortOrder;

  const [updated] = await db
    .update(folders)
    .set(valuesToUpdate)
    .where(eq(folders.id, id))
    .returning();

  if (!updated) {
    throw new Error(`Folder with id "${id}" not found.`);
  }

  await enqueueOutbox('folders', updated.id, 'upsert', updated);
  syncManager.sync().catch(() => {});

  return updated;
}

/**
 * Soft deletes a folder by stamping deletedAt.
 * Optionally orphans or soft deletes notes inside it.
 */
export async function softDeleteFolder(
  id: string,
  options: { deleteNotes?: boolean } = {}
): Promise<void> {
  const now = new Date().toISOString();

  if (options.deleteNotes) {
    const updatedNotes = await db
      .update(notes)
      .set({ deletedAt: now, updatedAt: now })
      .where(eq(notes.folderId, id))
      .returning();

    for (const n of updatedNotes) {
      await enqueueOutbox('notes', n.id, 'upsert', n);
    }
  } else {
    // Orphan notes (retain notes, remove folder association)
    const updatedNotes = await db
      .update(notes)
      .set({ folderId: null, updatedAt: now })
      .where(eq(notes.folderId, id))
      .returning();

    for (const n of updatedNotes) {
      await enqueueOutbox('notes', n.id, 'upsert', n);
    }
  }

  const [deleted] = await db
    .update(folders)
    .set({ deletedAt: now, updatedAt: now })
    .where(eq(folders.id, id))
    .returning();

  if (deleted) {
    await enqueueOutbox('folders', deleted.id, 'upsert', deleted);
  }

  syncManager.sync().catch(() => {});
}

/**
 * Verifies a PIN code against a folder.
 */
export async function verifyFolderPin(
  folderId: string,
  enteredPin: string
): Promise<boolean> {
  const folder = await getFolderById(folderId);
  if (!folder) return false;
  if (!folder.isLocked) return true;
  return folder.pinCode === enteredPin.trim();
}
