import * as Crypto from 'expo-crypto';
import { and, asc, desc, eq, isNull, like, or, type SQL } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

import { db } from '@/db/client';
import { notes } from '@/db/schema';
import type {
  CreateNoteInput,
  ListNotesOptions,
  NoteSelect as Note,
  UpdateNoteInput,
} from '@/lib/types/notes';
import { enqueueOutbox } from '@/lib/sync/outbox';
import { useAuthStore } from '@/lib/auth/auth-store';
import { currentAuthUserId, ownerCondition } from './owner';

// ============================================================================
// Internal Query Builder (Shared by listNotes & useLiveNotes)
// ============================================================================

function buildNotesQuery(
  options: ListNotesOptions = {},
  userId: string | null = currentAuthUserId(),
) {
  const conditions: SQL[] = [ownerCondition(notes.userId, userId)];

  if (!options.includeDeleted) {
    conditions.push(isNull(notes.deletedAt));
  }

  if (options.archivedOnly) {
    conditions.push(eq(notes.isArchived, true));
  } else if (!options.includeArchived) {
    conditions.push(eq(notes.isArchived, false));
  }

  if (options.pinnedOnly) {
    conditions.push(eq(notes.isPinned, true));
  }

  if (options.folderId !== undefined) {
    if (options.folderId === null) {
      conditions.push(isNull(notes.folderId));
    } else {
      conditions.push(eq(notes.folderId, options.folderId));
    }
  }

  if (options.tag) {
    conditions.push(like(notes.tags, `%"${options.tag}"%`));
  }

  if (options.search) {
    const term = `%${options.search}%`;
    conditions.push(
      or(like(notes.title, term), like(notes.content, term)) as SQL
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const orderClauses = [];
  if (!options.pinnedOnly && options.pinnedFirst !== false) {
    orderClauses.push(desc(notes.isPinned));
  }

  const direction = options.orderDirection === 'asc' ? asc : desc;
  if (options.orderBy === 'createdAt') {
    orderClauses.push(direction(notes.createdAt));
  } else if (options.orderBy === 'title') {
    orderClauses.push(direction(notes.title));
  } else {
    orderClauses.push(direction(notes.updatedAt));
  }

  let query = db
    .select()
    .from(notes)
    .where(whereClause)
    .orderBy(...orderClauses);

  if (options.limit !== undefined) {
    query = query.limit(options.limit) as typeof query;
  }
  if (options.offset !== undefined) {
    query = query.offset(options.offset) as typeof query;
  }

  return query;
}

// ============================================================================
// Reactive Hooks (useLiveQuery)
// ============================================================================

/**
 * Reactive hook: Automatically re-renders when notes change in SQLite.
 */
export function useLiveNotes(options: ListNotesOptions = {}) {
  const userId = useAuthStore((s) => s.user?.id);
  const query = buildNotesQuery(options, userId);


  const res = useLiveQuery(query, [
    userId,
    options.folderId,
    options.includeDeleted,
    options.includeArchived,
    options.pinnedOnly,
    options.archivedOnly,
    options.tag,
    options.search,
    options.pinnedFirst,
    options.orderBy,
    options.orderDirection,
    options.limit,
    options.offset,
  ]);

  return {...res, isLoading: !res.updatedAt && res.data?.length === 0}  
}

/**
 * Reactive hook for observing a single note by ID.
 */
export function useLiveNote(id: string) {
  const userId = useAuthStore((s) => s.user?.id);
  const res = useLiveQuery(
    db
      .select()
      .from(notes)
      .where(and(eq(notes.id, id), ownerCondition(notes.userId, userId)))
      .limit(1),
    [id, userId]
  );

  return {
    ...res,
    data: res.data?.[0],
  };
}

// ============================================================================
// Imperative Read Queries
// ============================================================================

/**
 * Fetches a single note by ID (imperative, one-off).
 */
export async function getNoteById(id: string): Promise<Note | null> {
  const [note] = await db
    .select()
    .from(notes)
    .where(and(eq(notes.id, id), ownerCondition(notes.userId)))
    .limit(1);

  return note;
}

/**
 * Lists notes matching options (imperative, one-off).
 */
export async function listNotes(
  options: ListNotesOptions = {}
): Promise<Note[]> {
  return await buildNotesQuery(options);
}

/**
 * Searches active notes across title and content (imperative, one-off).
 */
export async function searchNotes(
  query: string,
  options: Omit<ListNotesOptions, 'search'> = {}
): Promise<Note[]> {
  return await listNotes({
    ...options,
    search: query,
  });
}

// ============================================================================
// Imperative Write Mutations
// ============================================================================

/**
 * Creates a new note in SQLite.
 */
export async function createNote(
  input: CreateNoteInput & { userId?: string | null } = {}
): Promise<Note> {
  const id = input.id ?? Crypto.randomUUID();
  const now = new Date().toISOString();
  const tags = input.tags ? JSON.stringify(input.tags) : '[]';

  const [created] = await db
    .insert(notes)
    .values({
      id,
      userId: input.userId ?? currentAuthUserId(),
      folderId: input.folderId,
      title: input.title ?? '',
      content: input.content ?? '',
      tags,
      isPinned: input.isPinned ?? false,
      isArchived: input.isArchived ?? false,
      summary: input.summary,
      version: 1,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    })
    .returning();

  const initialChanges = {
    folderId: created.folderId,
    title: created.title,
    content: created.content,
    tags: input.tags ?? [],
    isPinned: created.isPinned,
    isArchived: created.isArchived,
    summary: created.summary,
  };

  await enqueueOutbox('notes', created.id, 'upsert', initialChanges, created.version);

  return created;
}

/**
 * Updates a note's specified fields with strict field-level change tracking.
 */
export async function updateNote(
  id: string,
  input: UpdateNoteInput
): Promise<Note> {
  const existing = await getNoteById(id);
  if (!existing) {
    throw new Error(`Note with id "${id}" not found.`);
  }

  const now = new Date().toISOString();
  const nextVersion = (existing.version ?? 1) + 1;
  const valuesToUpdate: Partial<typeof notes.$inferInsert> = {
    updatedAt: now,
    version: nextVersion,
  };

  if (input.folderId !== undefined) {
    valuesToUpdate.folderId = input.folderId;
  }
  if (input.title !== undefined) {
    valuesToUpdate.title = input.title;
  }
  if (input.content !== undefined) {
    valuesToUpdate.content = input.content;
  }
  if (input.tags !== undefined) {
    valuesToUpdate.tags = JSON.stringify(input.tags);
  }
  if (input.isPinned !== undefined) {
    valuesToUpdate.isPinned = input.isPinned;
  }
  if (input.isArchived !== undefined) {
    valuesToUpdate.isArchived = input.isArchived;
  }
  if (input.summary !== undefined) {
    valuesToUpdate.summary = input.summary;
  }

  const [updated] = await db
    .update(notes)
    .set(valuesToUpdate)
    .where(and(eq(notes.id, id), ownerCondition(notes.userId)))
    .returning();

  if (!updated) {
    throw new Error(`Note with id "${id}" not found.`);
  }

  await enqueueOutbox(
    "notes",
    updated.id,
    "upsert",
    valuesToUpdate,
    updated.version,
  );

  return updated;
}

/**
 * Moves a note to a folder (or removes it from a folder by passing null).
 */
export async function moveNoteToFolder(
  id: string,
  folderId: string | null
): Promise<Note> {
  return await updateNote(id, { folderId });
}

/**
 * Soft deletes a note by stamping deletedAt.
 */
export async function softDeleteNote(id: string): Promise<Note> {
  const existing = await getNoteById(id);
  const nextVersion = (existing?.version ?? 1) + 1;
  const now = new Date().toISOString();

  const [deleted] = await db
    .update(notes)
    .set({ deletedAt: now, updatedAt: now, version: nextVersion })
    .where(and(eq(notes.id, id), ownerCondition(notes.userId)))
    .returning();

  if (!deleted) {
    throw new Error(`Note with id "${id}" not found.`);
  }

  await enqueueOutbox('notes', deleted.id, 'delete', { deletedAt: now }, deleted.version);

  return deleted;
}

/**
 * Restores a soft-deleted note.
 */
export async function restoreNote(id: string): Promise<Note> {
  const existing = await getNoteById(id);
  const nextVersion = (existing?.version ?? 1) + 1;
  const now = new Date().toISOString();
  const [restored] = await db
    .update(notes)
    .set({ deletedAt: null, updatedAt: now, version: nextVersion })
    .where(and(eq(notes.id, id), ownerCondition(notes.userId)))
    .returning();

  if (!restored) {
    throw new Error(`Note with id "${id}" not found.`);
  }

  await enqueueOutbox('notes', restored.id, 'upsert', { deletedAt: null }, restored.version);

  return restored;
}

/**
 * Permanently removes a note from SQLite.
 */
export async function hardDeleteNote(id: string): Promise<boolean> {
  const [deleted] = await db
    .delete(notes)
    .where(and(eq(notes.id, id), ownerCondition(notes.userId)))
    .returning();
  if (deleted) {
    await enqueueOutbox('notes', id, 'delete', { deletedAt: new Date().toISOString() });
  }
  return !!deleted;
}

/**
 * Toggles a note's pinned state.
 */
export async function togglePinNote(id: string): Promise<Note> {
  const existing = await getNoteById(id);
  if (!existing) {
    throw new Error(`Note with id "${id}" not found.`);
  }
  return await updateNote(id, { isPinned: !existing.isPinned });
}

/**
 * Toggles a note's archived state.
 */
export async function toggleArchiveNote(id: string): Promise<Note> {
  const existing = await getNoteById(id);
  if (!existing) {
    throw new Error(`Note with id "${id}" not found.`);
  }
  return await updateNote(id, { isArchived: !existing.isArchived });
}

/**
 * Applies one mutation per id. Failed ids stay available for retry.
 */
export async function applyToNotes(
  ids: string[],
  apply: (id: string) => Promise<unknown>,
): Promise<{ succeeded: string[]; failed: string[] }> {
  const succeeded: string[] = [];
  const failed: string[] = [];
  for (const id of ids) {
    try {
      await apply(id);
      succeeded.push(id);
    } catch {
      failed.push(id);
    }
  }
  return { succeeded, failed };
}

/**
 * Upserts a note incoming from a sync pull with Last-Write-Wins (LWW).
 * Adapts platform boundary: parses native string[] tags into SQLite JSON string.
 */
export async function upsertNoteFromSync(n: {
  id: string;
  folderId?: string | null;
  title: string;
  content?: string;
  tags?: string[] | string;
  isPinned?: boolean;
  isArchived?: boolean;
  summary?: string | null;
  version?: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  userId?: string | null;
}): Promise<void> {
  const [existing] = await db
    .select({ updatedAt: notes.updatedAt })
    .from(notes)
    .where(eq(notes.id, n.id))
    .limit(1);

  if (existing && new Date(existing.updatedAt) > new Date(n.updatedAt)) {
    return;
  }

  // Adapt tags: convert array or raw string to SQLite JSON string
  let tagsJson = '[]';
  if (Array.isArray(n.tags)) {
    tagsJson = JSON.stringify(n.tags);
  } else if (typeof n.tags === 'string') {
    tagsJson = n.tags;
  }

  await db
    .insert(notes)
    .values({
      id: n.id,
      userId: n.userId,
      folderId: n.folderId,
      title: n.title ?? '',
      content: n.content ?? '',
      tags: tagsJson,
      isPinned: n.isPinned ?? false,
      isArchived: n.isArchived ?? false,
      summary: n.summary,
      version: n.version ?? 1,
      createdAt: n.createdAt,
      updatedAt: n.updatedAt,
      deletedAt: n.deletedAt,
    })
    .onConflictDoUpdate({
      target: notes.id,
      set: {
        folderId: n.folderId,
        title: n.title ?? '',
        content: n.content ?? '',
        tags: tagsJson,
        isPinned: n.isPinned ?? false,
        isArchived: n.isArchived ?? false,
        summary: n.summary,
        version: n.version ?? 1,
        updatedAt: n.updatedAt,
        deletedAt: n.deletedAt,
        ...(n.userId ? { userId: n.userId } : {}),
      },
    });
}

/**
 * Migrates local notes created in Guest Mode (strictly where userId IS NULL) to the authenticated user.
 * Guarantees that notes belonging to previously signed-in accounts are NEVER overwritten or claimed.
 */
export async function migrateGuestNotes(userId: string): Promise<number> {
  const guestNotes = await db
    .select()
    .from(notes)
    .where(isNull(notes.userId));

  if (guestNotes.length === 0) return 0;

  for (const n of guestNotes) {
    const [updated] = await db
      .update(notes)
      .set({ userId })
      .where(eq(notes.id, n.id))
      .returning();

    if (updated) {
      await enqueueOutbox('notes', updated.id, 'upsert', updated);
    }
  }

  return guestNotes.length;
}
