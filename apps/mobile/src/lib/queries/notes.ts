import * as Crypto from 'expo-crypto';
import { and, asc, desc, eq, isNull, like, or, type SQL } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

import { db } from '@/db/client';
import { notes } from '@/db/schema';
import type {
  CreateNoteInput,
  ListNotesOptions,
  Note,
  UpdateNoteInput,
} from '@/lib/types/notes';

// ============================================================================
// Internal Query Builder (Shared by listNotes & useLiveNotes)
// ============================================================================

function buildNotesQuery(options: ListNotesOptions = {}) {
  const conditions: SQL[] = [];

  if (!options.includeDeleted) {
    conditions.push(isNull(notes.deletedAt));
  }

  if (!options.includeArchived) {
    conditions.push(eq(notes.isArchived, false));
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
  if (options.pinnedFirst !== false) {
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
  const query = buildNotesQuery(options);
  return useLiveQuery(query, [
    options.includeDeleted,
    options.includeArchived,
    options.tag,
    options.search,
    options.pinnedFirst,
    options.orderBy,
    options.orderDirection,
    options.limit,
    options.offset,
  ]);
}

/**
 * Reactive hook for observing a single note by ID.
 */
export function useLiveNote(id: string) {
  const res = useLiveQuery(
    db.select().from(notes).where(eq(notes.id, id)).limit(1),
    [id]
  );

  return {
    ...res,
    data: res.data?.[0] ?? null,
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
    .where(eq(notes.id, id))
    .limit(1);

  return note ?? null;
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
export async function createNote(input: CreateNoteInput = {}): Promise<Note> {
  const id = input.id ?? Crypto.randomUUID();
  const now = new Date().toISOString();
  const tags = input.tags ? JSON.stringify(input.tags) : '[]';

  const [created] = await db
    .insert(notes)
    .values({
      id,
      title: input.title ?? '',
      content: input.content ?? '',
      tags,
      isPinned: input.isPinned ?? false,
      isArchived: input.isArchived ?? false,
      summary: input.summary ?? null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    })
    .returning();

  return created;
}

/**
 * Updates a note's specified fields and updates updatedAt.
 */
export async function updateNote(
  id: string,
  input: UpdateNoteInput
): Promise<Note> {
  const now = new Date().toISOString();
  const valuesToUpdate: Partial<typeof notes.$inferInsert> = {
    updatedAt: now,
  };

  if (input.title !== undefined) valuesToUpdate.title = input.title;
  if (input.content !== undefined) valuesToUpdate.content = input.content;
  if (input.tags !== undefined) valuesToUpdate.tags = JSON.stringify(input.tags);
  if (input.isPinned !== undefined) valuesToUpdate.isPinned = input.isPinned;
  if (input.isArchived !== undefined)
    valuesToUpdate.isArchived = input.isArchived;
  if (input.summary !== undefined) valuesToUpdate.summary = input.summary;

  const [updated] = await db
    .update(notes)
    .set(valuesToUpdate)
    .where(eq(notes.id, id))
    .returning();

  if (!updated) {
    throw new Error(`Note with id "${id}" not found.`);
  }

  return updated;
}

/**
 * Soft deletes a note by stamping deletedAt.
 */
export async function softDeleteNote(id: string): Promise<Note> {
  const now = new Date().toISOString();
  const [deleted] = await db
    .update(notes)
    .set({ deletedAt: now, updatedAt: now })
    .where(eq(notes.id, id))
    .returning();

  if (!deleted) {
    throw new Error(`Note with id "${id}" not found.`);
  }

  return deleted;
}

/**
 * Restores a soft-deleted note.
 */
export async function restoreNote(id: string): Promise<Note> {
  const now = new Date().toISOString();
  const [restored] = await db
    .update(notes)
    .set({ deletedAt: null, updatedAt: now })
    .where(eq(notes.id, id))
    .returning();

  if (!restored) {
    throw new Error(`Note with id "${id}" not found.`);
  }

  return restored;
}

/**
 * Permanently removes a note from SQLite.
 */
export async function hardDeleteNote(id: string): Promise<boolean> {
  const result = await db.delete(notes).where(eq(notes.id, id)).returning();
  return result.length > 0;
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
