import type { UIMessage } from 'ai';
import type { Prisma } from '../../generated/prisma/client.js';

const MAX_PARTS_JSON_CHARS = 200_000;

export type ChatMessageRow = {
  id: string;
  role: string;
  content: string;
  parts?: unknown | null;
  sequence: number;
  createdAt: Date;
};

function isPartLike(value: unknown): value is UIMessage['parts'][number] {
  return Boolean(
    value &&
      typeof value === 'object' &&
      'type' in value &&
      typeof (value as { type: unknown }).type === 'string',
  );
}

/**
 * AI SDK v7 still emits `rawInput` on output-error tool parts.
 * Replay and persistence must use `input` so the deprecation warning does not repeat.
 */
export function normalizeMessageParts(
  parts: UIMessage['parts'],
): UIMessage['parts'] {
  return parts.map((part) => {
    if (!part || typeof part !== 'object' || !('rawInput' in part)) {
      return part;
    }
    const record = part as UIMessage['parts'][number] & {
      rawInput?: unknown;
      input?: unknown;
    };
    const { rawInput, ...rest } = record;
    return {
      ...rest,
      input: record.input ?? rawInput,
    } as UIMessage['parts'][number];
  });
}

export function normalizeUiMessages(messages: UIMessage[]): UIMessage[] {
  return messages.map((message) => ({
    ...message,
    parts: normalizeMessageParts(message.parts ?? []),
  }));
}

/**
 * Keeps the latest user turn as plain text.
 * Client tool or assistant parts are not trusted as model history.
 */
export function latestUserTextMessage(
  messages: UIMessage[],
): UIMessage | undefined {
  const lastUser = [...messages].reverse().find((message) => message.role === 'user');
  if (!lastUser) return undefined;

  const text = textFromMessage(lastUser);
  if (!text) return undefined;

  return {
    id: lastUser.id,
    role: 'user',
    parts: [{ type: 'text', text }],
  };
}

/** Extracts concatenated plain text from an AI SDK UIMessage. */
export function textFromMessage(message: UIMessage): string {
  if (!Array.isArray(message.parts)) return '';
  return message.parts
    .filter((part): part is { type: 'text'; text: string } => part?.type === 'text')
    .map((part) => part.text)
    .join('\n')
    .trim();
}

/**
 * Converts a persisted database row to an AI SDK UIMessage shape.
 * Ensures tools UI, citations, and content rehydrate cleanly.
 */
export function uiMessageFromRow(row: ChatMessageRow): UIMessage {
  const stored: UIMessage['parts'] = Array.isArray(row.parts)
    ? (row.parts.filter(isPartLike) as UIMessage['parts'])
    : [];

  const parts: UIMessage['parts'] = normalizeMessageParts(
    stored.length > 0
      ? stored
      : row.content.trim()
        ? [{ type: 'text', text: row.content }]
        : [],
  );

  return {
    id: row.id,
    role: row.role as UIMessage['role'],
    parts,
  };
}

/**
 * Converts an array of rows to valid UIMessages.
 */
export function uiMessagesFromRows(rows: ChatMessageRow[]): UIMessage[] {
  return rows.map(uiMessageFromRow).filter((message) => message.parts.length > 0);
}

/**
 * Prepares UIMessage parts for database JSON serialization safely.
 */
export function persistableParts(message: UIMessage): Prisma.InputJsonValue {
  try {
    const serialized = JSON.stringify(
      normalizeMessageParts(message.parts || []),
    );
    if (serialized.length > MAX_PARTS_JSON_CHARS) {
      const text = textFromMessage(message);
      return text ? [{ type: 'text', text }] : [];
    }
    return JSON.parse(serialized);
  } catch {
    const text = textFromMessage(message);
    return text ? [{ type: 'text', text }] : [];
  }
}
