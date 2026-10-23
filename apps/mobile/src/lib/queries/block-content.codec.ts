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
  return typeof value === 'string' && (VALID_LIST_TYPES as readonly string[]).includes(value)
    ? (value as ListType)
    : 'checkbox';
}

function parseJsonSafe(raw: unknown): unknown {
  if (typeof raw !== 'string') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function extractListFields(
  rawContent: unknown,
  meta?: { listType?: unknown; header?: unknown; footer?: unknown },
): { listType: ListType; header?: string; footer?: string; content: ListItem[] } {
  const parsed = parseJsonSafe(rawContent);
  const obj =
    parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : undefined;

  const content: ListItem[] = Array.isArray(parsed)
    ? (parsed as ListItem[])
    : Array.isArray(obj?.content)
      ? (obj.content as ListItem[])
      : [];

  const rawHeader = meta && 'header' in meta ? meta.header : obj?.header;
  const rawFooter = meta && 'footer' in meta ? meta.footer : obj?.footer;

  return {
    listType: normalizeListType(meta?.listType ?? obj?.listType),
    ...(typeof rawHeader === 'string' ? { header: rawHeader } : {}),
    ...(typeof rawFooter === 'string' ? { footer: rawFooter } : {}),
    content,
  };
}

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
    const meta: { listType?: unknown; header?: unknown; footer?: unknown } = {};
    if (row.listType !== undefined) meta.listType = row.listType;
    if (row.header !== undefined) meta.header = row.header;
    if (row.footer !== undefined) meta.footer = row.footer;
    return {
      ...base,
      type: 'list',
      ...extractListFields(row.content, meta),
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

export function serializeBlockContent(
  type: BlockType,
  content: unknown,
  meta?: { listType?: ListType | string; header?: string | null; footer?: string | null },
): string {
  if (type === 'text') return typeof content === 'string' ? content : '';
  if (type === 'list') return JSON.stringify(extractListFields(content, meta));
  if (type === 'media') {
    const parsed = parseJsonSafe(content);
    return JSON.stringify(Array.isArray(parsed) ? parsed : []);
  }
  return typeof content === 'string' ? content : JSON.stringify(content ?? {});
}

export function toBlockOutboxPayload(block: NoteBlock): BlockChanges {
  if (block.type !== 'list') return block;
  return {
    ...block,
    header: block.header ?? (null as unknown as string | undefined),
    footer: block.footer ?? (null as unknown as string | undefined),
  };
}

export function formatNoteWithBlocks(noteContent: string, blocks: NoteBlock[]): string {
  const blockText = blocks
    .map((b) => {
      if (b.type === 'text') return b.content;
      if (b.type === 'list') {
        const lines = b.content.map((item, idx) =>
          b.listType === 'checkbox'
            ? `${item.checked ? '[x]' : '[ ]'} ${item.content}`
            : b.listType === 'ordered'
              ? `${idx + 1}. ${item.content}`
              : `• ${item.content}`,
        );
        return [b.header, ...lines, b.footer].filter(Boolean).join('\n');
      }
      if (b.type === 'media') {
        return b.content.map((i) => i.caption || '').filter(Boolean).join('\n');
      }
      return '';
    })
    .filter(Boolean)
    .join('\n\n');

  return [noteContent, blockText].filter(Boolean).join('\n\n');
}
