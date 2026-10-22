import { z } from 'zod';
import type { BlockType, ListType, NoteBlock } from '@repo/types/notes';

export const listTypeSchema = z.enum(['checkbox', 'bullet', 'ordered']);

export const listItemSchema = z.object({
  id: z.string(),
  content: z.string(),
  checked: z.boolean().optional(),
});

export const mediaItemSchema = z.object({
  id: z.string(),
  mediaType: z.enum(['image', 'audio', 'file']),
  localUri: z.string(),
  url: z.string().optional(),
  caption: z.string().optional(),
  synced: z.boolean().default(false),
});

export const storedListContentSchema = z.object({
  listType: listTypeSchema.catch('checkbox'),
  header: z.string().nullish(),
  footer: z.string().nullish(),
  content: z.array(listItemSchema).catch([]),
});

/**
 * Packs incoming block mutation changes + existing stored JSON into the canonical
 * Prisma JSON value for `note_blocks.content`.
 *
 * Uses `null` in incoming DTO fields to represent explicit removal of `header`/`footer`,
 * avoiding reliance on `'key' in dto` (which is always true on ES2022+ DTO instances).
 */
export function packServerBlockContent(
  type: BlockType,
  changes: {
    content?: unknown;
    listType?: string;
    header?: string | null;
    footer?: string | null;
  },
  existingContent?: unknown,
): unknown {
  if (type === 'text') {
    if (typeof changes.content === 'string') return changes.content;
    if (typeof existingContent === 'string') return existingContent;
    return '';
  }

  if (type === 'media') {
    if (Array.isArray(changes.content)) {
      const parsed = z.array(mediaItemSchema).safeParse(changes.content);
      return parsed.success ? parsed.data : changes.content;
    }
    return Array.isArray(existingContent) ? existingContent : [];
  }

  if (type === 'list') {
    const prevParsed = storedListContentSchema.safeParse(
      Array.isArray(existingContent)
        ? { listType: 'checkbox', content: existingContent }
        : existingContent,
    );
    const prev = prevParsed.success
      ? prevParsed.data
      : { listType: 'checkbox' as ListType, header: undefined, footer: undefined, content: [] };

    const incomingRaw = changes.content;
    const incomingIsObj =
      incomingRaw !== null &&
      typeof incomingRaw === 'object' &&
      !Array.isArray(incomingRaw);
    const incomingObj = incomingIsObj
      ? (incomingRaw as Record<string, unknown>)
      : undefined;

    const rawItems = Array.isArray(incomingRaw)
      ? incomingRaw
      : Array.isArray(incomingObj?.content)
        ? incomingObj.content
        : prev.content;

    const validatedItems = z.array(listItemSchema).safeParse(rawItems);
    const items = validatedItems.success ? validatedItems.data : prev.content;

    const rawListType =
      changes.listType ??
      (typeof incomingObj?.listType === 'string' ? incomingObj.listType : undefined) ??
      prev.listType;
    const parsedListType = listTypeSchema.safeParse(rawListType);
    const listType: ListType = parsedListType.success ? parsedListType.data : 'checkbox';

    // Explicit `null` clears header/footer; `undefined` preserves existing
    const nextHeader =
      changes.header === null
        ? undefined
        : typeof changes.header === 'string'
          ? changes.header
          : incomingObj?.header === null
            ? undefined
            : typeof incomingObj?.header === 'string'
              ? incomingObj.header
              : prev.header ?? undefined;

    const nextFooter =
      changes.footer === null
        ? undefined
        : typeof changes.footer === 'string'
          ? changes.footer
          : incomingObj?.footer === null
            ? undefined
            : typeof incomingObj?.footer === 'string'
              ? incomingObj.footer
              : prev.footer ?? undefined;

    return {
      listType,
      ...(nextHeader !== undefined ? { header: nextHeader } : {}),
      ...(nextFooter !== undefined ? { footer: nextFooter } : {}),
      content: items,
    };
  }

  return changes.content ?? existingContent ?? {};
}

/**
 * Unpacks a Prisma `NoteBlock` row into the canonical `NoteBlock` DTO returned on `/sync/pull`.
 */
export function unpackServerNoteBlock(row: {
  id: string;
  noteId: string;
  type: string;
  position: number;
  content: unknown;
  createdAt: Date;
  updatedAt: Date;
}): NoteBlock {
  const base = {
    id: row.id,
    noteId: row.noteId,
    position: row.position,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };

  if (row.type === 'list') {
    const parsed = storedListContentSchema.safeParse(
      Array.isArray(row.content)
        ? { listType: 'checkbox', content: row.content }
        : row.content,
    );
    const data = parsed.success
      ? parsed.data
      : { listType: 'checkbox' as ListType, header: undefined, footer: undefined, content: [] };

    return {
      ...base,
      type: 'list',
      listType: data.listType,
      ...(typeof data.header === 'string' ? { header: data.header } : {}),
      ...(typeof data.footer === 'string' ? { footer: data.footer } : {}),
      content: data.content,
    };
  }

  if (row.type === 'media') {
    return {
      ...base,
      type: 'media',
      content: Array.isArray(row.content) ? row.content : [],
    };
  }

  return {
    ...base,
    type: 'text',
    content: typeof row.content === 'string' ? row.content : '',
  };
}
