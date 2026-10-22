import type {
  BlockType,
  ListBlock,
  ListItem,
  ListType,
  MediaBlock,
  MediaItem,
  NoteBlock,
  TextBlock,
} from '@/lib/types/notes';
import type { BlockChanges } from '@repo/types';

const VALID_LIST_TYPES: readonly ListType[] = ['checkbox', 'bullet', 'ordered'];

function normalizeListType(value: unknown): ListType {
  if (typeof value === 'string' && (VALID_LIST_TYPES as readonly string[]).includes(value)) {
    return value as ListType;
  }
  return 'checkbox';
}

function parseJsonSafe(raw: unknown): unknown {
  if (typeof raw !== 'string') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Unpacks a raw database or sync block record into a strongly-typed NoteBlock.
 * Handles legacy array list payloads, structured list objects, and JSON strings.
 */
export function unpackNoteBlock(row: {
  id: string;
  noteId: string;
  type: string;
  position: number;
  content: unknown;
  listType?: unknown;
  header?: unknown;
  footer?: unknown;
  createdAt: string;
  updatedAt: string;
}): NoteBlock {
  const base = {
    id: row.id,
    noteId: row.noteId,
    position: row.position,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };

  if (row.type === 'list') {
    const parsed = parseJsonSafe(row.content);
    const isObj =
      parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed);
    const obj = isObj ? (parsed as Record<string, unknown>) : undefined;

    const items: ListItem[] = Array.isArray(parsed)
      ? (parsed as ListItem[])
      : Array.isArray(obj?.content)
        ? (obj.content as ListItem[])
        : [];

    const rawHeader = row.header !== undefined ? row.header : obj?.header;
    const rawFooter = row.footer !== undefined ? row.footer : obj?.footer;

    return {
      ...base,
      type: 'list',
      listType: normalizeListType(row.listType ?? obj?.listType),
      header: typeof rawHeader === 'string' ? rawHeader : undefined,
      footer: typeof rawFooter === 'string' ? rawFooter : undefined,
      content: items,
    } satisfies ListBlock;
  }

  if (row.type === 'media') {
    const parsed = parseJsonSafe(row.content);
    return {
      ...base,
      type: 'media',
      content: Array.isArray(parsed) ? (parsed as MediaItem[]) : [],
    } satisfies MediaBlock;
  }

  return {
    ...base,
    type: 'text',
    content: typeof row.content === 'string' ? row.content : '',
  } satisfies TextBlock;
}

/**
 * Serializes block content and metadata into a SQLite TEXT column string.
 */
export function serializeBlockContent(
  type: BlockType,
  content: unknown,
  meta?: {
    listType?: ListType | string;
    header?: string | null;
    footer?: string | null;
  }
): string {
  if (type === 'text') {
    return typeof content === 'string' ? content : '';
  }

  if (type === 'list') {
    const parsed = parseJsonSafe(content);
    const isObj =
      parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed);
    const obj = isObj ? (parsed as Record<string, unknown>) : undefined;

    const items = Array.isArray(parsed)
      ? parsed
      : Array.isArray(obj?.content)
        ? obj.content
        : [];

    const header =
      meta && 'header' in meta
        ? meta.header ?? undefined
        : typeof obj?.header === 'string'
          ? obj.header
          : undefined;

    const footer =
      meta && 'footer' in meta
        ? meta.footer ?? undefined
        : typeof obj?.footer === 'string'
          ? obj.footer
          : undefined;

    return JSON.stringify({
      listType: normalizeListType(meta?.listType ?? obj?.listType),
      ...(header !== undefined ? { header } : {}),
      ...(footer !== undefined ? { footer } : {}),
      content: items,
    });
  }

  if (type === 'media') {
    const parsed = parseJsonSafe(content);
    return JSON.stringify(Array.isArray(parsed) ? parsed : []);
  }

  return typeof content === 'string' ? content : JSON.stringify(content ?? {});
}

/**
 * Prepares a NoteBlock for the sync outbox payload, converting undefined list
 * header/footer to null so JSON serialization preserves explicit removals.
 */
export function toBlockOutboxPayload(block: NoteBlock): BlockChanges {
  if (block.type === 'list') {
    return {
      ...block,
      header: block.header ?? (null as unknown as string | undefined),
      footer: block.footer ?? (null as unknown as string | undefined),
    };
  }
  return block;
}

/**
 * Formats a note's legacy markdown content and structured blocks into a single
 * plain-text / markdown string for sharing and word/character count calculation.
 */
export function formatNoteWithBlocks(
  noteContent: string,
  blocks: NoteBlock[],
): string {
  const blockText = blocks
    .map((b) => {
      if (b.type === 'text') return b.content;
      if (b.type === 'list') {
        const lines = b.content.map((item, idx) => {
          if (b.listType === 'checkbox') {
            return `${item.checked ? '[x]' : '[ ]'} ${item.content}`;
          }
          if (b.listType === 'ordered') {
            return `${idx + 1}. ${item.content}`;
          }
          return `• ${item.content}`;
        });
        return [b.header, ...lines, b.footer].filter(Boolean).join('\n');
      }
      if (b.type === 'media') {
        return b.content
          .map((item) => item.caption || '')
          .filter(Boolean)
          .join('\n');
      }
      return '';
    })
    .filter(Boolean)
    .join('\n\n');

  return [noteContent, blockText].filter(Boolean).join('\n\n');
}
