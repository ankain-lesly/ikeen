import { tool } from 'ai';
import { z } from 'zod';
import type { PrismaService } from '../../../prisma/prisma.service';
import type { AblyService } from '../../ably/ably.service';

const baseContextSchema = z.object({
  userId: z.string(),
  conversationId: z.string(),
});

export function createFolderTools({
  prisma,
  ably,
}: {
  prisma: PrismaService;
  ably: AblyService;
}) {
  const listFolders = tool({
    description:
      'List all folders in the user workspace with their names, colors, icons, and note counts.',
    contextSchema: baseContextSchema,
    inputSchema: z.object({}),
    execute: async (_input, { context }) => {
      try {
        const folders = await prisma.folder.findMany({
          where: {
            userId: context.userId,
            deletedAt: null,
          },
          select: {
            id: true,
            name: true,
            color: true,
            icon: true,
            isLocked: true,
            _count: {
              select: {
                notes: {
                  where: { deletedAt: null },
                },
              },
            },
          },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        });

        return {
          ok: true,
          count: folders.length,
          folders: folders.map((f) => ({
            id: f.id,
            name: f.name,
            color: f.color,
            icon: f.icon,
            isLocked: f.isLocked,
            noteCount: f._count.notes,
          })),
        };
      } catch (err: unknown) {
        const error = err instanceof Error ? err.message : String(err);
        return { ok: false, error };
      }
    },
  });

  const organizeNote = tool({
    description:
      'Move a note into a specific folder or unassign it, and optionally adjust its tags.',
    contextSchema: baseContextSchema,
    inputSchema: z.object({
      noteId: z.string().describe('The UUID of the note to organize'),
      folderId: z
        .string()
        .nullable()
        .optional()
        .describe(
          'Target folder UUID, or null to remove from any folder',
        ),
      tags: z
        .array(z.string())
        .optional()
        .describe('Optional updated array of tags'),
    }),
    execute: async ({ noteId, folderId, tags }, { context }) => {
      try {
        const existingNote = await prisma.note.findFirst({
          where: {
            id: noteId,
            userId: context.userId,
            deletedAt: null,
          },
        });

        if (!existingNote) {
          return { ok: false, error: 'Note not found.' };
        }

        if (folderId) {
          const folderExists = await prisma.folder.findFirst({
            where: {
              id: folderId,
              userId: context.userId,
              deletedAt: null,
            },
          });
          if (!folderExists) {
            return { ok: false, error: 'Target folder does not exist.' };
          }
        }

        const note = await prisma.note.update({
          where: { id: noteId },
          data: {
            folderId: folderId === undefined ? existingNote.folderId : folderId,
            ...(tags !== undefined ? { tags } : {}),
            version: { increment: 1 },
          },
        });

        await ably.publishInvalidation(context.userId, ['notes']);

        return {
          ok: true,
          noteId: note.id,
          folderId: note.folderId,
          tags: note.tags,
        };
      } catch (err: unknown) {
        const error = err instanceof Error ? err.message : String(err);
        return { ok: false, error };
      }
    },
  });

  return {
    listFolders,
    organizeNote,
  };
}
