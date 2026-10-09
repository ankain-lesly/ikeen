import { Injectable, Logger } from '@nestjs/common';
import type { z } from 'zod';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AblyService } from '../ably/ably.service.js';
import { AuditService } from '../audit/audit.service.js';
import { toolFailure } from '../agent/call-options.js';
import type {
  archiveNoteDef,
  deleteNoteDef,
  createNoteDef,
  getNoteDetailsDef,
  listRecentNotesDef,
  pinNoteDef,
  searchNotesDef,
  updateNoteDef,
} from './notes.tool-definitions.js';

export interface ToolExecutionOptions {
  conversationId?: string;
  source?: 'agent' | 'mcp';
  clientId?: string;
}

const discoverySelect = {
  id: true,
  title: true,
  content: true,
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
  content: string;
  tags: string[];
  folderId: string | null;
  isPinned: boolean;
  isArchived: boolean;
  updatedAt: Date;
  folder: { name: string } | null;
}) {
  const isTruncated = note.content.trim().length > 280;
  return {
    id: note.id,
    title: note.title,
    content: previewText(note.content, 280),
    isTruncated,
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
  return `${trimmed.slice(0, max)}… [truncated]`;
}

@Injectable()
export class NotesToolService {
  private readonly logger = new Logger(NotesToolService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly ably: AblyService,
  ) {}

  async searchNotes(
    userId: string,
    {
      query,
      folderId,
      limit = 10,
      includeArchived = false,
    }: z.input<typeof searchNotesDef.inputSchema>,
  ) {
    try {
      const notes = await this.prisma.note.findMany({
        where: {
          userId,
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
    } catch (err) {
      this.logger.error(`Error in searchNotes for user ${userId}:`, err);
      return toolFailure();
    }
  }

  async getNoteDetails(
    userId: string,
    { noteId }: z.input<typeof getNoteDetailsDef.inputSchema>,
  ) {
    try {
      const note = await this.prisma.note.findFirst({
        where: {
          id: noteId,
          userId,
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
    } catch (err) {
      this.logger.error(`Error in getNoteDetails for user ${userId}:`, err);
      return toolFailure();
    }
  }

  async listRecentNotes(
    userId: string,
    {
      limit = 8,
      pinnedOnly = false,
      includeArchived = false,
    }: z.input<typeof listRecentNotesDef.inputSchema> = {},
  ) {
    try {
      const notes = await this.prisma.note.findMany({
        where: {
          userId,
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
    } catch (err) {
      this.logger.error(`Error in listRecentNotes for user ${userId}:`, err);
      return toolFailure();
    }
  }

  async createNote(
    userId: string,
    {
      title,
      content,
      folderId,
      tags = [],
    }: z.input<typeof createNoteDef.inputSchema>,
    options?: ToolExecutionOptions,
  ) {
    try {
      let resolvedFolderId = folderId || null;
      let warning: string | undefined;

      if (folderId) {
        const folderExists = await this.prisma.folder.findFirst({
          where: {
            id: folderId,
            userId,
            deletedAt: null,
          },
        });
        if (!folderExists) {
          resolvedFolderId = null;
          warning = 'Folder not found; saved at root';
        }
      }

      const note = await this.prisma.note.create({
        data: {
          userId,
          folderId: resolvedFolderId,
          title: title.trim(),
          content: content.trim(),
          tags,
          version: 1,
        },
      });

      const source = options?.source ?? 'agent';
      const actionPrefix = source === 'mcp' ? 'mcp' : 'agent';

      this.audit.logAgent({
        userId,
        conversationId: options?.conversationId ?? `${source}-${userId}`,
        action: `${actionPrefix}.createNote`,
        resourceType: 'note',
        resourceId: note.id,
        details: `Created note "${note.title}"`,
        metadata: {
          folderId: note.folderId,
          warning,
          source,
          clientId: options?.clientId,
        },
      });

      // Broadcast invalidation over Ably for cross-device real-time sync
      void this.ably.publishInvalidation(userId, ['notes']);

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
    } catch (err) {
      this.logger.error(`Error in createNote for user ${userId}:`, err);
      return toolFailure();
    }
  }

  async updateNote(
    userId: string,
    {
      noteId,
      title,
      content,
      appendContent,
      tags,
      confirm,
    }: z.input<typeof updateNoteDef.inputSchema>,
    options?: ToolExecutionOptions,
  ) {
    try {
      if (content !== undefined && appendContent) {
        return {
          ok: false,
          error: 'Pass content or appendContent, not both.',
        };
      }

      const existing = await this.prisma.note.findFirst({
        where: {
          id: noteId,
          userId,
          deletedAt: null,
        },
      });

      if (!existing) {
        return { ok: false, error: 'Note not found or deleted.' };
      }

      const isReplace = content !== undefined && content !== existing.content;
      if (isReplace && confirm !== true) {
        return {
          ok: false,
          needsConfirmation: true,
          preview: {
            title: existing.title,
            current: previewText(existing.content),
            proposed: previewText(content),
          },
          message:
            'This action will replace the entire note content. Call again with confirm: true to proceed.',
        };
      }

      let updatedContent = existing.content;
      if (content !== undefined) {
        updatedContent = content;
      } else if (appendContent) {
        updatedContent = `${existing.content}\n\n${appendContent.trim()}`;
      }

      const note = await this.prisma.note.update({
        where: { id: noteId },
        data: {
          ...(title !== undefined ? { title: title.trim() } : {}),
          content: updatedContent,
          ...(tags !== undefined ? { tags } : {}),
          version: { increment: 1 },
        },
      });

      const changes = this.audit.trackChanges(
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

      const source = options?.source ?? 'agent';
      const actionPrefix = source === 'mcp' ? 'mcp' : 'agent';

      this.audit.logAgent({
        userId,
        conversationId: options?.conversationId ?? `${source}-${userId}`,
        action: isReplace
          ? `${actionPrefix}.replaceNote`
          : `${actionPrefix}.updateNote`,
        severity: isReplace ? 'WARN' : 'INFO',
        resourceType: 'note',
        resourceId: note.id,
        details: isReplace
          ? `Replaced content of note "${note.title}"`
          : `Updated note "${note.title}"`,
        changes,
        metadata: {
          source,
          clientId: options?.clientId,
        },
      });

      // Broadcast invalidation over Ably for cross-device real-time sync
      void this.ably.publishInvalidation(userId, ['notes']);

      return {
        ok: true,
        noteId: note.id,
        title: note.title,
        tags: note.tags,
        version: note.version,
        updatedAt: note.updatedAt,
      };
    } catch (err) {
      this.logger.error(`Error in updateNote for user ${userId}:`, err);
      return toolFailure();
    }
  }

  async pinNote(
    userId: string,
    { noteId, isPinned = true }: z.input<typeof pinNoteDef.inputSchema>,
    options?: ToolExecutionOptions,
  ) {
    try {
      const existing = await this.prisma.note.findFirst({
        where: {
          id: noteId,
          userId,
          deletedAt: null,
        },
      });

      if (!existing) {
        return { ok: false, error: 'Note not found or deleted.' };
      }

      const note = await this.prisma.note.update({
        where: { id: noteId },
        data: {
          isPinned,
          version: { increment: 1 },
        },
      });

      const source = options?.source ?? 'agent';
      const actionPrefix = source === 'mcp' ? 'mcp' : 'agent';

      this.audit.logAgent({
        userId,
        conversationId: options?.conversationId ?? `${source}-${userId}`,
        action: `${actionPrefix}.pinNote`,
        resourceType: 'note',
        resourceId: note.id,
        details: `${isPinned ? 'Pinned' : 'Unpinned'} note "${note.title}"`,
        metadata: { isPinned, source, clientId: options?.clientId },
      });

      void this.ably.publishInvalidation(userId, ['notes']);

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
    } catch (err) {
      this.logger.error(`Error in pinNote for user ${userId}:`, err);
      return toolFailure();
    }
  }

  async archiveNote(
    userId: string,
    { noteId, isArchived = true }: z.input<typeof archiveNoteDef.inputSchema>,
    options?: ToolExecutionOptions,
  ) {
    try {
      const existing = await this.prisma.note.findFirst({
        where: {
          id: noteId,
          userId,
          deletedAt: null,
        },
      });

      if (!existing) {
        return { ok: false, error: 'Note not found or deleted.' };
      }

      const note = await this.prisma.note.update({
        where: { id: noteId },
        data: {
          isArchived,
          version: { increment: 1 },
        },
      });

      const source = options?.source ?? 'agent';
      const actionPrefix = source === 'mcp' ? 'mcp' : 'agent';

      this.audit.logAgent({
        userId,
        conversationId: options?.conversationId ?? `${source}-${userId}`,
        action: `${actionPrefix}.archiveNote`,
        severity: 'WARN',
        resourceType: 'note',
        resourceId: note.id,
        details: `${isArchived ? 'Archived' : 'Restored'} note "${note.title}"`,
        metadata: { isArchived, source, clientId: options?.clientId },
      });

      void this.ably.publishInvalidation(userId, ['notes']);

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
    } catch (err) {
      this.logger.error(`Error in archiveNote for user ${userId}:`, err);
      return toolFailure();
    }
  }

  async deleteNote(
    userId: string,
    { noteId, hardDelete = false }: z.input<typeof deleteNoteDef.inputSchema>,
    options?: ToolExecutionOptions,
  ) {
    try {
      const existing = await this.prisma.note.findFirst({
        where: {
          id: noteId,
          userId,
          deletedAt: null,
        },
      });

      if (!existing) {
        return { ok: false, error: 'Note not found or already deleted.' };
      }

      if (hardDelete) {
        await this.prisma.note.delete({
          where: { id: noteId },
        });
      } else {
        await this.prisma.note.update({
          where: { id: noteId },
          data: {
            deletedAt: new Date(),
            version: { increment: 1 },
          },
        });
      }

      const source = options?.source ?? 'mcp';
      const actionPrefix = source === 'mcp' ? 'mcp' : 'agent';

      this.audit.logAgent({
        userId,
        conversationId: options?.conversationId ?? `${source}-${userId}`,
        action: `${actionPrefix}.deleteNote`,
        severity: 'WARN',
        resourceType: 'note',
        resourceId: existing.id,
        details: `${hardDelete ? 'Permanently deleted' : 'Soft-deleted'} note "${existing.title}"`,
        metadata: { hardDelete, source, clientId: options?.clientId },
      });

      void this.ably.publishInvalidation(userId, ['notes']);

      return {
        ok: true,
        noteId: existing.id,
        title: existing.title,
        deleted: true,
        hardDelete,
      };
    } catch (err) {
      this.logger.error(`Error in deleteNote for user ${userId}:`, err);
      return toolFailure();
    }
  }
}
