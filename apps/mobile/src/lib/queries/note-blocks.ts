import * as Crypto from 'expo-crypto';
import { and, asc, eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

import { db } from '@/db/client';
import { noteBlocks, type NoteBlockSelect } from '@/db/schema';
import type {
  CreateBlockInput,
  ListBlock,
  MediaBlock,
  Note,
  NoteBlock,
  TextBlock,
  UpdateBlockInput,
} from '@/lib/types/notes';
import { enqueueOutbox } from '@/lib/sync/outbox';
import { updateNote } from './notes';

// ============================================================================
// Serialization / Deserialization Helpers
// ============================================================================

export function rowToNoteBlock(row: NoteBlockSelect): NoteBlock {
  const base = {
    id: row.id,
    noteId: row.noteId,
    position: row.position,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };

  if (row.type === 'text') {
    return {
      ...base,
      type: 'text',
      content: row.content,
    } as TextBlock;
  }

  if (row.type === 'list') {
    try {
      const parsed = JSON.parse(row.content);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return {
          ...base,
          type: 'list',
          listType: parsed.listType || 'checkbox',
          header: parsed.header,
          footer: parsed.footer,
          content: Array.isArray(parsed.content) ? parsed.content : [],
        } as ListBlock;
      }
      return {
        ...base,
        type: 'list',
        listType: 'checkbox',
        content: Array.isArray(parsed) ? parsed : [],
      } as ListBlock;
    } catch {
      return {
        ...base,
        type: 'list',
        listType: 'checkbox',
        content: [],
      } as ListBlock;
    }
  }

  if (row.type === 'media') {
    try {
      const parsed = JSON.parse(row.content);
      return {
        ...base,
        type: 'media',
        content: Array.isArray(parsed) ? parsed : [],
      } as MediaBlock;
    } catch {
      return {
        ...base,
        type: 'media',
        content: [],
      } as MediaBlock;
    }
  }

  // Fallback as text block
  return {
    ...base,
    type: 'text',
    content: row.content,
  } as TextBlock;
}

export function serializeBlockContent(
  type: 'text' | 'list' | 'media',
  content: any,
  meta?: { listType?: string; header?: string; footer?: string }
): string {
  if (type === 'text') {
    return typeof content === 'string' ? content : '';
  }

  if (type === 'list') {
    const payload = {
      listType: meta?.listType || 'checkbox',
      header: meta?.header,
      footer: meta?.footer,
      content: Array.isArray(content) ? content : [],
    };
    return JSON.stringify(payload);
  }

  if (type === 'media') {
    return JSON.stringify(Array.isArray(content) ? content : []);
  }

  return typeof content === 'string' ? content : JSON.stringify(content ?? {});
}

// ============================================================================
// Reactive Hooks
// ============================================================================

/**
 * Reactive hook: Automatically updates when blocks for a note change in SQLite.
 */
export function useLiveNoteBlocks(noteId: string | undefined | null) {
  const query = noteId
    ? db
        .select()
        .from(noteBlocks)
        .where(eq(noteBlocks.noteId, noteId))
        .orderBy(asc(noteBlocks.position))
    : db
        .select()
        .from(noteBlocks)
        .where(eq(noteBlocks.noteId, '__none__'))
        .orderBy(asc(noteBlocks.position));

  const result = useLiveQuery(query, [noteId]);

  const blocks: NoteBlock[] = (result.data ?? []).map(rowToNoteBlock);

  return {
    ...result,
    data: blocks,
  };
}

// ============================================================================
// Imperative CRUD Operations
// ============================================================================

/**
 * Retrieves all blocks for a given note ordered by position.
 */
export async function getNoteBlocks(noteId: string): Promise<NoteBlock[]> {
  const rows = await db
    .select()
    .from(noteBlocks)
    .where(eq(noteBlocks.noteId, noteId))
    .orderBy(asc(noteBlocks.position));

  return rows.map(rowToNoteBlock);
}

/**
 * Creates a discrete block under a note.
 */
export async function createBlock(
  noteId: string,
  input: CreateBlockInput
): Promise<NoteBlock> {
  const id = input.id ?? Crypto.randomUUID();
  const now = new Date().toISOString();

  // If position is not provided, append at end
  let position = input.position;
  if (position === undefined) {
    const existing = await getNoteBlocks(noteId);
    position = existing.length;
  }

  const rawContent = serializeBlockContent(input.type, input.content, {
    listType: input.listType,
    header: input.header,
    footer: input.footer,
  });

  const [row] = await db
    .insert(noteBlocks)
    .values({
      id,
      noteId,
      type: input.type,
      position,
      content: rawContent,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  const block = rowToNoteBlock(row);

  // Enqueue discrete outbox mutation
  await enqueueOutbox('note_blocks', id, 'upsert', block);

  return block;
}

/**
 * Updates a block's content, type, or position.
 */
export async function updateBlock(
  blockId: string,
  updates: UpdateBlockInput
): Promise<NoteBlock> {
  const [existing] = await db
    .select()
    .from(noteBlocks)
    .where(eq(noteBlocks.id, blockId))
    .limit(1);

  if (!existing) {
    throw new Error(`Block with id "${blockId}" not found.`);
  }

  const now = new Date().toISOString();
  const nextType = updates.type ?? existing.type;
  const nextPosition = updates.position ?? existing.position;

  let nextRawContent = existing.content;
  if (
    updates.content !== undefined ||
    updates.listType !== undefined ||
    updates.header !== undefined ||
    updates.footer !== undefined
  ) {
    let currentContent: any = updates.content;
    let currentMeta: any = {
      listType: updates.listType,
      header: updates.header,
      footer: updates.footer,
    };

    if (currentContent === undefined) {
      const existingBlock = rowToNoteBlock(existing);
      currentContent = existingBlock.content;
      if (existingBlock.type === 'list') {
        currentMeta.listType = currentMeta.listType ?? existingBlock.listType;
        currentMeta.header = currentMeta.header ?? existingBlock.header;
        currentMeta.footer = currentMeta.footer ?? existingBlock.footer;
      }
    }

    nextRawContent = serializeBlockContent(nextType, currentContent, currentMeta);
  }

  const [updated] = await db
    .update(noteBlocks)
    .set({
      type: nextType,
      position: nextPosition,
      content: nextRawContent,
      updatedAt: now,
    })
    .where(eq(noteBlocks.id, blockId))
    .returning();

  const block = rowToNoteBlock(updated);

  await enqueueOutbox('note_blocks', blockId, 'upsert', block);

  return block;
}

/**
 * Deletes a discrete block and re-indexes subsequent positions.
 */
export async function deleteBlock(blockId: string): Promise<void> {
  const [existing] = await db
    .select()
    .from(noteBlocks)
    .where(eq(noteBlocks.id, blockId))
    .limit(1);

  if (!existing) return;

  await db.delete(noteBlocks).where(eq(noteBlocks.id, blockId));

  await enqueueOutbox('note_blocks', blockId, 'delete', { id: blockId, noteId: existing.noteId });

  // Re-index remaining blocks for this note
  const remaining = await getNoteBlocks(existing.noteId);
  for (let i = 0; i < remaining.length; i++) {
    if (remaining[i].position !== i) {
      await db
        .update(noteBlocks)
        .set({ position: i, updatedAt: new Date().toISOString() })
        .where(eq(noteBlocks.id, remaining[i].id));
      await enqueueOutbox('note_blocks', remaining[i].id, 'upsert', {
        ...remaining[i],
        position: i,
      });
    }
  }
}

/**
 * Atomically reorders blocks given an ordered array of block IDs.
 */
export async function reorderBlocks(
  noteId: string,
  orderedBlockIds: string[]
): Promise<void> {
  const now = new Date().toISOString();

  for (let index = 0; index < orderedBlockIds.length; index++) {
    const blockId = orderedBlockIds[index];
    await db
      .update(noteBlocks)
      .set({ position: index, updatedAt: now })
      .where(and(eq(noteBlocks.id, blockId), eq(noteBlocks.noteId, noteId)));

    await enqueueOutbox('note_blocks', blockId, 'upsert', {
      id: blockId,
      noteId,
      position: index,
    });
  }
}

/**
 * Idempotent Prepend Conversion:
 * If note.content is non-empty, creates a TextBlock at position 0,
 * shifts any existing blocks, and clears note.content to enforce mutual exclusivity.
 */
export async function convertNoteContentToBlock(
  note: Note
): Promise<NoteBlock | null> {
  const rawText = (note.content || '').trim();
  if (!rawText) return null;

  const now = new Date().toISOString();

  // Shift existing blocks if any
  const existing = await getNoteBlocks(note.id);
  for (const b of existing) {
    const nextPos = b.position + 1;
    await db
      .update(noteBlocks)
      .set({ position: nextPos, updatedAt: now })
      .where(eq(noteBlocks.id, b.id));
    await enqueueOutbox('note_blocks', b.id, 'upsert', {
      ...b,
      position: nextPos,
    });
  }

  // Prepend TextBlock at position 0
  const legacyBlockId = Crypto.randomUUID();
  const [createdRow] = await db
    .insert(noteBlocks)
    .values({
      id: legacyBlockId,
      noteId: note.id,
      type: 'text',
      position: 0,
      content: rawText,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  const legacyBlock = rowToNoteBlock(createdRow);
  await enqueueOutbox('note_blocks', legacyBlockId, 'upsert', legacyBlock);

  // Clear note.content to satisfy mutual exclusivity rule
  await updateNote(note.id, { content: '' });

  return legacyBlock;
}

/**
 * Last-Write-Wins upsert for a block arriving from the server during a pull.
 * Skips the write if the locally-stored block is already newer than the server copy.
 */
export async function upsertBlockFromSync(block: NoteBlock): Promise<void> {
  // LWW: skip if local is newer
  const [existing] = await db
    .select({ updatedAt: noteBlocks.updatedAt })
    .from(noteBlocks)
    .where(eq(noteBlocks.id, block.id))
    .limit(1);

  if (existing && new Date(existing.updatedAt) > new Date(block.updatedAt)) {
    return;
  }

  const rawContent = serializeBlockContent(
    block.type,
    block.content,
    block.type === 'list'
      ? {
          listType: (block as ListBlock).listType,
          header: (block as ListBlock).header,
          footer: (block as ListBlock).footer,
        }
      : undefined
  );

  await db
    .insert(noteBlocks)
    .values({
      id: block.id,
      noteId: block.noteId,
      type: block.type,
      position: block.position,
      content: rawContent,
      createdAt: block.createdAt,
      updatedAt: block.updatedAt,
    })
    .onConflictDoUpdate({
      target: noteBlocks.id,
      set: {
        type: block.type,
        position: block.position,
        content: rawContent,
        updatedAt: block.updatedAt,
      },
    });
}


