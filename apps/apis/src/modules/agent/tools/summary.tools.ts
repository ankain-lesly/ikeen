import { tool } from 'ai';
import { z } from 'zod';
import type { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '@repo/db';

import { baseToolContextSchema, type BaseToolContext } from '../call-options';

export function createSummaryTools({ prisma }: { prisma: PrismaService }) {
  const summarizeKnowledge = tool({
    description:
      'Load multiple notes or an entire folder of notes to analyze, cross-reference, and generate a synthesized summary or action checklist.',
    contextSchema: baseToolContextSchema,
    inputSchema: z.object({
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
    }),
    execute: async ({ folderId, noteIds, focus }, { context }: { context: BaseToolContext }) => {
      try {
        const whereClause: Prisma.NoteWhereInput = {
          userId: context.userId,
          deletedAt: null,
        };

        if (folderId) whereClause.folderId = folderId;
        if (noteIds && noteIds.length > 0) whereClause.id = { in: noteIds };

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
          notes: notes.map((n) => ({
            id: n.id,
            title: n.title,
            tags: n.tags,
            content: n.content.slice(0, 3000), // Protect token budget
          })),
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
