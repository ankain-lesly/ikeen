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
  header?: string | null;
  footer?: string | null;
}

/**
 * Parses markdown intended for a list block into structured ListItems and determines listType.
 * Supports auto-extracting top-level headers and trailing footers (callouts, tips, notes, warnings).
 */
export function parseListMarkdown(
  markdown: string,
  fallbackHeader?: string | null,
  fallbackFooter?: string | null,
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
