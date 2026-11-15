import { db } from '@/db/client';
import { noteBlocks } from '@/db/schema';
import { eq, and, isNull, asc } from 'drizzle-orm';
import type { NoteBlock, MediaBlock, MediaItem } from '@repo/types';
import { enqueueOutbox } from '@/lib/sync/outbox';
import {
  unpackDesktopNoteBlock,
  packDesktopNoteBlockContent,
  toDesktopBlockOutboxPayload,
} from './block-codec';
import { cancelMediaUpload } from '@/lib/media/upload-service';
import { updateNote } from './notes';
import { shouldApplySyncUpdate } from './query-utils';

export async function listBlocksForNote(noteId: string): Promise<NoteBlock[]> {
  try {
    const rows = await db
      .select()
      .from(noteBlocks)
      .where(and(eq(noteBlocks.noteId, noteId), isNull(noteBlocks.deletedAt)))
      .orderBy(asc(noteBlocks.position));
    return rows.map(unpackDesktopNoteBlock);
  } catch (err: unknown) {
    console.error('[Queries:listBlocksForNote:Error]', err);
    return [];
  }
}

export function enforceSingleMediaBlockRule(blocks: NoteBlock[]): NoteBlock[] {
  const mediaBlocks = blocks.filter((b): b is MediaBlock => b.type === 'media');
  if (mediaBlocks.length <= 1) return blocks;

  const primaryMediaBlock = mediaBlocks[0];
  const seenIds = new Set<string>();
  const uniqueItems: MediaItem[] = [];

  for (const mb of mediaBlocks) {
    for (const item of mb.content || []) {
      const key = item.id ? `id:${item.id}` : (item.localUri ? `uri:${item.localUri}` : (item.url ? `url:${item.url}` : JSON.stringify(item)));
      if (!seenIds.has(key)) {
        seenIds.add(key);
        uniqueItems.push(item);
      }
    }
  }

  let seenFirstMedia = false;
  return blocks
    .filter((b) => {
      if (b.type !== 'media') return true;
      if (!seenFirstMedia) {
        seenFirstMedia = true;
        return true;
      }
      return false;
    })
    .map((b) =>
      b.id === primaryMediaBlock.id ? { ...primaryMediaBlock, content: uniqueItems } : b
    );
}

/**
 * Diff-aware persistence for note blocks:
 * - Soft-deletes removed blocks (cancelling orphaned media uploads).
 * - Preserves any already-reconciled cloud `url` on media items so stale editor state never overwrites it.
 * - Only writes/enqueues blocks whose content or position actually changed.
 */
export async function saveBlocksForNote(
  noteId: string,
  rawBlocks: NoteBlock[]
): Promise<NoteBlock[]> {
  const validatedBlocks = enforceSingleMediaBlockRule(rawBlocks);
  const now = new Date().toISOString();

  try {
    const existing = await listBlocksForNote(noteId);
    const existingMap = new Map(existing.map((b) => [b.id, b]));
    const incomingIds = new Set(validatedBlocks.map((b) => b.id));

    // Map any already-reconciled cloud URLs by media item ID across existing media blocks
    const existingMediaUrls = new Map<string, string>();
    for (const ex of existing) {
      if (ex.type === 'media') {
        for (const item of ex.content) {
          if (item.id && item.url) {
            existingMediaUrls.set(item.id, item.url);
          }
        }
      }
    }

    let hasChanges = false;

    for (const ex of existing) {
      if (!incomingIds.has(ex.id)) {
        hasChanges = true;
        if (ex.type === 'media') {
          for (const item of ex.content) {
            void cancelMediaUpload(item.id);
          }
        }
        await db
          .update(noteBlocks)
          .set({ deletedAt: now, updatedAt: now })
          .where(eq(noteBlocks.id, ex.id));
        await enqueueOutbox('note_blocks', ex.id, 'delete', {
          noteId: ex.noteId,
          deletedAt: now,
        });
      }
    }

    const result: NoteBlock[] = [];
    for (let pos = 0; pos < validatedBlocks.length; pos++) {
      let b = validatedBlocks[pos];

      // Preserve reconciled cloud URLs if in-memory block still has url: undefined
      if (b.type === 'media') {
        b = {
          ...b,
          content: b.content.map((item) => ({
            ...item,
            url: item.url ?? existingMediaUrls.get(item.id),
          })),
        };
      }

      const packedContent = packDesktopNoteBlockContent(b);
      const prev = existingMap.get(b.id);
      const isUnchanged =
        prev !== undefined &&
        prev.position === pos &&
        packDesktopNoteBlockContent(prev) === packedContent;

      if (isUnchanged) {
        result.push(prev);
        continue;
      }

      hasChanges = true;
      const setFields = {
        position: pos,
        content: packedContent,
        updatedAt: now,
        deletedAt: null,
      };

      await db
        .insert(noteBlocks)
        .values({
          id: b.id,
          noteId,
          type: b.type,
          createdAt: b.createdAt || now,
          ...setFields,
        })
        .onConflictDoUpdate({ target: noteBlocks.id, set: setFields });

      const updatedBlock: NoteBlock = { ...b, position: pos, updatedAt: now };
      await enqueueOutbox(
        'note_blocks',
        b.id,
        'upsert',
        toDesktopBlockOutboxPayload(updatedBlock)
      );
      result.push(updatedBlock);
    }

    if (hasChanges) {
      await updateNote(noteId, {});
    }

    return result;
  } catch (err: unknown) {
    console.error('[Queries:saveBlocksForNote:Error]', err);
    return validatedBlocks;
  }
}

export async function upsertBlockFromSync(b: NoteBlock): Promise<void> {
  try {
    const [existing] = await db
      .select({ updatedAt: noteBlocks.updatedAt })
      .from(noteBlocks)
      .where(eq(noteBlocks.id, b.id))
      .limit(1);

    if (!shouldApplySyncUpdate(existing?.updatedAt, b.updatedAt)) return;

    const setFields = {
      type: b.type,
      position: b.position,
      content: packDesktopNoteBlockContent(b),
      updatedAt: b.updatedAt,
      deletedAt: b.deletedAt ?? null,
    };

    await db
      .insert(noteBlocks)
      .values({ id: b.id, noteId: b.noteId, createdAt: b.createdAt, ...setFields })
      .onConflictDoUpdate({ target: noteBlocks.id, set: setFields });
  } catch (err: unknown) {
    console.error('[Queries:upsertBlockFromSync:Error]', err);
  }
}
