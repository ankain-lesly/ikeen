import { db } from '@/db/client';
import { notes, type NoteSelect } from '@/db/schema';
import { eq, isNull, and, desc, or, like, type SQL } from 'drizzle-orm';
import type { Note, NoteChanges } from '@repo/types';
import { enqueueOutbox } from '@/lib/sync/outbox';

export interface ListNotesFilter {
  folderId?: string | null;
  archivedOnly?: boolean;
  pinnedOnly?: boolean;
  search?: string;
}

function mapSelectToNote(row: NoteSelect): Note {
  let parsedTags: string[] = [];
  try {
    parsedTags = typeof row.tags === 'string' ? JSON.parse(row.tags) : [];
  } catch {
    parsedTags = [];
  }

  return {
    id: row.id,
    folderId: row.folderId ?? undefined,
    title: row.title,
    content: row.content,
    tags: parsedTags,
    isPinned: Boolean(row.isPinned),
    isArchived: Boolean(row.isArchived),
    summary: row.summary ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function listNotes(filter: ListNotesFilter = {}): Promise<Note[]> {
  const conditions: SQL[] = [isNull(notes.deletedAt)];

  if (filter.search && filter.search.trim().length > 0) {
    const term = `%${filter.search.trim()}%`;
    conditions.push(
      or(
        like(notes.title, term),
        like(notes.content, term),
        like(notes.tags, term)
      )!
    );
  }

  if (filter.archivedOnly) {
    conditions.push(eq(notes.isArchived, true));
  } else {
    conditions.push(eq(notes.isArchived, false));
  }

  if (filter.pinnedOnly) {
    conditions.push(eq(notes.isPinned, true));
  }

  if (filter.folderId !== undefined) {
    if (filter.folderId === null || filter.folderId === 'unorganized') {
      conditions.push(isNull(notes.folderId));
    } else if (filter.folderId !== 'all') {
      conditions.push(eq(notes.folderId, filter.folderId));
    }
  }

  try {
    const rows = await db
      .select()
      .from(notes)
      .where(and(...conditions))
      .orderBy(desc(notes.isPinned), desc(notes.updatedAt));

    return rows.map(mapSelectToNote);
  } catch (err: unknown) {
    console.error('[Queries:listNotes:Error]', err);
    return [];
  }
}

export async function getNoteById(id: string): Promise<Note | null> {
  try {
    const rows = await db
      .select()
      .from(notes)
      .where(and(eq(notes.id, id), isNull(notes.deletedAt)))
      .limit(1);

    return rows.length > 0 ? mapSelectToNote(rows[0]) : null;
  } catch (err: unknown) {
    console.error('[Queries:getNoteById:Error]', err);
    return null;
  }
}

export async function createNote(input: {
  title?: string;
  content?: string;
  folderId?: string;
  tags?: string[];
  isPinned?: boolean;
}): Promise<Note | null> {
  const id = `note-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const now = new Date().toISOString();
  const title = input.title ?? 'Untitled Note';
  const content = input.content ?? '';
  const folderId = input.folderId ?? null;
  const tags = JSON.stringify(input.tags ?? []);
  const isPinned = Boolean(input.isPinned);

  try {
    await db.insert(notes).values({
      id,
      folderId,
      title,
      content,
      tags,
      isPinned,
      isArchived: false,
      version: 1,
      createdAt: now,
      updatedAt: now,
    });

    const createdNote: Note = {
      id,
      folderId: folderId ?? undefined,
      title,
      content,
      tags: input.tags ?? [],
      isPinned,
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    };

    // Enqueue outbox mutation
    await enqueueOutbox('notes', id, 'upsert', {
      title,
      content,
      tags: input.tags ?? [],
      folderId: folderId ?? undefined,
      isPinned,
      isArchived: false,
      updatedAt: now,
    });

    return createdNote;
  } catch (err: unknown) {
    console.error('[Queries:createNote:Error]', err);
    return null;
  }
}

export async function updateNote(
  id: string,
  input: Partial<{
    title: string;
    content: string;
    folderId: string | null;
    tags: string[];
    isPinned: boolean;
    isArchived: boolean;
  }>
): Promise<boolean> {
  const now = new Date().toISOString();

  try {
    const updateValues: Record<string, any> = { updatedAt: now };
    if (input.title !== undefined) updateValues.title = input.title;
    if (input.content !== undefined) updateValues.content = input.content;
    if (input.folderId !== undefined) updateValues.folderId = input.folderId;
    if (input.tags !== undefined) updateValues.tags = JSON.stringify(input.tags);
    if (input.isPinned !== undefined) updateValues.isPinned = input.isPinned;
    if (input.isArchived !== undefined) updateValues.isArchived = input.isArchived;

    await db
      .update(notes)
      .set(updateValues)
      .where(and(eq(notes.id, id), isNull(notes.deletedAt)));

    const changes: NoteChanges = {
      ...input,
      tags: input.tags,
      folderId: input.folderId ?? undefined,
      updatedAt: now,
    };

    await enqueueOutbox('notes', id, 'upsert', changes);
    return true;
  } catch (err: unknown) {
    console.error('[Queries:updateNote:Error]', err);
    return false;
  }
}

export async function deleteNote(id: string): Promise<boolean> {
  const now = new Date().toISOString();

  try {
    await db
      .update(notes)
      .set({ deletedAt: now })
      .where(eq(notes.id, id));

    await enqueueOutbox('notes', id, 'delete', { deletedAt: now });
    return true;
  } catch (err: unknown) {
    console.error('[Queries:deleteNote:Error]', err);
    return false;
  }
}

export async function upsertNoteFromSync(n: {
  id: string;
  folderId?: string | null;
  title?: string;
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
    .select({ updatedAt: notes.updatedAt, version: notes.version })
    .from(notes)
    .where(eq(notes.id, n.id))
    .limit(1);

  if (existing && new Date(existing.updatedAt).getTime() > new Date(n.updatedAt).getTime()) {
    return;
  }

  const tagsStr =
    typeof n.tags === 'string'
      ? n.tags
      : JSON.stringify(n.tags ?? []);

  await db
    .insert(notes)
    .values({
      id: n.id,
      folderId: n.folderId ?? null,
      title: n.title ?? 'Untitled Note',
      content: n.content ?? '',
      tags: tagsStr,
      isPinned: Boolean(n.isPinned),
      isArchived: Boolean(n.isArchived),
      summary: n.summary ?? null,
      version: n.version ?? 1,
      createdAt: n.createdAt,
      updatedAt: n.updatedAt,
      deletedAt: n.deletedAt ?? null,
    })
    .onConflictDoUpdate({
      target: notes.id,
      set: {
        folderId: n.folderId ?? null,
        title: n.title ?? 'Untitled Note',
        content: n.content ?? '',
        tags: tagsStr,
        isPinned: Boolean(n.isPinned),
        isArchived: Boolean(n.isArchived),
        summary: n.summary ?? null,
        version: n.version ?? 1,
        updatedAt: n.updatedAt,
        deletedAt: n.deletedAt ?? null,
      },
    });
}
