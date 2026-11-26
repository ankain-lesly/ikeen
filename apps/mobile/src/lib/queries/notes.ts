import { useCallback, useMemo, useState } from 'react';
import * as Crypto from 'expo-crypto';
import { and, asc, count, desc, eq, inArray, isNotNull, isNull, like, or, sql, type SQL } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

import { db } from '@/db/client';
import { notes, reminders } from '@/db/schema';
import type {
  CreateNoteInput,
  ListNotesOptions,
  NoteSelect as Note,
  NoteBlock,
  NoteWithBlocks,
  UpdateNoteInput,
} from '@/lib/types/notes';
import { unpackNoteBlock } from './block-content.codec';
import { enqueueOutbox } from '@/lib/sync/outbox';
import { useAuthStore } from '@/lib/auth/auth-store';
import { currentAuthUserId, ownerCondition } from './owner';

// ============================================================================
// Internal Query Builder (Shared by listNotes & useLiveNotes)
// ============================================================================

// In-memory cache for unpacked blocks to avoid re-parsing JSON and keep referential stability
const unpackedBlockCache = new Map<string, NoteBlock>();

function getCachedUnpackedBlock(raw: any): NoteBlock {
  const key = `${raw.id}:${raw.updatedAt}`;
  const cached = unpackedBlockCache.get(key);
  if (cached) return cached;
  const unpacked = unpackNoteBlock(raw);
  unpackedBlockCache.set(key, unpacked);
  if (unpackedBlockCache.size > 1000) {
    const firstKey = unpackedBlockCache.keys().next().value;
    if (firstKey) unpackedBlockCache.delete(firstKey);
  }
  return unpacked;
}

function buildNotesFiltersAndSort(
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

  if (options.remindersOnly) {
    const activeReminderNoteIds = db
      .selectDistinct({ noteId: reminders.noteId })
      .from(reminders)
      .where(
        and(
          ownerCondition(reminders.userId, userId),
          isNull(reminders.deletedAt),
          eq(reminders.isCompleted, false),
          isNotNull(reminders.noteId),
        ),
      );
    conditions.push(inArray(notes.id, activeReminderNoteIds));
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
      or(like(notes.title, term), like(notes.content, term)) as SQL,
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

  return { whereClause, orderClauses };
}

function buildNotesQuery(
  options: ListNotesOptions = {},
  userId: string | null = currentAuthUserId(),
) {
  const { whereClause, orderClauses } = buildNotesFiltersAndSort(options, userId);

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

function buildNotesRelationalQuery(
  options: ListNotesOptions = {},
  userId: string | null = currentAuthUserId(),
) {
  const { whereClause, orderClauses } = buildNotesFiltersAndSort(options, userId);

  return db.query.notes.findMany({
    where: whereClause,
    orderBy: orderClauses,
    limit: options.limit,
    offset: options.offset,
    with: {
      blocks: {
        orderBy: (blocks, { asc: ascOrder }) => [ascOrder(blocks.position)],
      },
      reminders: {
        where: (reminders, { isNull, and, eq }) =>
          and(isNull(reminders.deletedAt), eq(reminders.isCompleted, false)),
        orderBy: (reminders, { asc: ascOrder }) => [ascOrder(reminders.dueAt)],
      },
    },
  });
}

// ============================================================================
// Reactive Hooks (useLiveQuery)
// ============================================================================

/**
 * Reactive hook: Automatically re-renders when notes change in SQLite.
 * Fetches structured note blocks by default (`withBlocks !== false`).
 */
export function useLiveNotes(options: ListNotesOptions = {}) {
  const userId = useAuthStore((s) => s.user?.id);
  const withBlocks = options.withBlocks !== false;

  const query = withBlocks
    ? buildNotesRelationalQuery(options, userId)
    : buildNotesQuery(options, userId);

  const res = useLiveQuery(query as any, [
    userId,
    withBlocks,
    options.folderId,
    options.includeDeleted,
    options.includeArchived,
    options.pinnedOnly,
    options.archivedOnly,
    options.remindersOnly,
    options.tag,
    options.search,
    options.pinnedFirst,
    options.orderBy,
    options.orderDirection,
    options.limit,
    options.offset,
  ]);

  const data = useMemo<NoteWithBlocks[]>(() => {
    if (!res.data) return [];
    const items: NoteWithBlocks[] = !withBlocks
      ? (res.data as NoteWithBlocks[])
      : (res.data as any[]).map((n) => ({
          ...n,
          blocks: Array.isArray(n.blocks)
            ? (n.blocks as any[]).map(getCachedUnpackedBlock)
            : undefined,
          reminders: Array.isArray(n.reminders) ? n.reminders : undefined,
        }));

    if (options.remindersOnly && !options.orderBy) {
      return [...items].sort((a, b) => {
        const aDue = a.reminders?.[0]?.dueAt
          ? new Date(a.reminders[0].dueAt).getTime()
          : Infinity;
        const bDue = b.reminders?.[0]?.dueAt
          ? new Date(b.reminders[0].dueAt).getTime()
          : Infinity;
        return aDue - bDue;
      });
    }

    return items;
  }, [res.data, withBlocks, options.remindersOnly, options.orderBy]);

  return {
    ...res,
    data,
    isLoading: !res.updatedAt && data.length === 0,
  };
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

export interface RecentNote {
  id: string;
  title: string;
  isPinned: boolean;
  isArchived: boolean;
  updatedAt: string;
}

export interface NotesOverviewStats {
  activeCount: number;
  pinnedCount: number;
  trashCount: number;
  remindersCount: number;
  isLoading: boolean;
}

/**
 * Lightweight reactive hook to observe recent note summaries (id, title, isPinned, updatedAt).
 * Ideal for sidebars, navigation panels, or widget feeds without joining or deserializing blocks.
 */
export function useRecentNotes(limit: number = 6) {
  const userId = useAuthStore((s) => s.user?.id ?? null);

  const query = useMemo(() => {
    return db
      .select({
        id: notes.id,
        title: notes.title,
        isPinned: notes.isPinned,
        isArchived: notes.isArchived,
        updatedAt: notes.updatedAt,
      })
      .from(notes)
      .where(
        and(
          ownerCondition(notes.userId, userId),
          isNull(notes.deletedAt),
          // eq(notes.isArchived, false),
        ),
      )
      .orderBy(desc(notes.isPinned), desc(notes.updatedAt))
      .limit(limit);
  }, [userId, limit]);

  const res = useLiveQuery(query, [userId, limit]);

  const data = useMemo<RecentNote[]>(() => {
    return (res.data ?? []).map((row) => ({
      id: row.id,
      title: (row.title && row.title.trim()) || "Untitled Note",
      isPinned: !!row.isPinned,
      isArchived: !!row.isArchived,
      updatedAt: row.updatedAt,
    }));
  }, [res.data]);

  return {
    ...res,
    data,
    isLoading: !res.updatedAt && data.length === 0,
  };
}

export interface InfiniteRecentNotesResult {
  notes: RecentNote[];
  totalCount: number;
  hasMore: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  loadMore: () => void;
}

/**
 * Progressive live query hook for infinite recent notes feed in the drawer.
 * Expands the SQLite query limit incrementally by pageSize on demand.
 */
export function useInfiniteRecentNotes(
  pageSize: number = 20,
): InfiniteRecentNotesResult {
  const [limit, setLimit] = useState(pageSize);
  const { data: notes = [], isLoading } = useRecentNotes(limit);
  const { activeCount } = useNotesStats();

  const hasMore = notes.length < activeCount;
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const loadMore = useCallback(() => {
    if (!hasMore || isLoadingMore) return;
    setIsLoadingMore(true);
    setLimit((prev) => prev + pageSize);
    setTimeout(() => setIsLoadingMore(false), 150);
  }, [hasMore, isLoadingMore, pageSize]);

  return {
    notes,
    totalCount: activeCount,
    hasMore,
    isLoading,
    isLoadingMore,
    loadMore,
  };
}

/**
 * Lightweight reactive hook for global notes count statistics (active notes and trashed notes).
 * Uses a single-row SQL aggregation over the notes table.
 */
export function useNotesStats(): NotesOverviewStats {
  const userId = useAuthStore((s) => s.user?.id ?? null);

  const notesQuery = useMemo(() => {
    return db
      .select({
        activeCount: sql<number>`coalesce(sum(case when ${notes.deletedAt} is null and ${notes.isArchived} = 0 then 1 else 0 end), 0)`,
        trashCount: sql<number>`coalesce(sum(case when ${notes.deletedAt} is not null then 1 else 0 end), 0)`,
        pinnedCount: sql<number>`coalesce(sum(case when ${notes.isPinned} is not null and ${notes.isPinned} = 1 then 1 else 0 end), 0)`,
      })
      .from(notes)
      .where(ownerCondition(notes.userId, userId));
  }, [userId]);

  const remindersQuery = useMemo(() => {
    return db
      .select({ count: count() })
      .from(reminders)
      .where(
        and(
          ownerCondition(reminders.userId, userId),
          isNull(reminders.deletedAt),
          eq(reminders.isCompleted, false),
        ),
      );
  }, [userId]);

  const notesRes = useLiveQuery(notesQuery, [userId]);
  const remindersRes = useLiveQuery(remindersQuery, [userId]);

  const activeCount = Number(notesRes.data?.[0]?.activeCount ?? 0);
  const trashCount = Number(notesRes.data?.[0]?.trashCount ?? 0);
  const pinnedCount = Number(notesRes.data?.[0]?.pinnedCount ?? 0);
  const remindersCount = Number(remindersRes.data?.[0]?.count ?? 0);

  return {
    activeCount,
    trashCount,
    pinnedCount,
    remindersCount,
    isLoading: !notesRes.updatedAt || !remindersRes.updatedAt,
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
 * Fetches structured note blocks by default (`withBlocks !== false`).
 */
export async function listNotes(
  options: ListNotesOptions = {}
): Promise<NoteWithBlocks[]> {
  const withBlocks = options.withBlocks !== false;
  if (!withBlocks) {
    return (await buildNotesQuery(options)) as NoteWithBlocks[];
  }
  const rows = await buildNotesRelationalQuery(options);
  return rows.map((n: any) => ({
    ...n,
    blocks: Array.isArray(n.blocks)
      ? (n.blocks as any[]).map(getCachedUnpackedBlock)
      : undefined,
  }));
}

/**
 * Searches active notes across title and content (imperative, one-off).
 */
export async function searchNotes(
  query: string,
  options: Omit<ListNotesOptions, 'search'> = {}
): Promise<NoteWithBlocks[]> {
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

  let parsedTags: string[] = [];
  try {
    const parsed = JSON.parse(updated.tags || "[]");
    parsedTags = Array.isArray(parsed) ? parsed : [];
  } catch {
    parsedTags = [];
  }

  await enqueueOutbox(
    "notes",
    updated.id,
    "upsert",
    {
      folderId: updated.folderId,
      title: updated.title,
      content: updated.content,
      tags: parsedTags,
      isPinned: updated.isPinned,
      isArchived: updated.isArchived,
      summary: updated.summary,
      updatedAt: updated.updatedAt,
    },
    updated.version,
  );

  return updated;
}

/**
 * Touches a note by updating its updatedAt timestamp and incrementing its version.
 * Immediately notifies Drizzle reactive live queries and enqueues outbox sync.
 */
export async function touchNote(id: string): Promise<Note | null> {
  const existing = await getNoteById(id);
  if (!existing) return null;

  const now = new Date().toISOString();
  const nextVersion = (existing.version ?? 1) + 1;

  const [updated] = await db
    .update(notes)
    .set({ updatedAt: now, version: nextVersion })
    .where(and(eq(notes.id, id), ownerCondition(notes.userId)))
    .returning();

  if (updated) {
    let parsedTags: string[] = [];
    try {
      const parsed = JSON.parse(updated.tags || '[]');
      parsedTags = Array.isArray(parsed) ? parsed : [];
    } catch {
      parsedTags = [];
    }
    await enqueueOutbox(
      'notes',
      updated.id,
      'upsert',
      {
        folderId: updated.folderId,
        title: updated.title,
        content: updated.content,
        tags: parsedTags,
        isPinned: updated.isPinned,
        isArchived: updated.isArchived,
        summary: updated.summary,
        updatedAt: now,
      },
      updated.version,
    );
  }

  return updated ?? null;
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
