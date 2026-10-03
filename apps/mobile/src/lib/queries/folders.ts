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
import { useAuthStore } from '@/lib/auth/auth-store';
import { currentAuthUserId, ownerCondition } from './owner';

function folderNoteJoin(userId: string | null = currentAuthUserId()) {
  return and(
    eq(notes.folderId, folders.id),
    isNull(notes.deletedAt),
    eq(notes.isArchived, false),
    ownerCondition(notes.userId, userId),
  );
}

// ============================================================================
// Internal Query Builder for Folders
// ============================================================================

function buildFoldersQuery(
  options: ListFoldersOptions = {},
  userId: string | null = currentAuthUserId(),
) {
  const conditions: SQL[] = [ownerCondition(folders.userId, userId)];

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
    .leftJoin(notes, folderNoteJoin(userId))
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
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const query = buildFoldersQuery(options, userId);
  const result = useLiveQuery(query, [
    userId,
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
  const userId = useAuthStore((s) => s.user?.id ?? null);
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
    .leftJoin(notes, folderNoteJoin(userId))
    .where(
      and(
        eq(folders.id, id),
        isNull(folders.deletedAt),
        ownerCondition(folders.userId, userId),
      ),
    )
    .groupBy(folders.id)
    .limit(1);

  const res = useLiveQuery(query, [id, userId]);

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
    .leftJoin(notes, folderNoteJoin())
    .where(
      and(
        eq(folders.id, id),
        isNull(folders.deletedAt),
        ownerCondition(folders.userId),
      ),
    )
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
      userId: input.userId ?? currentAuthUserId(),
      name: input.name.trim(),
      color: input.color ?? '#3b82f6',
      icon: input.icon ?? (input.isLocked ? 'lock' : 'folder'),
      isLocked: input.isLocked ?? false,
      pinCode: input.pinCode ?? null,
      sortOrder: 0,
      version: 1,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    })
    .returning();

  const initialChanges = {
    name: created.name,
    color: created.color,
    icon: created.icon,
    isLocked: created.isLocked,
    pinCode: created.pinCode,
    sortOrder: created.sortOrder,
  };

  await enqueueOutbox('folders', created.id, 'upsert', initialChanges, created.version);

  return created;
}

/**
 * Updates an existing folder with strict field-level change tracking.
 */
export async function updateFolder(
  id: string,
  input: UpdateFolderInput
): Promise<Folder> {
  const existing = await getFolderById(id);
  if (!existing) {
    throw new Error(`Folder with id "${id}" not found.`);
  }

  const now = new Date().toISOString();
  const nextVersion = (existing.version ?? 1) + 1;
  const valuesToUpdate: Partial<typeof folders.$inferInsert> = {
    updatedAt: now,
    version: nextVersion,
  };
  const changedFields: Record<string, any> = {};

  if (input.name !== undefined) {
    valuesToUpdate.name = input.name.trim();
    changedFields.name = valuesToUpdate.name;
  }
  if (input.color !== undefined) {
    valuesToUpdate.color = input.color;
    changedFields.color = valuesToUpdate.color;
  }
  if (input.icon !== undefined) {
    valuesToUpdate.icon = input.icon;
    changedFields.icon = valuesToUpdate.icon;
  }
  if (input.isLocked !== undefined) {
    valuesToUpdate.isLocked = input.isLocked;
    changedFields.isLocked = valuesToUpdate.isLocked;
    if (input.isLocked && valuesToUpdate.icon === undefined) {
      valuesToUpdate.icon = 'lock';
      changedFields.icon = 'lock';
    } else if (!input.isLocked && valuesToUpdate.icon === 'lock') {
      valuesToUpdate.icon = 'folder';
      changedFields.icon = 'folder';
    }
  }
  if (input.pinCode !== undefined) {
    valuesToUpdate.pinCode = input.pinCode;
    changedFields.pinCode = valuesToUpdate.pinCode;
  }
  if (input.sortOrder !== undefined) {
    valuesToUpdate.sortOrder = input.sortOrder;
    changedFields.sortOrder = valuesToUpdate.sortOrder;
  }

  const [updated] = await db
    .update(folders)
    .set(valuesToUpdate)
    .where(and(eq(folders.id, id), ownerCondition(folders.userId)))
    .returning();

  if (!updated) {
    throw new Error(`Folder with id "${id}" not found.`);
  }

  await enqueueOutbox('folders', updated.id, 'upsert', changedFields, updated.version);

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
  const existing = await getFolderById(id);
  if (!existing) {
    throw new Error(`Folder with id "${id}" not found.`);
  }

  const now = new Date().toISOString();

  if (options.deleteNotes) {
    const updatedNotes = await db
      .update(notes)
      .set({ deletedAt: now, updatedAt: now, version: sql`${notes.version} + 1` })
      .where(and(eq(notes.folderId, id), ownerCondition(notes.userId)))
      .returning();

    for (const n of updatedNotes) {
      await enqueueOutbox('notes', n.id, 'delete', { deletedAt: now }, n.version);
    }
  } else {
    // Orphan notes (retain notes, remove folder association)
    const updatedNotes = await db
      .update(notes)
      .set({ folderId: null, updatedAt: now, version: sql`${notes.version} + 1` })
      .where(and(eq(notes.folderId, id), ownerCondition(notes.userId)))
      .returning();

    for (const n of updatedNotes) {
      await enqueueOutbox('notes', n.id, 'upsert', { folderId: null }, n.version);
    }
  }

  const [deleted] = await db
    .update(folders)
    .set({ deletedAt: now, updatedAt: now, version: sql`${folders.version} + 1` })
    .where(and(eq(folders.id, id), ownerCondition(folders.userId)))
    .returning();

  if (deleted) {
    await enqueueOutbox('folders', deleted.id, 'delete', { deletedAt: now }, deleted.version);
  }
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

/**
 * Upserts a folder incoming from a sync pull with Last-Write-Wins (LWW).
 */
export async function upsertFolderFromSync(f: {
  id: string;
  name: string;
  color?: string;
  icon?: string;
  isLocked?: boolean;
  pinCode?: string | null;
  sortOrder?: number;
  version?: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  userId?: string | null;
}): Promise<void> {
  const [existing] = await db
    .select({ updatedAt: folders.updatedAt, version: folders.version })
    .from(folders)
    .where(eq(folders.id, f.id))
    .limit(1);

  if (existing && new Date(existing.updatedAt) > new Date(f.updatedAt)) {
    return;
  }

  await db
    .insert(folders)
    .values({
      id: f.id,
      userId: f.userId ?? null,
      name: f.name,
      color: f.color ?? '#3b82f6',
      icon: f.icon ?? 'folder',
      isLocked: f.isLocked ?? false,
      pinCode: f.pinCode ?? null,
      sortOrder: f.sortOrder ?? 0,
      version: f.version ?? 1,
      createdAt: f.createdAt,
      updatedAt: f.updatedAt,
      deletedAt: f.deletedAt ?? null,
    })
    .onConflictDoUpdate({
      target: folders.id,
      set: {
        name: f.name,
        color: f.color ?? '#3b82f6',
        icon: f.icon ?? 'folder',
        isLocked: f.isLocked ?? false,
        pinCode: f.pinCode ?? null,
        sortOrder: f.sortOrder ?? 0,
        version: f.version ?? 1,
        updatedAt: f.updatedAt,
        deletedAt: f.deletedAt ?? null,
        ...(f.userId ? { userId: f.userId } : {}),
      },
    });
}

/**
 * Migrates local folders created in Guest Mode (strictly where userId IS NULL) to the authenticated user.
 */
export async function migrateGuestFolders(userId: string): Promise<number> {
  const guestFolders = await db
    .select()
    .from(folders)
    .where(isNull(folders.userId));

  if (guestFolders.length === 0) return 0;

  for (const f of guestFolders) {
    const [updated] = await db
      .update(folders)
      .set({ userId })
      .where(eq(folders.id, f.id))
      .returning();

    if (updated) {
      await enqueueOutbox('folders', updated.id, 'upsert', updated);
    }
  }

  return guestFolders.length;
}
