import { tool } from 'ai';
import { z } from 'zod';
import type { PrismaService } from '../../../prisma/prisma.service.js';
import { Prisma } from '../../../generated/prisma/client.js';

const baseContextSchema = z.object({
  userId: z.string(),
  conversationId: z.string(),
});

const CONTENT_SLICE = 3000;

export const summarizeKnowledgeInputSchema = z
  .object({
    folderId: z
      .string()
      .optional()
      .describe('Folder UUID to pull all notes from'),
    noteIds: z
      .array(z.string())
      .optional()
      .describe('Specific note UUIDs to synthesize'),
    focus: z
      .string()
      .optional()
      .describe(
        'Specific aspect to focus synthesis on (e.g. action items, timeline, decisions)',
      ),
  })
  .refine(
    (value) => Boolean(value.folderId) || (value.noteIds && value.noteIds.length > 0),
    {
      message: 'Provide folderId or a non-empty noteIds list.',
    },
  );

export function createSummaryTools({ prisma }: { prisma: PrismaService }) {
  const summarizeKnowledge = tool({
    description:
      'Load notes from a folder or a specific set of note IDs to analyze, cross-reference, and generate a synthesized summary or action checklist. Requires folderId or noteIds.',
    contextSchema: baseContextSchema,
    inputSchema: summarizeKnowledgeInputSchema,
    execute: async ({ folderId, noteIds, focus }, { context }) => {
      try {
        const whereClause: Prisma.NoteWhereInput = {
          userId: context.userId,
          deletedAt: null,
          isArchived: false,
        };

        if (noteIds && noteIds.length > 0) {
          whereClause.id = { in: noteIds };
        } else if (folderId) {
          whereClause.folderId = folderId;
        }

        const notes = await prisma.note.findMany({
          where: whereClause,
          select: {
            id: true,
            title: true,
            content: true,
            summary: true,
            tags: true,
            updatedAt: true,
          },
          take: 15,
          orderBy: { updatedAt: 'desc' },
        });

        if (notes.length === 0) {
          return { ok: false, error: 'No matching notes found to synthesize.' };
        }

        return {
          ok: true,
          focus: focus || 'General synthesis',
          notesCount: notes.length,
          notes: notes.map((n) => {
            const truncated = n.content.length > CONTENT_SLICE;
            return {
              id: n.id,
              title: n.title,
              tags: n.tags,
              content: truncated ? n.content.slice(0, CONTENT_SLICE) : n.content,
              truncated,
            };
          }),
        };
      } catch (err: unknown) {
        const error = err instanceof Error ? err.message : String(err);
        return { ok: false, error };
      }
    },
  });

  return {
    summarizeKnowledge,
  };
}
