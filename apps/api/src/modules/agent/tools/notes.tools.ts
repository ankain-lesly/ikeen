import { tool } from 'ai';
import { z } from 'zod';
import type { PrismaService } from '../../../prisma/prisma.service.js';
import type { AblyService } from '../../ably/ably.service.js';

const baseContextSchema = z.object({
  userId: z.string(),
  conversationId: z.string(),
});

export function createNotesTools({
  prisma,
}: {
  prisma: PrismaService;
  ably?: AblyService;
}) {
  const searchNotes = tool({
    description:
      'Search through the user notes using keyword or thematic search. Optionally filter by folder.',
    contextSchema: baseContextSchema,
    inputSchema: z.object({
      query: z
        .string()
        .min(1)
        .describe('Search query, keyword, or concept to find in notes'),
      folderId: z
        .string()
        .optional()
        .describe('Optional folder ID to filter notes within'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(30)
        .default(10)
        .describe('Maximum number of notes to return'),
    }),
    execute: async ({ query, folderId, limit }, { context }) => {
      try {
        const notes = await prisma.note.findMany({
          where: {
            userId: context.userId,
            deletedAt: null,
            ...(folderId ? { folderId } : {}),
            OR: [
              { title: { contains: query, mode: 'insensitive' } },
              { content: { contains: query, mode: 'insensitive' } },
              { tags: { has: query } },
            ],
          },
          select: {
            id: true,
            title: true,
            summary: true,
            tags: true,
            folderId: true,
            isPinned: true,
            updatedAt: true,
          },
          orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }],
          take: limit,
        });

        return {
          ok: true,
          count: notes.length,
          notes,
        };
      } catch (err: unknown) {
        const error = err instanceof Error ? err.message : String(err);
        return { ok: false, error };
      }
    },
  });

  const getNoteDetails = tool({
    description:
      'Retrieve full content, tags, folder, and metadata of a specific note by ID.',
    contextSchema: baseContextSchema,
    inputSchema: z.object({
      noteId: z.string().describe('The UUID of the note to retrieve'),
    }),
    execute: async ({ noteId }, { context }) => {
      try {
        const note = await prisma.note.findFirst({
          where: {
            id: noteId,
            userId: context.userId,
            deletedAt: null,
          },
          include: {
            folder: {
              select: { id: true, name: true, color: true },
            },
          },
        });

        if (!note) {
          return { ok: false, error: 'Note not found or deleted.' };
        }

        return {
          ok: true,
          note: {
            id: note.id,
            title: note.title,
            content: note.content,
            tags: note.tags,
            folder: note.folder,
            isPinned: note.isPinned,
            isArchived: note.isArchived,
            version: note.version,
            updatedAt: note.updatedAt,
          },
        };
      } catch (err: unknown) {
        const error = err instanceof Error ? err.message : String(err);
        return { ok: false, error };
      }
    },
  });

  const listRecentNotes = tool({
    description:
      'List the most recently updated or pinned notes in the workspace to establish context.',
    contextSchema: baseContextSchema,
    inputSchema: z.object({
      limit: z
        .number()
        .int()
        .min(1)
        .max(20)
        .default(8)
        .describe('Number of recent notes to fetch'),
      pinnedOnly: z
        .boolean()
        .default(false)
        .describe('Whether to only return pinned notes'),
    }),
    execute: async ({ limit, pinnedOnly }, { context }) => {
      try {
        const notes = await prisma.note.findMany({
          where: {
            userId: context.userId,
            deletedAt: null,
            ...(pinnedOnly ? { isPinned: true } : {}),
          },
          select: {
            id: true,
            title: true,
            summary: true,
            tags: true,
            folderId: true,
            isPinned: true,
            updatedAt: true,
          },
          orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }],
          take: limit,
        });

        return {
          ok: true,
          count: notes.length,
          notes,
        };
      } catch (err: unknown) {
        const error = err instanceof Error ? err.message : String(err);
        return { ok: false, error };
      }
    },
  });

  const createNote = tool({
    description:
      'Create a new note in the workspace with title, markdown content, optional folderId, and tags.',
    contextSchema: baseContextSchema,
    inputSchema: z.object({
      title: z.string().trim().min(1).describe('Title of the note'),
      content: z
        .string()
        .describe('Markdown content or body of the note'),
      folderId: z
        .string()
        .optional()
        .describe('Optional folder UUID to place this note into (from listFolders)'),
      tags: z
        .array(z.string())
        .default([])
        .describe('List of tags to categorize the note'),
    }),
    execute: async ({ title, content, folderId, tags }, { context }) => {
      try {
        // Validate folder ownership if provided
        if (folderId) {
          const folderExists = await prisma.folder.findFirst({
            where: {
              id: folderId,
              userId: context.userId,
              deletedAt: null,
            },
          });
          if (!folderExists) {
            return {
              ok: false,
              error: 'Specified folder does not exist or is deleted.',
            };
          }
        }

        const note = await prisma.note.create({
          data: {
            userId: context.userId,
            folderId: folderId || null,
            title: title.trim(),
            content: content.trim(),
            tags,
            version: 1,
          },
        });

        return {
          ok: true,
          note: {
            id: note.id,
            title: note.title,
            folderId: note.folderId,
          },
          noteId: note.id,
          title: note.title,
          folderId: note.folderId,
          tags: note.tags,
          createdAt: note.createdAt,
        };
      } catch (err: unknown) {
        const error = err instanceof Error ? err.message : String(err);
        return { ok: false, error };
      }
    },
  });

  const updateNote = tool({
    description:
      'Update an existing note (modify title, tags, replace content, or append new brainstorm notes/action items).',
    contextSchema: baseContextSchema,
    inputSchema: z.object({
      noteId: z.string().describe('The UUID of the note to update'),
      title: z.string().optional().describe('New title if changing'),
      content: z
        .string()
        .optional()
        .describe('Replacement content for the note'),
      appendContent: z
        .string()
        .optional()
        .describe(
          'Additional text or checklist to append to the end of the existing content',
        ),
      tags: z
        .array(z.string())
        .optional()
        .describe('New or updated array of tags'),
    }),
    execute: async (
      { noteId, title, content, appendContent, tags },
      { context },
    ) => {
      try {
        const existing = await prisma.note.findFirst({
          where: {
            id: noteId,
            userId: context.userId,
            deletedAt: null,
          },
        });

        if (!existing) {
          return { ok: false, error: 'Note not found or deleted.' };
        }

        let updatedContent = existing.content;
        if (content !== undefined) {
          updatedContent = content;
        } else if (appendContent) {
          updatedContent = `${existing.content}\n\n${appendContent.trim()}`;
        }

        const note = await prisma.note.update({
          where: { id: noteId },
          data: {
            ...(title !== undefined ? { title: title.trim() } : {}),
            content: updatedContent,
            ...(tags !== undefined ? { tags } : {}),
            version: { increment: 1 },
          },
        });

        return {
          ok: true,
          noteId: note.id,
          title: note.title,
          tags: note.tags,
          version: note.version,
          updatedAt: note.updatedAt,
        };
      } catch (err: unknown) {
        const error = err instanceof Error ? err.message : String(err);
        return { ok: false, error };
      }
    },
  });

  const pinNote = tool({
    description:
      'Pin or unpin a note to prioritize it at the top of the workspace list.',
    contextSchema: baseContextSchema,
    inputSchema: z.object({
      noteId: z.string().describe('The UUID of the note to pin or unpin'),
      isPinned: z
        .boolean()
        .default(true)
        .describe('True to pin the note, false to unpin it'),
    }),
    execute: async ({ noteId, isPinned }, { context }) => {
      try {
        const existing = await prisma.note.findFirst({
          where: {
            id: noteId,
            userId: context.userId,
            deletedAt: null,
          },
        });

        if (!existing) {
          return { ok: false, error: 'Note not found or deleted.' };
        }

        const note = await prisma.note.update({
          where: { id: noteId },
          data: {
            isPinned,
            version: { increment: 1 },
          },
        });

        return {
          ok: true,
          noteId: note.id,
          title: note.title,
          isPinned: note.isPinned,
          note: {
            id: note.id,
            title: note.title,
            isPinned: note.isPinned,
          },
        };
      } catch (err: unknown) {
        const error = err instanceof Error ? err.message : String(err);
        return { ok: false, error };
      }
    },
  });

  const archiveNote = tool({
    description:
      'Archive or unarchive a note to remove it from the active workspace without deleting it.',
    contextSchema: baseContextSchema,
    inputSchema: z.object({
      noteId: z.string().describe('The UUID of the note to archive or unarchive'),
      isArchived: z
        .boolean()
        .default(true)
        .describe('True to archive the note, false to restore/unarchive it'),
    }),
    execute: async ({ noteId, isArchived }, { context }) => {
      try {
        const existing = await prisma.note.findFirst({
          where: {
            id: noteId,
            userId: context.userId,
            deletedAt: null,
          },
        });

        if (!existing) {
          return { ok: false, error: 'Note not found or deleted.' };
        }

        const note = await prisma.note.update({
          where: { id: noteId },
          data: {
            isArchived,
            version: { increment: 1 },
          },
        });

        return {
          ok: true,
          noteId: note.id,
          title: note.title,
          isArchived: note.isArchived,
          note: {
            id: note.id,
            title: note.title,
            isArchived: note.isArchived,
          },
        };
      } catch (err: unknown) {
        const error = err instanceof Error ? err.message : String(err);
        return { ok: false, error };
      }
    },
  });

  return {
    searchNotes,
    getNoteDetails,
    listRecentNotes,
    createNote,
    updateNote,
    pinNote,
    archiveNote,
  };
}
