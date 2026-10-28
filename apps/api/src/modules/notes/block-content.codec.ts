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
  name: z.string().optional(),
  url: z.string().optional(),
  caption: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const storedListContentSchema = z.object({
  listType: listTypeSchema.catch('checkbox'),
  header: z.string().nullish(),
  footer: z.string().nullish(),
  content: z.array(listItemSchema).catch([]),
});

export function parseStoredList(raw: unknown) {
  const parsed = storedListContentSchema.safeParse(
    Array.isArray(raw) ? { listType: 'checkbox', content: raw } : raw,
  );
  return parsed.success
    ? parsed.data
    : { listType: 'checkbox' as ListType, header: undefined, footer: undefined, content: [] };
}

function resolveOptionalText(
  explicit: string | null | undefined,
  fromObj: unknown,
  fallback: string | null | undefined,
): string | undefined {
  const candidate =
    explicit !== undefined ? explicit : fromObj !== undefined ? fromObj : fallback;
  return typeof candidate === 'string' ? candidate : undefined;
}

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
    return typeof existingContent === 'string' ? existingContent : '';
  }

  if (type === 'media') {
    if (Array.isArray(changes.content)) {
      const parsed = z.array(mediaItemSchema).safeParse(changes.content);
      return parsed.success ? parsed.data : changes.content;
    }
    return Array.isArray(existingContent) ? existingContent : [];
  }

  if (type === 'list') {
    const prev = parseStoredList(existingContent);
    const incomingRaw = changes.content;
    const incomingObj =
      incomingRaw !== null && typeof incomingRaw === 'object' && !Array.isArray(incomingRaw)
        ? (incomingRaw as Record<string, unknown>)
        : undefined;

    const rawItems = Array.isArray(incomingRaw)
      ? incomingRaw
      : Array.isArray(incomingObj?.content)
        ? incomingObj.content
        : prev.content;
    const validatedItems = z.array(listItemSchema).safeParse(rawItems);

    const rawListType =
      changes.listType ??
      (typeof incomingObj?.listType === 'string' ? incomingObj.listType : undefined) ??
      prev.listType;
    const parsedListType = listTypeSchema.safeParse(rawListType);

    const header = resolveOptionalText(changes.header, incomingObj?.header, prev.header);
    const footer = resolveOptionalText(changes.footer, incomingObj?.footer, prev.footer);

    return {
      listType: parsedListType.success ? parsedListType.data : 'checkbox',
      ...(header !== undefined ? { header } : {}),
      ...(footer !== undefined ? { footer } : {}),
      content: validatedItems.success ? validatedItems.data : prev.content,
    };
  }

  return changes.content ?? existingContent ?? {};
}

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
    const data = parseStoredList(row.content);
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
