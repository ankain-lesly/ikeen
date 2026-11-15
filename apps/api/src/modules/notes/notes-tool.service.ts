import { Injectable, Logger, Optional } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { z } from 'zod';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { PushNotificationService } from '../notifications/push-notification.service.js';
import { toolFailure } from '../agent/call-options.js';
import { parseBlockMarkdown } from './block-markdown.parser.js';
import {
  unpackServerNoteBlock,
  parseStoredList,
  packServerBlockContent,
} from './block-content.codec.js';
import type {
  addBlockDef,
  archiveNoteDef,
  attachImageDef,
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
    @Optional() private readonly pushService?: PushNotificationService,
  ) {}

  private async executeTx<T>(
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    if (typeof this.prisma.$transaction === 'function') {
      return this.prisma.$transaction(fn);
    }
    return fn(this.prisma as unknown as Prisma.TransactionClient);
  }

  private findActiveNote(userId: string, noteId: string) {
    return this.prisma.note.findFirst({
      where: { id: noteId, userId, deletedAt: null },
    });
  }

  private recordToolAudit(
    userId: string,
    toolAction: string,
    resourceId: string,
    details: string,
    options?: ToolExecutionOptions,
    extra?: {
      severity?: 'INFO' | 'WARN';
      changes?: Record<string, { old: unknown; new: unknown }>;
      metadata?: Record<string, unknown>;
    },
  ) {
    const source = options?.source ?? 'agent';
    this.audit.logAgent({
      userId,
      conversationId: options?.conversationId ?? `${source}-${userId}`,
      action: `${source === 'mcp' ? 'mcp' : 'agent'}.${toolAction}`,
      ...(extra?.severity ? { severity: extra.severity } : {}),
      resourceType: 'note',
      resourceId,
      details,
      ...(extra?.changes ? { changes: extra.changes } : {}),
      metadata: {
        ...extra?.metadata,
        source,
        ...(options?.clientId !== undefined ? { clientId: options.clientId } : {}),
        ...(options?.apiKey !== undefined ? { apiKey: options.apiKey } : {}),
      },
    });
  }

  async searchNotes(
    userId: string,
    {
      query,
      folderId,
      limit,
      includeArchived,
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
                  deletedAt: null,
                  content: { string_contains: query },
                },
              },
            },
          ],
        },
        select: discoverySelect,
        orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }],
        take: limit ?? 10,
      });

      return { ok: true, count: notes.length, notes: notes.map(mapDiscoveryNote) };
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
        where: { id: noteId, userId, deletedAt: null },
        include: {
          folder: { select: { id: true, name: true, color: true, isLocked: true } },
          blocks: { where: { deletedAt: null }, orderBy: { position: 'asc' } },
        },
      });

      if (!note) {
        return { ok: false, error: 'Note not found or deleted.' };
      }

      return {
        ok: true as const,
        note: {
          id: note.id,
          title: note.title,
          content: note.content,
          blocks: (note.blocks ?? []).map(unpackServerNoteBlock),
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
      limit,
      pinnedOnly,
      includeArchived,
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
        take: limit ?? 8,
      });

      return { ok: true, count: notes.length, notes: notes.map(mapDiscoveryNote) };
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
      blocks,
      folderId,
      tags,
    }: z.input<typeof createNoteDef.inputSchema>,
    options?: ToolExecutionOptions,
  ) {
    try {
      const resolvedContent = content ?? '';
      const resolvedTags = tags ?? [];
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
            content: resolvedContent ? resolvedContent.trim() : '',
            tags: resolvedTags,
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

      this.recordToolAudit(
        userId,
        'createNote',
        note.id,
        `Created note "${note.title}"${parsedBlocks.length > 0 ? ` with ${parsedBlocks.length} blocks` : ''}`,
        options,
        {
          metadata: {
            folderId: note.folderId,
            blocksCount: parsedBlocks.length,
            warning,
          },
        },
      );

      if (this.pushService) {
        const source = options?.source ?? 'agent';
        await this.pushService
          .sendAgentEntityCreatedPush(userId, {
            entity: 'note',
            entityId: note.id,
            title: source === 'mcp' ? 'New Note from MCP' : 'New Note from AI Assistant',
            body: note.title ? `Created note: "${note.title}"` : 'Created a new note',
            source,
            data: {
              noteId: note.id,
              folderId: note.folderId,
            },
          })
          .catch((err) => {
            this.logger.warn(`Failed to dispatch creation push notification for note ${note.id}:`, err);
          });
      }

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
        include: {
          blocks: {
            where: { deletedAt: null },
            orderBy: { position: 'asc' },
          },
        },
      });

      if (!existingNote) {
        return { ok: false, error: 'Note not found or deleted.' };
      }

      const parsed = parseBlockMarkdown({ type, markdown, header, footer });
      const currentBlocks = existingNote.blocks;
      const targetPosition =
        position != null
          ? Math.max(0, Math.min(position, currentBlocks.length))
          : currentBlocks.length;

      const newBlockId = randomUUID();

      await this.executeTx(async (tx) => {
        if (targetPosition < currentBlocks.length) {
          await tx.noteBlock.updateMany({
            where: {
              noteId,
              deletedAt: null,
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

      this.recordToolAudit(
        userId,
        'addBlock',
        noteId,
        `Added ${type} block to note "${existingNote.title}" at position ${targetPosition}`,
        options,
        {
          metadata: {
            blockId: newBlockId,
            type,
            position: targetPosition,
          },
        },
      );


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
        where: { id: blockId, noteId, deletedAt: null },
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
              checklistPatch.setChecked != null
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

        const nextHeader = header != null ? header.trim() : stored.header;
        const nextFooter = footer != null ? footer.trim() : stored.footer;
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
      } else if (markdown != null) {
        const parsed = parseBlockMarkdown({
          type: existingBlock.type as 'text' | 'list',
          markdown,
          header: header ?? undefined,
          footer: footer ?? undefined,
        });
        updatedContent = parsed.content;
        updatedType = parsed.type;
      } else if (
        (header != null || footer != null) &&
        existingBlock.type === 'list'
      ) {
        const stored = parseStoredList(existingBlock.content);
        const nextHeader = header != null ? header.trim() : stored.header;
        const nextFooter = footer != null ? footer.trim() : stored.footer;
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

      this.recordToolAudit(
        userId,
        'updateBlock',
        noteId,
        `Updated block ${blockId} in note "${existingNote.title}"`,
        options,
        { metadata: { blockId, noteId } },
      );


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
        where: { id: blockId, noteId, deletedAt: null },
      });

      if (!existingBlock) {
        return { ok: false, error: 'Block not found.' };
      }

      const now = new Date();
      await this.executeTx(async (tx) => {
        // Soft-delete the block with a tombstone timestamp (ensures delta sync propagates deletion)
        await tx.noteBlock.update({
          where: { id: blockId },
          data: {
            deletedAt: now,
            version: { increment: 1 },
            updatedAt: now,
          },
        });

        // Re-index remaining active blocks
        const remainingBlocks = await tx.noteBlock.findMany({
          where: { noteId, deletedAt: null },
          orderBy: { position: 'asc' },
        });

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

      this.recordToolAudit(
        userId,
        'deleteBlock',
        noteId,
        `Deleted block ${blockId} from note "${existingNote.title}"`,
        options,
        { metadata: { blockId, noteId } },
      );


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

  async attachImage(
    userId: string,
    {
      noteId,
      images,
      createNewBlock,
    }: z.input<typeof attachImageDef.inputSchema>,
    options?: ToolExecutionOptions,
  ) {
    try {
      const shouldCreateNewBlock = createNewBlock ?? false;
      const existingNote = await this.prisma.note.findFirst({
        where: { id: noteId, userId, deletedAt: null },
      });

      if (!existingNote) {
        return { ok: false, error: 'Note not found or deleted.' };
      }

      // 1. Deduplicate incoming batch by normalized URL
      const uniqueByUrl = new Map<
        string,
        { url: string; name?: string; caption?: string }
      >();
      for (const img of images) {
        const url = img.url.trim();
        if (!url) continue;
        uniqueByUrl.set(url, {
          url,
          name: img.name?.trim() || undefined,
          caption: img.caption?.trim() || undefined,
        });
      }
      const dedupedBatch = Array.from(uniqueByUrl.values());

      let resolvedBlockId = '';
      let isNewBlock = false;
      let newMediaItems: Array<{
        id: string;
        mediaType: 'image';
        url: string;
        localUri: string;
        name?: string;
        caption?: string;
      }> = [];
      let totalInBlock = 0;

      // 2. Concurrency-safe transactional execution with block-level URL deduplication
      await this.executeTx(async (tx) => {
        const existingMediaBlock = !shouldCreateNewBlock
          ? await tx.noteBlock.findFirst({
              where: { noteId, type: 'media', deletedAt: null },
              orderBy: { position: 'asc' },
            })
          : null;

        if (existingMediaBlock) {
          const currentItems = Array.isArray(existingMediaBlock.content)
            ? (existingMediaBlock.content as Array<Record<string, unknown>>)
            : [];
          const existingUrls = new Set(
            currentItems
              .map((item) =>
                typeof item?.url === 'string' ? item.url.trim() : '',
              )
              .filter(Boolean),
          );

          newMediaItems = dedupedBatch
            .filter((img) => !existingUrls.has(img.url))
            .map((img) => ({
              id: randomUUID(),
              mediaType: 'image' as const,
              url: img.url,
              localUri: '',
              name: img.name,
              caption: img.caption,
            }));

          totalInBlock = currentItems.length + newMediaItems.length;
          resolvedBlockId = existingMediaBlock.id;

          if (newMediaItems.length > 0) {
            await tx.noteBlock.update({
              where: { id: existingMediaBlock.id },
              data: {
                content: [
                  ...currentItems,
                  ...newMediaItems,
                ] as Prisma.InputJsonValue,
                version: { increment: 1 },
                updatedAt: new Date(),
              },
            });
          }
        } else {
          isNewBlock = true;
          resolvedBlockId = randomUUID();
          newMediaItems = dedupedBatch.map((img) => ({
            id: randomUUID(),
            mediaType: 'image' as const,
            url: img.url,
            localUri: '',
            name: img.name,
            caption: img.caption,
          }));
          totalInBlock = newMediaItems.length;
          const blockCount = await tx.noteBlock.count({
            where: { noteId, deletedAt: null },
          });

          await tx.noteBlock.create({
            data: {
              id: resolvedBlockId,
              noteId,
              type: 'media',
              position: blockCount,
              content: newMediaItems as Prisma.InputJsonValue,
              version: 1,
            },
          });
        }

        if (newMediaItems.length > 0 || isNewBlock) {
          await tx.note.update({
            where: { id: noteId },
            data: {
              version: { increment: 1 },
              updatedAt: new Date(),
            },
          });
        }
      });

      const skippedDuplicates = images.length - newMediaItems.length;
      const stats = {
        requested: images.length,
        attached: newMediaItems.length,
        skippedDuplicates,
        totalInBlock,
      };

      this.recordToolAudit(
        userId,
        'attachImage',
        noteId,
        `Attached ${newMediaItems.length} image(s) to note "${existingNote.title}" (${isNewBlock ? 'new block' : 'appended'}, ${skippedDuplicates} duplicate(s) skipped)`,
        options,
        {
          metadata: {
            blockId: resolvedBlockId,
            imagesCount: newMediaItems.length,
            imageIds: newMediaItems.map((i) => i.id),
            firstUrl: newMediaItems[0]?.url,
            stats,
          },
        },
      );


      return {
        ok: true as const,
        noteId,
        blockId: resolvedBlockId,
        imagesCount: newMediaItems.length,
        imageIds: newMediaItems.map((i) => i.id),
        isNewBlock,
        stats,
      };
    } catch (err) {
      this.logger.error(`Error in attachImage for user ${userId}:`, err);
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
      if (content != null && appendContent) {
        return {
          ok: false,
          error: 'Pass content or appendContent, not both.',
        };
      }

      const existing = await this.findActiveNote(userId, noteId);
      if (!existing) {
        return { ok: false, error: 'Note not found or deleted.' };
      }

      const isReplace = content != null && content !== existing.content;
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

      const updatedContent =
        content != null
          ? content
          : appendContent
            ? `${existing.content}\n\n${appendContent.trim()}`
            : existing.content;

      const note = await this.prisma.note.update({
        where: { id: noteId },
        data: {
          ...(title != null ? { title: title.trim() } : {}),
          content: updatedContent,
          ...(tags != null ? { tags } : {}),
          version: { increment: 1 },
        },
      });

      const changes = this.audit.trackChanges(
        { title: existing.title, content: existing.content, tags: existing.tags },
        { title: note.title, content: note.content, tags: note.tags },
        ['title', 'content', 'tags'],
      );

      this.recordToolAudit(
        userId,
        isReplace ? 'replaceNote' : 'updateNote',
        note.id,
        isReplace
          ? `Replaced content of note "${note.title}"`
          : `Updated note "${note.title}"`,
        options,
        { severity: isReplace ? 'WARN' : 'INFO', changes },
      );


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
    { noteId, isPinned }: z.input<typeof pinNoteDef.inputSchema>,
    options?: ToolExecutionOptions,
  ) {
    try {
      const targetPinned = isPinned ?? true;
      const existing = await this.findActiveNote(userId, noteId);
      if (!existing) {
        return { ok: false, error: 'Note not found or deleted.' };
      }

      const note = await this.prisma.note.update({
        where: { id: noteId },
        data: { isPinned: targetPinned, version: { increment: 1 } },
      });

      this.recordToolAudit(
        userId,
        targetPinned ? 'pinNote' : 'unpinNote',
        note.id,
        `${targetPinned ? 'Pinned' : 'Unpinned'} note "${note.title}"`,
        options,
        { metadata: { isPinned: targetPinned } },
      );


      return {
        ok: true as const,
        note: { id: note.id, title: note.title, isPinned: note.isPinned },
      };
    } catch (err) {
      this.logger.error(`Error in pinNote for user ${userId}:`, err);
      return toolFailure();
    }
  }

  async archiveNote(
    userId: string,
    { noteId, isArchived }: z.input<typeof archiveNoteDef.inputSchema>,
    options?: ToolExecutionOptions,
  ) {
    try {
      const targetArchived = isArchived ?? true;
      const existing = await this.findActiveNote(userId, noteId);
      if (!existing) {
        return { ok: false, error: 'Note not found or deleted.' };
      }

      const note = await this.prisma.note.update({
        where: { id: noteId },
        data: { isArchived: targetArchived, version: { increment: 1 } },
      });

      this.recordToolAudit(
        userId,
        targetArchived ? 'archiveNote' : 'unarchiveNote',
        note.id,
        `${targetArchived ? 'Archived' : 'Restored'} note "${note.title}"`,
        options,
        { metadata: { isArchived: targetArchived } },
      );


      return {
        ok: true as const,
        note: { id: note.id, title: note.title, isArchived: note.isArchived },
      };
    } catch (err) {
      this.logger.error(`Error in archiveNote for user ${userId}:`, err);
      return toolFailure();
    }
  }

  async deleteNote(
    userId: string,
    { noteId, hardDelete }: z.input<typeof deleteNoteDef.inputSchema>,
    options?: ToolExecutionOptions,
  ) {
    try {
      const isHardDelete = hardDelete ?? false;
      const existing = await this.findActiveNote(userId, noteId);
      if (!existing) {
        return { ok: false, error: 'Note not found or already deleted.' };
      }

      if (isHardDelete) {
        await this.prisma.note.delete({ where: { id: noteId } });
      } else {
        await this.prisma.note.update({
          where: { id: noteId },
          data: { deletedAt: new Date(), version: { increment: 1 } },
        });
      }

      this.recordToolAudit(
        userId,
        'deleteNote',
        existing.id,
        `${isHardDelete ? 'Permanently deleted' : 'Soft-deleted'} note "${existing.title}"`,
        options,
        { severity: 'WARN', metadata: { hardDelete: isHardDelete } },
      );


      return {
        ok: true,
        noteId: existing.id,
        title: existing.title,
        deleted: true,
        hardDelete: isHardDelete,
      };
    } catch (err) {
      this.logger.error(`Error in deleteNote for user ${userId}:`, err);
      return toolFailure();
    }
  }
}
