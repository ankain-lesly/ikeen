import { useMemo } from "react";
import * as Crypto from "expo-crypto";
import { and, asc, eq, isNull } from "drizzle-orm";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";

import { db } from "@/db/client";
import { mediaSyncOutbox, noteBlocks, notes, type NoteBlockSelect } from "@/db/schema";
import type {
  CreateBlockInput,
  MediaItem,
  NoteBlock,
  UpdateBlockInput,
} from "@/lib/types/notes";
import { enqueueOutbox } from "@/lib/sync/outbox";
import {
  cacheRemoteMediaLocally,
  cancelMediaUpload,
  enqueueMediaUpload,
} from "@/lib/media/upload-service";
import {
  formatNoteWithBlocks,
  serializeBlockContent,
  toBlockOutboxPayload,
  unpackNoteBlock,
} from "./block-content.codec";
import { createNote, getNoteById } from "./notes";

export { formatNoteWithBlocks, serializeBlockContent };

export function rowToNoteBlock(row: NoteBlockSelect): NoteBlock {
  return unpackNoteBlock(row);
}

// ============================================================================
// Reactive Hooks
// ============================================================================

/**
 * Reactive hook: Automatically updates when blocks for a note change in SQLite.
 * Memoizes the mapped array so consumers do not re-render when SQLite rows are unchanged.
 */
export function useLiveNoteBlocks(noteId: string | undefined | null) {
  const query = noteId
    ? db
        .select()
        .from(noteBlocks)
        .where(and(eq(noteBlocks.noteId, noteId), isNull(noteBlocks.deletedAt)))
        .orderBy(asc(noteBlocks.position))
    : db
        .select()
        .from(noteBlocks)
        .where(eq(noteBlocks.noteId, "__none__"))
        .orderBy(asc(noteBlocks.position));

  const result = useLiveQuery(query, [noteId]);

  const blocks = useMemo<NoteBlock[]>(
    () => (result.data ?? []).map(rowToNoteBlock),
    [result.data],
  );

  return {
    ...result,
    data: blocks,
    isLoading: !result.updatedAt && blocks?.length === 0,
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
    .where(and(eq(noteBlocks.noteId, noteId), isNull(noteBlocks.deletedAt)))
    .orderBy(asc(noteBlocks.position));

  return rows.map(rowToNoteBlock);
}

/**
 * Touches the parent note's updatedAt timestamp in SQLite so Drizzle's live queries
 * and feed sortings immediately reflect block modifications across consumer screens.
 */
async function touchParentNote(noteId: string): Promise<void> {
  const now = new Date().toISOString();
  await db
    .update(notes)
    .set({ updatedAt: now })
    .where(eq(notes.id, noteId));
}

/**
 * Creates a discrete block under a note.
 * Enforces that the parent note exists in SQLite before inserting the block.
 */
export async function createBlock(
  noteId: string,
  input: CreateBlockInput,
): Promise<NoteBlock> {
  const existingNote = await getNoteById(noteId);
  if (!existingNote) {
    await createNote({ id: noteId });
  }

  const id = input.id ?? Crypto.randomUUID();
  const now = new Date().toISOString();

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

  // Centralized media enqueue: when a new media block is created, enqueue any local media items
  if (block.type === "media") {
    for (const item of block.content) {
      if (item.localUri && !item.url) {
        void enqueueMediaUpload({
          id: item.id,
          blockId: block.id,
          localUri: item.localUri,
        });
      }
    }
  }

  await enqueueOutbox("note_blocks", id, "upsert", toBlockOutboxPayload(block));
  await touchParentNote(noteId);

  return block;
}

/**
 * Updates a block's content, type, or position.
 */
export async function updateBlock(
  blockId: string,
  updates: UpdateBlockInput,
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
    "content" in updates ||
    "listType" in updates ||
    "header" in updates ||
    "footer" in updates
  ) {
    const existingBlock = rowToNoteBlock(existing);
    const currentContent =
      updates.content !== undefined ? updates.content : existingBlock.content;

    const currentMeta =
      existingBlock.type === "list" || nextType === "list"
        ? {
            listType:
              updates.listType ??
              (existingBlock.type === "list"
                ? existingBlock.listType
                : "checkbox"),
            header:
              "header" in updates
                ? updates.header
                : existingBlock.type === "list"
                  ? existingBlock.header
                  : undefined,
            footer:
              "footer" in updates
                ? updates.footer
                : existingBlock.type === "list"
                  ? existingBlock.footer
                  : undefined,
          }
        : undefined;

    nextRawContent = serializeBlockContent(
      nextType as "text" | "list" | "media",
      currentContent,
      currentMeta,
    );
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

  // Centralized media sync management: diff items when updating a media block
  if (
    (existing.type === "media" || nextType === "media") &&
    "content" in updates &&
    Array.isArray(updates.content)
  ) {
    const existingBlock = rowToNoteBlock(existing);
    const existingItems = (
      existingBlock.type === "media" ? existingBlock.content : []
    ) as MediaItem[];
    const incomingItems = updates.content as MediaItem[];

    const existingIds = new Set(existingItems.map((i) => i.id));
    const incomingIds = new Set(incomingItems.map((i) => i.id));

    // 1. Newly added items -> enqueue for upload
    for (const item of incomingItems) {
      if (!existingIds.has(item.id) && item.localUri && !item.url) {
        void enqueueMediaUpload({
          id: item.id,
          blockId,
          localUri: item.localUri,
        });
      }
    }

    // 2. Removed items -> cancel upload jobs
    for (const item of existingItems) {
      if (!incomingIds.has(item.id)) {
        void cancelMediaUpload(item.id);
      }
    }
  }

  await enqueueOutbox(
    "note_blocks",
    blockId,
    "upsert",
    toBlockOutboxPayload(block),
  );
  await touchParentNote(existing.noteId);

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

  const now = new Date().toISOString();
  await db.delete(noteBlocks).where(eq(noteBlocks.id, blockId));
  await db.delete(mediaSyncOutbox).where(eq(mediaSyncOutbox.blockId, blockId));

  await enqueueOutbox("note_blocks", blockId, "delete", {
    id: blockId,
    noteId: existing.noteId,
    deletedAt: now,
  });

  const remaining = await getNoteBlocks(existing.noteId);
  const reindexedBlocks: NoteBlock[] = [];

  for (let i = 0; i < remaining.length; i++) {
    if (remaining[i].position !== i) {
      await db
        .update(noteBlocks)
        .set({ position: i, updatedAt: now })
        .where(eq(noteBlocks.id, remaining[i].id));
      reindexedBlocks.push({
        ...remaining[i],
        position: i,
        updatedAt: now,
      });
    }
  }

  for (const reindexed of reindexedBlocks) {
    await enqueueOutbox(
      "note_blocks",
      reindexed.id,
      "upsert",
      toBlockOutboxPayload(reindexed),
    );
  }
  await touchParentNote(existing.noteId);
}

/**
 * Atomically reorders blocks given an ordered array of block IDs.
 */
export async function reorderBlocks(
  noteId: string,
  orderedBlockIds: string[],
): Promise<void> {
  const existingBlocks = await getNoteBlocks(noteId);
  const positionById = new Map(existingBlocks.map((b) => [b.id, b.position]));
  const now = new Date().toISOString();
  const changedBlocks: NoteBlock[] = [];

  for (let index = 0; index < orderedBlockIds.length; index++) {
    const blockId = orderedBlockIds[index];
    if (positionById.get(blockId) === index) continue;

    const [updated] = await db
      .update(noteBlocks)
      .set({ position: index, updatedAt: now })
      .where(and(eq(noteBlocks.id, blockId), eq(noteBlocks.noteId, noteId)))
      .returning();

    if (updated) {
      changedBlocks.push(rowToNoteBlock(updated));
    }
  }

  for (const block of changedBlocks) {
    await enqueueOutbox(
      "note_blocks",
      block.id,
      "upsert",
      toBlockOutboxPayload(block),
    );
  }

  if (changedBlocks.length > 0) {
    await touchParentNote(noteId);
  }
}

/**
 * Last-Write-Wins upsert for a block arriving from the server during a pull.
 * Skips the write if the locally-stored block is already newer than the server copy.
 */
export async function upsertBlockFromSync(block: NoteBlock): Promise<void> {
  const [existing] = await db
    .select({
      updatedAt: noteBlocks.updatedAt,
      content: noteBlocks.content,
      type: noteBlocks.type,
    })
    .from(noteBlocks)
    .where(eq(noteBlocks.id, block.id))
    .limit(1);

  if (existing && new Date(existing.updatedAt) > new Date(block.updatedAt)) {
    return;
  }

  // Handle block tombstone arriving from server sync (e.g., deleted by AI Agent or another client)
  if (block.deletedAt) {
    await db.delete(noteBlocks).where(eq(noteBlocks.id, block.id));
    await db.delete(mediaSyncOutbox).where(eq(mediaSyncOutbox.blockId, block.id));
    return;
  }

  const normalized = unpackNoteBlock(block);

  // If this is a media block, preserve any existing localUri already in local SQLite
  if (normalized.type === "media") {
    let localUriMap: Map<string, string> | undefined;
    if (existing && existing.type === "media") {
      try {
        const localItems = JSON.parse(existing.content || "[]");
        if (Array.isArray(localItems)) {
          localUriMap = new Map();
          for (const item of localItems) {
            if (item?.id && item?.localUri) {
              localUriMap.set(item.id, item.localUri);
            }
          }
        }
      } catch {
        // Ignore parse error
      }
    }

    normalized.content = normalized.content.map((incomingItem) => {
      const existingUri = localUriMap?.get(incomingItem.id);
      return existingUri
        ? { ...incomingItem, localUri: existingUri }
        : incomingItem;
    });

    // Background download for items that have cloud URL but no localUri on this device
    for (const item of normalized.content) {
      if (item.url && !item.localUri) {
        void cacheRemoteMediaLocally(item, normalized.id);
      }
    }
  }

  const rawContent = serializeBlockContent(
    normalized.type,
    normalized.content,
    normalized.type === "list"
      ? {
          listType: normalized.listType,
          header: normalized.header,
          footer: normalized.footer,
        }
      : undefined,
  );

  await db
    .insert(noteBlocks)
    .values({
      id: normalized.id,
      noteId: normalized.noteId,
      type: normalized.type,
      position: normalized.position,
      content: rawContent,
      createdAt: normalized.createdAt,
      updatedAt: normalized.updatedAt,
    })
    .onConflictDoUpdate({
      target: noteBlocks.id,
      set: {
        type: normalized.type,
        position: normalized.position,
        content: rawContent,
        updatedAt: normalized.updatedAt,
      },
    });
}
