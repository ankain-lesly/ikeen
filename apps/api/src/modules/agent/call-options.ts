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
  };
}
