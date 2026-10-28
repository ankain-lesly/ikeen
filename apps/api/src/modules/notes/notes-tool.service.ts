import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { z } from 'zod';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AblyService } from '../ably/ably.service.js';
import { AuditService } from '../audit/audit.service.js';
import { toolFailure } from '../agent/call-options.js';
import {
  parseBlockMarkdown,
} from './block-markdown.parser.js';
import {
  unpackServerNoteBlock,
  parseStoredList,
  packServerBlockContent,
} from './block-content.codec.js';
import type {
  addBlockDef,
  archiveNoteDef,
  createNoteDef,
  deleteBlockDef,
  deleteNoteDef,
  getNoteDetailsDef,
  listRecentNotesDef,
  pinNoteDef,
  searchNotesDef,
  updateBlockDef,
  updateNoteDef,
} from './notes.tool-definitions.js';

export interface ToolExecutionOptions {
  conversationId?: string;
  source?: 'agent' | 'mcp';
  clientId?: string;
  apiKey?: {
    id: string;
    name: string;
    keyPrefix: string;
  };
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

  private async executeTx<T>(
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    if (typeof this.prisma.$transaction === 'function') {
      return this.prisma.$transaction(fn);
    }
    return fn(this.prisma as unknown as Prisma.TransactionClient);
  }

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
            {
              blocks: {
                some: {
                  content: {
                    string_contains: query,
                  },
                },
              },
            },
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
          blocks: {
            orderBy: { position: 'asc' },
          },
        },
      });

      if (!note) {
        return { ok: false, error: 'Note not found or deleted.' };
      }

      const unpackedBlocks = (note.blocks ?? []).map(unpackServerNoteBlock);

      return {
        ok: true as const,
        note: {
          id: note.id,
          title: note.title,
          content: note.content,
          blocks: unpackedBlocks,
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
      content = '',
      blocks,
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

      const parsedBlocks = (blocks || []).map((b) => parseBlockMarkdown(b));

      const note = await this.executeTx(async (tx) => {
        const created = await tx.note.create({
          data: {
            userId,
            folderId: resolvedFolderId,
            title: title.trim(),
            content: content ? content.trim() : '',
            tags,
            version: 1,
          },
        });

        if (parsedBlocks.length > 0) {
          await tx.noteBlock.createMany({
            data: parsedBlocks.map((b, idx) => ({
              id: randomUUID(),
              noteId: created.id,
              type: b.type,
              position: idx,
              content: b.content as Prisma.InputJsonValue,
              version: 1,
            })),
          });
        }

        return created;
      });

      const source = options?.source ?? 'agent';
      const actionPrefix = source === 'mcp' ? 'mcp' : 'agent';

      this.audit.logAgent({
        userId,
        conversationId: options?.conversationId ?? `${source}-${userId}`,
        action: `${actionPrefix}.createNote`,
        resourceType: 'note',
        resourceId: note.id,
        details: `Created note "${note.title}"${parsedBlocks.length > 0 ? ` with ${parsedBlocks.length} blocks` : ''}`,
        metadata: {
          folderId: note.folderId,
          blocksCount: parsedBlocks.length,
          warning,
          source,
          clientId: options?.clientId,
          apiKey: options?.apiKey,
        },
      });

      // Broadcast invalidation over Ably for cross-device real-time sync
      void this.ably.publishInvalidation(userId, ['notes', 'note_blocks']);

      return {
        ok: true as const,
        note: {
          id: note.id,
          title: note.title,
          folderId: note.folderId,
          blocksCount: parsedBlocks.length,
        },
        noteId: note.id,
        title: note.title,
        folderId: note.folderId,
        tags: note.tags,
        blocksCount: parsedBlocks.length,
        createdAt: note.createdAt,
        ...(warning ? { warning } : {}),
      };
    } catch (err) {
      this.logger.error(`Error in createNote for user ${userId}:`, err);
      return toolFailure();
    }
  }

  async addBlock(
    userId: string,
    {
      noteId,
      type,
      markdown,
      header,
      footer,
      position,
    }: z.input<typeof addBlockDef.inputSchema>,
    options?: ToolExecutionOptions,
  ) {
    try {
      const existingNote = await this.prisma.note.findFirst({
        where: { id: noteId, userId, deletedAt: null },
        include: { blocks: { orderBy: { position: 'asc' } } },
      });

      if (!existingNote) {
        return { ok: false, error: 'Note not found or deleted.' };
      }

      const parsed = parseBlockMarkdown({ type, markdown, header, footer });
      const currentBlocks = existingNote.blocks;
      const targetPosition =
        position !== undefined
          ? Math.max(0, Math.min(position, currentBlocks.length))
          : currentBlocks.length;

      const newBlockId = randomUUID();

      await this.executeTx(async (tx) => {
        if (targetPosition < currentBlocks.length) {
          await tx.noteBlock.updateMany({
            where: {
              noteId,
              position: { gte: targetPosition },
            },
            data: {
              position: { increment: 1 },
              updatedAt: new Date(),
              version: { increment: 1 },
            },
          });
        }

        await tx.noteBlock.create({
          data: {
            id: newBlockId,
            noteId,
            type: parsed.type,
            position: targetPosition,
            content: parsed.content as Prisma.InputJsonValue,
            version: 1,
          },
        });

        await tx.note.update({
          where: { id: noteId },
          data: {
            version: { increment: 1 },
            updatedAt: new Date(),
          },
        });
      });

      const source = options?.source ?? 'agent';
      const actionPrefix = source === 'mcp' ? 'mcp' : 'agent';

      this.audit.logAgent({
        userId,
        conversationId: options?.conversationId ?? `${source}-${userId}`,
        action: `${actionPrefix}.addBlock`,
        resourceType: 'note',
        resourceId: noteId,
        details: `Added ${type} block to note "${existingNote.title}" at position ${targetPosition}`,
        metadata: { blockId: newBlockId, type, position: targetPosition, source },
      });

      void this.ably.publishInvalidation(userId, ['notes', 'note_blocks']);

      return {
        ok: true as const,
        noteId,
        blockId: newBlockId,
        type: parsed.type,
        position: targetPosition,
      };
    } catch (err) {
      this.logger.error(`Error in addBlock for user ${userId}:`, err);
      return toolFailure();
    }
  }

  async updateBlock(
    userId: string,
    {
      noteId,
      blockId,
      markdown,
      header,
      footer,
      checklistPatch,
    }: z.input<typeof updateBlockDef.inputSchema>,
    options?: ToolExecutionOptions,
  ) {
    try {
      const existingNote = await this.prisma.note.findFirst({
        where: { id: noteId, userId, deletedAt: null },
      });

      if (!existingNote) {
        return { ok: false, error: 'Note not found or deleted.' };
      }

      const existingBlock = await this.prisma.noteBlock.findFirst({
        where: { id: blockId, noteId },
      });

      if (!existingBlock) {
        return { ok: false, error: 'Block not found.' };
      }

      let updatedContent: unknown = existingBlock.content;
      let updatedType = existingBlock.type;

      if (checklistPatch) {
        if (existingBlock.type !== 'list') {
          return {
            ok: false,
            error: 'checklistPatch can only be applied to list blocks.',
          };
        }

        const stored = parseStoredList(existingBlock.content);
        const items = [...stored.content];

        if (checklistPatch.toggleItemText) {
          const needle = checklistPatch.toggleItemText.trim().toLowerCase();
          const targetItem = items.find((item) =>
            item.content.toLowerCase().includes(needle),
          );
          if (targetItem) {
            targetItem.checked =
              checklistPatch.setChecked !== undefined
                ? checklistPatch.setChecked
                : !targetItem.checked;
          }
        }

        if (
          checklistPatch.appendItems &&
          checklistPatch.appendItems.length > 0
        ) {
          for (const text of checklistPatch.appendItems) {
            if (text.trim()) {
              items.push({
                id: randomUUID(),
                content: text.trim(),
                checked: false,
              });
            }
          }
        }

        const nextHeader = header !== undefined ? header.trim() : stored.header;
        const nextFooter = footer !== undefined ? footer.trim() : stored.footer;
        updatedContent = packServerBlockContent(
          'list',
          {
            content: items,
            header: nextHeader,
            footer: nextFooter,
            listType: stored.listType,
          },
          existingBlock.content,
        );
      } else if (markdown !== undefined) {
        const parsed = parseBlockMarkdown({
          type: existingBlock.type as 'text' | 'list',
          markdown,
          header: header !== undefined ? header : undefined,
          footer: footer !== undefined ? footer : undefined,
        });
        updatedContent = parsed.content;
        updatedType = parsed.type;
      } else if (
        (header !== undefined || footer !== undefined) &&
        existingBlock.type === 'list'
      ) {
        const stored = parseStoredList(existingBlock.content);
        const nextHeader = header !== undefined ? header.trim() : stored.header;
        const nextFooter = footer !== undefined ? footer.trim() : stored.footer;
        updatedContent = packServerBlockContent(
          'list',
          {
            header: nextHeader,
            footer: nextFooter,
            content: stored.content,
            listType: stored.listType,
          },
          existingBlock.content,
        );
      }

      await this.executeTx(async (tx) => {
        await tx.noteBlock.update({
          where: { id: blockId },
          data: {
            type: updatedType,
            content: updatedContent as Prisma.InputJsonValue,
            version: { increment: 1 },
            updatedAt: new Date(),
          },
        });

        await tx.note.update({
          where: { id: noteId },
          data: {
            version: { increment: 1 },
            updatedAt: new Date(),
          },
        });
      });

      const source = options?.source ?? 'agent';
      const actionPrefix = source === 'mcp' ? 'mcp' : 'agent';

      this.audit.logAgent({
        userId,
        conversationId: options?.conversationId ?? `${source}-${userId}`,
        action: `${actionPrefix}.updateBlock`,
        resourceType: 'note',
        resourceId: noteId,
        details: `Updated block ${blockId} in note "${existingNote.title}"`,
        metadata: { blockId, noteId, source },
      });

      void this.ably.publishInvalidation(userId, ['notes', 'note_blocks']);

      return {
        ok: true as const,
        noteId,
        blockId,
      };
    } catch (err) {
      this.logger.error(`Error in updateBlock for user ${userId}:`, err);
      return toolFailure();
    }
  }

  async deleteBlock(
    userId: string,
    { noteId, blockId }: z.input<typeof deleteBlockDef.inputSchema>,
    options?: ToolExecutionOptions,
  ) {
    try {
      const existingNote = await this.prisma.note.findFirst({
        where: { id: noteId, userId, deletedAt: null },
      });

      if (!existingNote) {
        return { ok: false, error: 'Note not found or deleted.' };
      }

      const existingBlock = await this.prisma.noteBlock.findFirst({
        where: { id: blockId, noteId },
      });

      if (!existingBlock) {
        return { ok: false, error: 'Block not found.' };
      }

      await this.executeTx(async (tx) => {
        await tx.noteBlock.delete({
          where: { id: blockId },
        });

        const remainingBlocks = await tx.noteBlock.findMany({
          where: { noteId },
          orderBy: { position: 'asc' },
        });

        const now = new Date();
        for (let i = 0; i < remainingBlocks.length; i++) {
          if (remainingBlocks[i].position !== i) {
            await tx.noteBlock.update({
              where: { id: remainingBlocks[i].id },
              data: {
                position: i,
                version: { increment: 1 },
                updatedAt: now,
              },
            });
          }
        }

        await tx.note.update({
          where: { id: noteId },
          data: {
            version: { increment: 1 },
            updatedAt: now,
          },
        });
      });

      const source = options?.source ?? 'agent';
      const actionPrefix = source === 'mcp' ? 'mcp' : 'agent';

      this.audit.logAgent({
        userId,
        conversationId: options?.conversationId ?? `${source}-${userId}`,
        action: `${actionPrefix}.deleteBlock`,
        resourceType: 'note',
        resourceId: noteId,
        details: `Deleted block ${blockId} from note "${existingNote.title}"`,
        metadata: { blockId, noteId, source },
      });

      void this.ably.publishInvalidation(userId, ['notes', 'note_blocks']);

      return {
        ok: true as const,
        deleted: true,
        noteId,
        blockId,
      };
    } catch (err) {
      this.logger.error(`Error in deleteBlock for user ${userId}:`, err);
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
          apiKey: options?.apiKey,
        },
      });

      // Broadcast invalidation over Ably for cross-device real-time sync
      void this.ably.publishInvalidation(userId, ['notes', 'note_blocks']);

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
        action: isPinned ? `${actionPrefix}.pinNote` : `${actionPrefix}.unpinNote`,
        resourceType: 'note',
        resourceId: note.id,
        details: `${isPinned ? 'Pinned' : 'Unpinned'} note "${note.title}"`,
        metadata: { isPinned, source, clientId: options?.clientId, apiKey: options?.apiKey },
      });

      void this.ably.publishInvalidation(userId, ['notes']);

      return {
        ok: true as const,
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
        action: isArchived
          ? `${actionPrefix}.archiveNote`
          : `${actionPrefix}.unarchiveNote`,
        resourceType: 'note',
        resourceId: note.id,
        details: `${isArchived ? 'Archived' : 'Restored'} note "${note.title}"`,
        metadata: { isArchived, source, clientId: options?.clientId, apiKey: options?.apiKey },
      });

      void this.ably.publishInvalidation(userId, ['notes']);

      return {
        ok: true as const,
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

      const source = options?.source ?? 'agent';
      const actionPrefix = source === 'mcp' ? 'mcp' : 'agent';

      this.audit.logAgent({
        userId,
        conversationId: options?.conversationId ?? `${source}-${userId}`,
        action: `${actionPrefix}.deleteNote`,
        severity: 'WARN',
        resourceType: 'note',
        resourceId: existing.id,
        details: `${hardDelete ? 'Permanently deleted' : 'Soft-deleted'} note "${existing.title}"`,
        metadata: { hardDelete, source, clientId: options?.clientId, apiKey: options?.apiKey },
      });

      void this.ably.publishInvalidation(userId, ['notes', 'note_blocks']);

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
