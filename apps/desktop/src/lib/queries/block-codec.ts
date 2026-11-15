import type {
  ListBlock,
  ListItem,
  ListType,
  MediaBlock,
  MediaItem,
  NoteBlock,
  TextBlock,
} from '@repo/types';

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

export function unpackDesktopNoteBlock(row: {
  id: string;
  noteId: string;
  type: string;
  position: number;
  content: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}): NoteBlock {
  const base = {
    id: row.id,
    noteId: row.noteId,
    position: row.position,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt ?? null,
  };

  if (row.type === 'list') {
    const parsed = parseJsonSafe(row.content);
    const obj =
      parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : undefined;

    const items: ListItem[] = Array.isArray(parsed)
      ? (parsed as ListItem[])
      : Array.isArray(obj?.content)
      ? (obj.content as ListItem[])
      : [];

    return {
      ...base,
      type: 'list',
      listType: normalizeListType(obj?.listType),
      ...(typeof obj?.header === 'string' ? { header: obj.header } : {}),
      ...(typeof obj?.footer === 'string' ? { footer: obj.footer } : {}),
      content: items,
    } satisfies ListBlock;
  }

  if (row.type === 'media') {
    const parsed = parseJsonSafe(row.content);
    const rawItems: MediaItem[] = Array.isArray(parsed) ? (parsed as MediaItem[]) : [];
    // Sanitize any legacy base64 strings
    const sanitizedItems: MediaItem[] = rawItems.map((item) => {
      if (item.url && item.url.startsWith('data:')) {
        const { url: _stripped, ...rest } = item;
        return rest as MediaItem;
      }
      return item;
    });

    return {
      ...base,
      type: 'media',
      content: sanitizedItems,
    } satisfies MediaBlock;
  }

  return {
    ...base,
    type: 'text',
    content: typeof row.content === 'string' ? row.content : '',
  } satisfies TextBlock;
}

export function toDesktopBlockOutboxPayload(block: NoteBlock): Record<string, unknown> {
  if (block.type === 'list') {
    return {
      noteId: block.noteId,
      type: block.type,
      listType: block.listType,
      position: block.position,
      header: block.header ?? null,
      footer: block.footer ?? null,
      content: block.content,
      updatedAt: block.updatedAt,
    };
  }

  if (block.type === 'media') {
    // Sanitize payload: strip device-specific localUri and forbid any base64 URLs
    const sanitizedContent = (block.content || []).map(({ localUri: _localUri, ...rest }) => {
      if (rest.url && rest.url.startsWith('data:')) {
        const { url: _url, ...cleanItem } = rest;
        return cleanItem;
      }
      return rest;
    });

    return {
      noteId: block.noteId,
      type: block.type,
      position: block.position,
      content: sanitizedContent,
      updatedAt: block.updatedAt,
    };
  }

  return {
    noteId: block.noteId,
    type: block.type,
    position: block.position,
    content: block.content,
    updatedAt: block.updatedAt,
  };
}

export function packDesktopNoteBlockContent(block: NoteBlock): string {
  if (block.type === 'text') {
    return block.content;
  }
  if (block.type === 'list') {
    return JSON.stringify({
      listType: block.listType,
      header: block.header,
      footer: block.footer,
      content: block.content,
    });
  }
  if (block.type === 'media') {
    return JSON.stringify(block.content);
  }
  return '';
}
