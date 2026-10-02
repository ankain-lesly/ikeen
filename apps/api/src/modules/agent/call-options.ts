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
    updateNote: baseContext,
    listFolders: baseContext,
    createFolder: baseContext,
    updateFolder: baseContext,
    organizeNote: baseContext,
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

export function toolFailure(): { ok: false; error: string } {
  return {
    ok: false,
    error:
      'Could not complete this step. Fix the arguments and retry once, or continue without it.',
  };
}
