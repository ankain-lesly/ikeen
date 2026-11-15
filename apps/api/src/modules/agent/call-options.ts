import { z } from 'zod';

export const ikeenAgentCallOptionsSchema = z.object({
  userId: z.string().min(1),
  conversationId: z.string().min(1),
});

export type IkeenAgentCallOptions = z.infer<typeof ikeenAgentCallOptionsSchema>;

/**
 * Server-injected context for agent tools.
 * CONTRACT: userId and conversationId are always bound server-side from JWT auth;
 * tools must never ask the LLM for these values.
 */
export function ikeenToolContext(userId: string, conversationId: string) {
  const baseContext = { userId, conversationId };
  return {
    searchNotes: baseContext,
    getNoteDetails: baseContext,
    listRecentNotes: baseContext,
    createNote: baseContext,
    addBlock: baseContext,
    updateBlock: baseContext,
    deleteBlock: baseContext,
    attachImage: baseContext,
    generateImageKeen: baseContext,
    updateNote: baseContext,
    listFolders: baseContext,
    createFolder: baseContext,
    updateFolder: baseContext,
    organizeNote: baseContext,
    setReminder: baseContext,
    listReminders: baseContext,
    completeReminder: baseContext,
    cancelReminder: baseContext,
    pinNote: baseContext,
    archiveNote: baseContext,
    recordMemory: baseContext,
    summarizeKnowledge: baseContext,
    webSearch: baseContext,
    readWebPage: baseContext,
  };
}

/**
 * Optional id the model may omit, pass as null, or pass as "".
 * Stored calls treat all three as "not set" so Zod does not reject null.
 */
export const optionalId = z
  .union([z.string().min(1), z.null(), z.literal('')])
  .optional()
  .transform((value) => (value ? value : undefined));

/**
 * Optional field that the model may omit or pass as `null`.
 * Normalizes `null` to `undefined` while keeping the object property optional (`?:`).
 */
export function optionalNullable<T extends z.ZodTypeAny>(schema: T) {
  return schema
    .nullable()
    .transform((value) => value ?? undefined)
    .optional();
}

/**
 * Defaulted field that the model may omit or pass as `null`.
 * Normalizes `null | undefined` to `defaultValue`.
 */
export function defaultNullable<T extends z.ZodTypeAny>(
  schema: T,
  defaultValue: z.output<T>,
) {
  return schema.nullish().transform((value) => value ?? defaultValue);
}

export function toolFailure(
  message = 'Action failed or user permission denied',
  _code?: string,
): { ok: false; error: string } {
  return {
    ok: false,
    error: message,
  };
}
