import type { UIMessage } from 'ai';

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
 * Extracts concatenated plain text from an AI SDK UIMessage.
 */
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

  const parts: UIMessage['parts'] =
    stored.length > 0
      ? stored
      : row.content.trim()
        ? [{ type: 'text', text: row.content }]
        : [];

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

export type PersistableJsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: PersistableJsonValue }
  | PersistableJsonValue[];

export type PersistableJson = PersistableJsonValue[];

/**
 * Prepares UIMessage parts for database JSON serialization safely.
 */
export function persistableParts(message: UIMessage): PersistableJson {
  try {
    const serialized = JSON.stringify(message.parts || []);
    if (serialized.length > MAX_PARTS_JSON_CHARS) {
      const text = textFromMessage(message);
      return text ? [{ type: 'text', text }] : [];
    }
    return JSON.parse(serialized) as PersistableJson;
  } catch {
    const text = textFromMessage(message);
    return text ? [{ type: 'text', text }] : [];
  }
}
