import { tool } from 'ai';
import { z } from 'zod';
import type { PrismaService } from '../../../prisma/prisma.service.js';
import type { AblyService } from '../../ably/ably.service.js';
import type { AuditService } from '../../audit/audit.service.js';

const baseContextSchema = z.object({
  userId: z.string(),
  conversationId: z.string(),
});

const discoverySelect = {
  id: true,
  title: true,
  summary: true,
  tags: true,
  folderId: true,
  isPinned: true,
  isArchived: true,
  updatedAt: true,
  folder: { select: { name: true } },
} as const;

function mapDiscoveryNote(note: {
  id: string;
  title: string;
  summary: string | null;
  tags: string[];
  folderId: string | null;
  isPinned: boolean;
  isArchived: boolean;
  updatedAt: Date;
  folder: { name: string } | null;
}) {
  return {
    id: note.id,
    title: note.title,
    summary: note.summary,
    tags: note.tags,
    folderId: note.folderId,
    folderName: note.folder?.name ?? null,
    isPinned: note.isPinned,
    isArchived: note.isArchived,
    updatedAt: note.updatedAt,
  };
}

function previewText(text: string, max = 280) {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max)}…`;
}

export function createNotesTools({
  prisma,
  audit,
}: {
  prisma: PrismaService;
  ably?: AblyService;
  audit: AuditService;
}) {
  const searchNotes = tool({
    description:
      'Search notes by keyword in title, content, or exact tag. Optionally filter by folder. Excludes archived notes unless includeArchived is true.',
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
      includeArchived: z
        .boolean()
        .default(false)
        .describe('Set true to include archived notes in results'),
    }),
    execute: async ({ query, folderId, limit, includeArchived }, { context }) => {
      try {
        const notes = await prisma.note.findMany({
          where: {
            userId: context.userId,
            deletedAt: null,
            ...(includeArchived ? {} : { isArchived: false }),
            ...(folderId ? { folderId } : {}),
            OR: [
              { title: { contains: query, mode: 'insensitive' } },
              { content: { contains: query, mode: 'insensitive' } },
              { tags: { has: query } },
            ],
          },
          select: discoverySelect,
          orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }],
          take: limit,
        });

        return {
          ok: true,
          count: notes.length,
          notes: notes.map(mapDiscoveryNote),
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
              select: { id: true, name: true, color: true, isLocked: true },
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
      'List the most recently updated or pinned notes in the workspace to establish context. Excludes archived notes unless includeArchived is true.',
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
      includeArchived: z
        .boolean()
        .default(false)
        .describe('Set true to include archived notes in results'),
    }),
    execute: async ({ limit, pinnedOnly, includeArchived }, { context }) => {
      try {
        const notes = await prisma.note.findMany({
          where: {
            userId: context.userId,
            deletedAt: null,
            ...(includeArchived ? {} : { isArchived: false }),
            ...(pinnedOnly ? { isPinned: true } : {}),
          },
          select: discoverySelect,
          orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }],
          take: limit,
        });

        return {
          ok: true,
          count: notes.length,
          notes: notes.map(mapDiscoveryNote),
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
        let resolvedFolderId = folderId || null;
        let warning: string | undefined;

        if (folderId) {
          const folderExists = await prisma.folder.findFirst({
            where: {
              id: folderId,
              userId: context.userId,
              deletedAt: null,
            },
          });
          if (!folderExists) {
            resolvedFolderId = null;
            warning = 'Folder not found; saved at root';
          }
        }

        const note = await prisma.note.create({
          data: {
            userId: context.userId,
            folderId: resolvedFolderId,
            title: title.trim(),
            content: content.trim(),
            tags,
            version: 1,
          },
        });

        audit.logAgent({
          userId: context.userId,
          conversationId: context.conversationId,
          action: 'agent.createNote',
          resourceType: 'note',
          resourceId: note.id,
          details: `Created note "${note.title}"`,
          metadata: { folderId: note.folderId, warning },
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
          ...(warning ? { warning } : {}),
        };
      } catch (err: unknown) {
        const error = err instanceof Error ? err.message : String(err);
        return { ok: false, error };
      }
    },
  });

  const updateNote = tool({
    description:
      'Update an existing note (modify title, tags, replace content, or append new brainstorm notes/action items). Full content replace requires confirm: true after the user agrees.',
    contextSchema: baseContextSchema,
    inputSchema: z.object({
      noteId: z.string().describe('The UUID of the note to update'),
      title: z.string().optional().describe('New title if changing'),
      content: z
        .string()
        .optional()
        .describe('Replacement content for the note. Requires confirm: true after user agreement.'),
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
      confirm: z
        .boolean()
        .optional()
        .describe(
          'Set true only after the user agrees to a full content replace in this turn',
        ),
    }),
    execute: async (
      { noteId, title, content, appendContent, tags, confirm },
      { context },
    ) => {
      try {
        if (content !== undefined && appendContent) {
          return {
            ok: false,
            error: 'Pass content or appendContent, not both.',
          };
        }

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

        const isReplace =
          content !== undefined && content !== existing.content;
        if (isReplace && confirm !== true) {
          return {
            ok: false,
            needsConfirmation: true,
            preview: {
              title: existing.title,
              current: previewText(existing.content),
              proposed: previewText(content),
            },
          };
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

        const changes = audit.trackChanges(
          {
            title: existing.title,
            content: existing.content,
            tags: existing.tags,
          },
          {
            title: note.title,
            content: note.content,
            tags: note.tags,
          },
          ['title', 'content', 'tags'],
        );

        audit.logAgent({
          userId: context.userId,
          conversationId: context.conversationId,
          action: isReplace ? 'agent.replaceNote' : 'agent.updateNote',
          severity: isReplace ? 'WARN' : 'INFO',
          resourceType: 'note',
          resourceId: note.id,
          details: isReplace
            ? `Replaced content of note "${note.title}"`
            : `Updated note "${note.title}"`,
          changes,
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

        audit.logAgent({
          userId: context.userId,
          conversationId: context.conversationId,
          action: 'agent.pinNote',
          resourceType: 'note',
          resourceId: note.id,
          details: `${isPinned ? 'Pinned' : 'Unpinned'} note "${note.title}"`,
          metadata: { isPinned },
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

        audit.logAgent({
          userId: context.userId,
          conversationId: context.conversationId,
          action: 'agent.archiveNote',
          severity: 'WARN',
          resourceType: 'note',
          resourceId: note.id,
          details: `${isArchived ? 'Archived' : 'Restored'} note "${note.title}"`,
          metadata: { isArchived },
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
