import { randomUUID } from 'node:crypto';
import type { BlockType, ListItem, ListType } from '@repo/types/notes';

const CHECKBOX_RE = /^\s*[-*•]?\s*\[([ xX])\]\s*(.*)$/;
const BULLET_RE = /^\s*[-*•]\s+(.*)$/;
const ORDERED_RE = /^\s*(\d+)[.)]\s+(.*)$/;

export interface ParsedBlockPayload {
  type: BlockType;
  header?: string;
  footer?: string;
  listType?: ListType;
  content: unknown;
}

export interface InputBlockMarkdown {
  type: 'text' | 'list';
  markdown: string;
  header?: string;
  footer?: string;
}

/**
 * Parses markdown intended for a list block into structured ListItems and determines listType.
 * Supports auto-extracting top-level headers and trailing footers (callouts, tips, notes, warnings).
 */
export function parseListMarkdown(
  markdown: string,
  fallbackHeader?: string,
  fallbackFooter?: string,
): {
  listType: ListType;
  header?: string;
  footer?: string;
  content: ListItem[];
} {
  const lines = markdown.split(/\r?\n/);
  const items: ListItem[] = [];
  const footerLines: string[] = [];
  let header: string | undefined = fallbackHeader?.trim() || undefined;
  let footer: string | undefined = fallbackFooter?.trim() || undefined;
  let detectedType: ListType | null = null;
  let inFooter = false;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    // Check if line is a markdown header (# Header or Header:)
    if (!header && items.length === 0 && (trimmed.startsWith('#') || trimmed.endsWith(':'))) {
      header = trimmed.replace(/^#+\s*/, '').replace(/:$/, '').trim();
      continue;
    }

    // If we've already entered a trailing footer section, accumulate remaining lines
    if (inFooter) {
      footerLines.push(trimmed);
      continue;
    }

    const checkboxMatch = rawLine.match(CHECKBOX_RE);
    if (checkboxMatch) {
      detectedType = detectedType || 'checkbox';
      items.push({
        id: randomUUID(),
        content: checkboxMatch[2].trim(),
        checked: checkboxMatch[1].toLowerCase() === 'x',
      });
      continue;
    }

    const orderedMatch = rawLine.match(ORDERED_RE);
    if (orderedMatch) {
      detectedType = detectedType || 'ordered';
      items.push({
        id: randomUUID(),
        content: orderedMatch[2].trim(),
      });
      continue;
    }

    const bulletMatch = rawLine.match(BULLET_RE);
    if (bulletMatch) {
      detectedType = detectedType || 'bullet';
      items.push({
        id: randomUUID(),
        content: bulletMatch[1].trim(),
      });
      continue;
    }

    // Trailing footer cue detection (blockquotes, horizontal dividers, or explicit Callout prefixes)
    if (
      items.length > 0 &&
      (trimmed.startsWith('>') ||
        trimmed.startsWith('---') ||
        /^(\*{1,2}|_{1,2})?(tip|note|warning|important|caution|info|timing|prep):/i.test(trimmed))
    ) {
      inFooter = true;
      footerLines.push(trimmed.replace(/^---\s*/, '').trim());
      continue;
    }

    // Line without marker - treat as item in the list or plain line
    items.push({
      id: randomUUID(),
      content: trimmed,
      checked: detectedType === 'checkbox' ? false : undefined,
    });
  }

  if (footerLines.length > 0 && !footer) {
    footer = footerLines.filter(Boolean).join('\n').trim();
  }

  return {
    listType: detectedType || 'checkbox',
    ...(header ? { header } : {}),
    ...(footer ? { footer } : {}),
    content: items,
  };
}

/**
 * Parses an input block markdown specification into the canonical JSON payload
 * ready for Prisma storage.
 */
export function parseBlockMarkdown(input: InputBlockMarkdown): ParsedBlockPayload {
  if (input.type === 'text') {
    return {
      type: 'text',
      content: input.markdown.trim(),
    };
  }

  const parsedList = parseListMarkdown(input.markdown, input.header, input.footer);
  return {
    type: 'list',
    listType: parsedList.listType,
    ...(parsedList.header ? { header: parsedList.header } : {}),
    ...(parsedList.footer ? { footer: parsedList.footer } : {}),
    content: {
      listType: parsedList.listType,
      ...(parsedList.header ? { header: parsedList.header } : {}),
      ...(parsedList.footer ? { footer: parsedList.footer } : {}),
      content: parsedList.content,
    },
  };
}

/**
 * Generates a unified text search projection across note.content and all note blocks.
 * Storing this in Note.content guarantees fast case-insensitive PostgreSQL search
 * without needing complex JSONB queries.
 */
export function projectBlocksToSearchText(
  baseContent: string | null | undefined,
  blocks: Array<{ type: string; content: unknown }>,
): string {
  const parts: string[] = [];

  const trimmedBase = (baseContent || '').trim();
  if (trimmedBase) {
    parts.push(trimmedBase);
  }

  for (const block of blocks) {
    if (block.type === 'text') {
      const text = typeof block.content === 'string' ? block.content.trim() : '';
      if (text) parts.push(text);
    } else if (block.type === 'list') {
      const listData =
        typeof block.content === 'object' && block.content !== null
          ? (block.content as Record<string, unknown>)
          : {};

      const header = typeof listData.header === 'string' ? listData.header.trim() : '';
      if (header) parts.push(header);

      const items = Array.isArray(listData.content)
        ? (listData.content as Array<{ content?: string; checked?: boolean }>)
        : Array.isArray(block.content)
          ? (block.content as Array<{ content?: string; checked?: boolean }>)
          : [];

      const listLines = items
        .map((item) => {
          if (!item?.content) return '';
          const prefix = item.checked !== undefined ? (item.checked ? '[x]' : '[ ]') : '•';
          return `${prefix} ${item.content}`;
        })
        .filter(Boolean);

      if (listLines.length > 0) {
        parts.push(listLines.join('\n'));
      }

      const footer = typeof listData.footer === 'string' ? listData.footer.trim() : '';
      if (footer) parts.push(footer);
    }
  }

  return parts.join('\n\n').trim();
}
