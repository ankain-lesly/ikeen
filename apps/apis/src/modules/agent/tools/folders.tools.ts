import { tool } from 'ai';
import { z } from 'zod';
import type { PrismaService } from '../../../prisma/prisma.service';
import type { AblyService } from '../../ably/ably.service';

import { baseToolContextSchema, type BaseToolContext } from '../call-options';

export function createFolderTools({
  prisma,
}: {
  prisma: PrismaService;
  ably?: AblyService;
}) {
  const listFolders = tool({
    description:
      'List all folders in the user workspace with their names, colors, icons, and note counts. Optionally filter by name query.',
    contextSchema: baseToolContextSchema,
    inputSchema: z.object({
      query: z
        .string()
        .optional()
        .describe('Optional search query to filter folders by name'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(50)
        .default(30)
        .describe('Maximum number of folders to return'),
    }),
    execute: async ({ query, limit }, { context }: { context: BaseToolContext }) => {
      try {
        const trimmedQuery = query?.trim();

        const folders = await prisma.folder.findMany({
          where: {
            userId: context.userId,
            deletedAt: null,
            ...(trimmedQuery
              ? { name: { contains: trimmedQuery, mode: 'insensitive' } }
              : {}),
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
          take: limit ?? 30,
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

  const createFolder = tool({
    description:
      'Create a new folder in the user workspace with a name, optional hex color, and icon. Use ONLY when the user explicitly requests creating a folder.',
    contextSchema: baseToolContextSchema,
    inputSchema: z.object({
      name: z
        .string()
        .trim()
        .min(1)
        .max(100)
        .describe('Name of the new folder'),
      color: z
        .string()
        .default('#3b82f6')
        .describe(
          'Hex color code for the folder (e.g. #3b82f6, #10b981, #f59e0b, #8b5cf6, #ef4444)',
        ),
      icon: z
        .string()
        .default('folder')
        .describe(
          'Icon identifier for the folder, e.g. folder, briefcase, book, lightbulb, code, heart, star',
        ),
    }),
    execute: async ({ name, color, icon }, { context }: { context: BaseToolContext }) => {
      try {
        const trimmedName = name.trim();
        // Check for existing folder with same name to prevent redundant duplicates
        const existing = await prisma.folder.findFirst({
          where: {
            userId: context.userId,
            name: { equals: trimmedName, mode: 'insensitive' },
            deletedAt: null,
          },
        });

        if (existing) {
          return {
            ok: true,
            folder: {
              id: existing.id,
              name: existing.name,
              color: existing.color,
              icon: existing.icon,
            },
            folderId: existing.id,
            name: existing.name,
            alreadyExisted: true,
          };
        }

        const folder = await prisma.folder.create({
          data: {
            userId: context.userId,
            name: trimmedName,
            color,
            icon,
            version: 1,
          },
        });

        return {
          ok: true,
          folder: {
            id: folder.id,
            name: folder.name,
            color: folder.color,
            icon: folder.icon,
          },
          folderId: folder.id,
          name: folder.name,
        };
      } catch (err: unknown) {
        const error = err instanceof Error ? err.message : String(err);
        return { ok: false, error };
      }
    },
  });

  const updateFolder = tool({
    description:
      'Update an existing folder (rename, change color, update icon, or adjust sort order).',
    contextSchema: baseToolContextSchema,
    inputSchema: z.object({
      folderId: z.string().describe('The UUID of the folder to update'),
      name: z
        .string()
        .trim()
        .min(1)
        .max(100)
        .optional()
        .describe('New name for the folder'),
      color: z
        .string()
        .regex(
          /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/,
          'Must be a valid hex color code',
        )
        .optional()
        .describe('New hex color code for the folder (e.g. #3b82f6)'),
      icon: z
        .string()
        .optional()
        .describe(
          'New icon identifier for the folder (e.g. folder, briefcase, book, lightbulb, code)',
        ),
      sortOrder: z
        .number()
        .int()
        .optional()
        .describe('Sort order index for ordering folders in the UI'),
    }),
    execute: async (
      { folderId, name, color, icon, sortOrder },
      { context }: { context: BaseToolContext },
    ) => {
      try {
        const existing = await prisma.folder.findFirst({
          where: {
            id: folderId,
            userId: context.userId,
            deletedAt: null,
          },
        });

        if (!existing) {
          return { ok: false, error: 'Folder not found.' };
        }

        const updated = await prisma.folder.update({
          where: { id: folderId },
          data: {
            ...(name ? { name: name.trim() } : {}),
            ...(color ? { color } : {}),
            ...(icon ? { icon } : {}),
            ...(sortOrder !== undefined ? { sortOrder } : {}),
            version: { increment: 1 },
          },
          select: {
            id: true,
            name: true,
            color: true,
            icon: true,
            sortOrder: true,
          },
        });

        return {
          ok: true,
          folder: updated,
          folderId: updated.id,
          name: updated.name,
        };
      } catch (err: unknown) {
        const error = err instanceof Error ? err.message : String(err);
        return { ok: false, error };
      }
    },
  });

  const organizeNote = tool({
    description:
      'Move a note into a specific folder or unassign it, and optionally adjust its tags. Rely strictly on folderId.',
    contextSchema: baseToolContextSchema,
    inputSchema: z.object({
      noteId: z.string().describe('The UUID of the note to organize'),
      folderId: z
        .string()
        .nullable()
        .optional()
        .describe(
          'Target folder UUID (from listFolders), or null to remove note from any folder',
        ),
      tags: z
        .array(z.string())
        .optional()
        .describe('Optional updated array of tags'),
    }),
    execute: async ({ noteId, folderId, tags }, { context }: { context: BaseToolContext }) => {
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

        let folderName: string | null = null;
        if (folderId) {
          const folderExists = await prisma.folder.findFirst({
            where: {
              id: folderId,
              userId: context.userId,
              deletedAt: null,
            },
            select: { id: true, name: true },
          });
          if (!folderExists) {
            return { ok: false, error: 'Target folder does not exist.' };
          }
          folderName = folderExists.name;
        }

        const note = await prisma.note.update({
          where: { id: noteId },
          data: {
            folderId: folderId === undefined ? existingNote.folderId : folderId,
            ...(tags !== undefined ? { tags } : {}),
            version: { increment: 1 },
          },
          select: {
            id: true,
            title: true,
            folderId: true,
            tags: true,
            folder: {
              select: { id: true, name: true },
            },
          },
        });

        return {
          ok: true,
          noteId: note.id,
          title: note.title,
          folderId: note.folderId,
          folderName: note.folder?.name ?? folderName ?? null,
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
    createFolder,
    updateFolder,
    organizeNote,
  };
}
