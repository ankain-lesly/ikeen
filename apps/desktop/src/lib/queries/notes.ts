import { db } from '@/db/client';
import { notes, reminders, type NoteSelect } from '@/db/schema';
import { eq, isNull, and, desc, or, like, inArray, type SQL } from 'drizzle-orm';
import type {
  Note,
  NoteChanges,
  CreateNoteInput,
  UpdateNoteInput,
  ListNotesOptions,
} from '@repo/types';
import { enqueueOutbox } from '@/lib/sync/outbox';
import { newId, shouldApplySyncUpdate } from './query-utils';

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

export async function listNotes(filter: ListNotesOptions = {}): Promise<Note[]> {
  const conditions: SQL[] = [isNull(notes.deletedAt)];

  if (filter.archivedOnly) {
    conditions.push(eq(notes.isArchived, true));
  } else if (!filter.includeArchived) {
    conditions.push(eq(notes.isArchived, false));
  }

  if (filter.search?.trim()) {
    const term = `%${filter.search.trim()}%`;
    conditions.push(or(like(notes.title, term), like(notes.content, term), like(notes.tags, term))!);
  }

  if (filter.pinnedOnly) {
    conditions.push(eq(notes.isPinned, true));
  }

  if (filter.remindersOnly) {
    try {
      const activeRows = await db
        .select({ noteId: reminders.noteId })
        .from(reminders)
        .where(and(isNull(reminders.deletedAt), eq(reminders.isCompleted, false)));
      const activeNoteIds = activeRows.map((r) => r.noteId).filter((id): id is string => Boolean(id));
      if (activeNoteIds.length === 0) return [];
      conditions.push(inArray(notes.id, activeNoteIds));
    } catch (err: unknown) {
      console.error('[Queries:listNotes:remindersOnly:Error]', err);
      return [];
    }
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
    const [row] = await db
      .select()
      .from(notes)
      .where(and(eq(notes.id, id), isNull(notes.deletedAt)))
      .limit(1);
    return row ? mapSelectToNote(row) : null;
  } catch (err: unknown) {
    console.error('[Queries:getNoteById:Error]', err);
    return null;
  }
}

export async function createNote(input: CreateNoteInput = {}): Promise<Note | null> {
  const id = input.id ?? newId();
  const now = new Date().toISOString();
  const title = input.title ?? 'Untitled Note';
  const content = input.content ?? '';
  const folderId = input.folderId ?? null;
  const tags = input.tags ?? [];
  const isPinned = Boolean(input.isPinned);

  try {
    await db.insert(notes).values({
      id,
      folderId,
      title,
      content,
      tags: JSON.stringify(tags),
      isPinned,
      isArchived: false,
      version: 1,
      createdAt: now,
      updatedAt: now,
    });

    await enqueueOutbox('notes', id, 'upsert', {
      title,
      content,
      tags,
      folderId: folderId ?? undefined,
      isPinned,
      isArchived: false,
      updatedAt: now,
    });

    return {
      id,
      folderId: folderId ?? undefined,
      title,
      content,
      tags,
      isPinned,
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    };
  } catch (err: unknown) {
    console.error('[Queries:createNote:Error]', err);
    return null;
  }
}

export async function updateNote(id: string, input: UpdateNoteInput): Promise<boolean> {
  const now = new Date().toISOString();
  try {
    const [existing] = await db
      .select()
      .from(notes)
      .where(and(eq(notes.id, id), isNull(notes.deletedAt)))
      .limit(1);

    if (!existing) return false;

    const nextVersion = (existing.version ?? 1) + 1;
    const updateValues: Record<string, any> = {
      updatedAt: now,
      version: nextVersion,
    };
    if (input.title !== undefined) updateValues.title = input.title;
    if (input.content !== undefined) updateValues.content = input.content;
    if (input.folderId !== undefined) updateValues.folderId = input.folderId;
    if (input.tags !== undefined) updateValues.tags = JSON.stringify(input.tags);
    if (input.isPinned !== undefined) updateValues.isPinned = input.isPinned;
    if (input.isArchived !== undefined) updateValues.isArchived = input.isArchived;
    if (input.summary !== undefined) updateValues.summary = input.summary;

    await db
      .update(notes)
      .set(updateValues)
      .where(and(eq(notes.id, id), isNull(notes.deletedAt)));

    const mapped = mapSelectToNote({
      ...existing,
      ...updateValues,
    });

    const changes: NoteChanges = {
      title: mapped.title,
      content: mapped.content,
      tags: mapped.tags,
      folderId: input.folderId !== undefined ? input.folderId : (existing.folderId ?? null),
      isPinned: mapped.isPinned,
      isArchived: mapped.isArchived,
      summary: mapped.summary ?? null,
      updatedAt: now,
    };
    await enqueueOutbox('notes', id, 'upsert', changes, nextVersion);
    return true;
  } catch (err: unknown) {
    console.error('[Queries:updateNote:Error]', err);
    return false;
  }
}

export async function deleteNote(id: string): Promise<boolean> {
  const now = new Date().toISOString();
  try {
    await db.update(notes).set({ deletedAt: now }).where(eq(notes.id, id));
    await enqueueOutbox('notes', id, 'delete', { deletedAt: now });
    return true;
  } catch (err: unknown) {
    console.error('[Queries:deleteNote:Error]', err);
    return false;
  }
}

export async function upsertNoteFromSync(n: Note): Promise<void> {
  const [existing] = await db
    .select({ updatedAt: notes.updatedAt })
    .from(notes)
    .where(eq(notes.id, n.id))
    .limit(1);

  if (!shouldApplySyncUpdate(existing?.updatedAt, n.updatedAt)) return;

  const setFields = {
    folderId: n.folderId ?? null,
    title: n.title ?? 'Untitled Note',
    content: n.content ?? '',
    tags: typeof n.tags === 'string' ? n.tags : JSON.stringify(n.tags ?? []),
    isPinned: Boolean(n.isPinned),
    isArchived: Boolean(n.isArchived),
    summary: n.summary ?? null,
    version: n.version ?? 1,
    updatedAt: n.updatedAt,
    deletedAt: n.deletedAt ?? null,
  };

  await db
    .insert(notes)
    .values({ id: n.id, createdAt: n.createdAt, ...setFields })
    .onConflictDoUpdate({ target: notes.id, set: setFields });
}
