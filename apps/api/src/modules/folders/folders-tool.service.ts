import { Injectable, Logger } from '@nestjs/common';
import type { z } from 'zod';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { toolFailure } from '../agent/call-options.js';
import type { ToolExecutionOptions } from '../notes/notes-tool.service.js';
import type {
  createFolderDef,
  listFoldersDef,
  organizeNoteDef,
  updateFolderDef,
} from './folders.tool-definitions.js';

@Injectable()
export class FoldersToolService {
  private readonly logger = new Logger(FoldersToolService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private recordFolderAudit(
    userId: string,
    toolAction: string,
    resourceType: 'folder' | 'note',
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
      resourceType,
      resourceId,
      details,
      ...(extra?.changes ? { changes: extra.changes } : {}),
      metadata: {
        ...extra?.metadata,
        source,
        clientId: options?.clientId,
        apiKey: options?.apiKey,
      },
    });
  }

  async listFolders(
    userId: string,
    { query, limit }: z.input<typeof listFoldersDef.inputSchema> = {},
  ) {
    try {
      const trimmedQuery = query?.trim();
      const folders = await this.prisma.folder.findMany({
        where: {
          userId,
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
          _count: { select: { notes: { where: { deletedAt: null } } } },
        },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        take: limit ?? 30,
      });

      return {
        ok: true,
        count: folders.length,
        matched: trimmedQuery ? folders.length > 0 : true,
        ...(trimmedQuery && folders.length === 0
          ? {
              hint: `No folder named "${trimmedQuery}"; call listFolders without query to list all folders.`,
            }
          : {}),
        folders: folders.map((f) => ({
          id: f.id,
          name: f.name,
          color: f.color,
          icon: f.icon,
          isLocked: f.isLocked,
          noteCount: f._count.notes,
        })),
      };
    } catch (err) {
      this.logger.error(`Error in listFolders for user ${userId}:`, err);
      return toolFailure();
    }
  }

  async createFolder(
    userId: string,
    { name, color, icon }: z.input<typeof createFolderDef.inputSchema>,
    options?: ToolExecutionOptions,
  ) {
    try {
      const trimmedName = name.trim();
      const existing = await this.prisma.folder.findFirst({
        where: {
          userId,
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

      const folder = await this.prisma.folder.create({
        data: {
          userId,
          name: trimmedName,
          color: color ?? '#3b82f6',
          icon: icon ?? 'folder',
          version: 1,
        },
      });

      this.recordFolderAudit(
        userId,
        'createFolder',
        'folder',
        folder.id,
        `Created folder "${folder.name}"`,
        options,
        { severity: 'WARN' },
      );

      return {
        ok: true,
        folder: { id: folder.id, name: folder.name, color: folder.color, icon: folder.icon },
        folderId: folder.id,
        name: folder.name,
      };
    } catch (err) {
      this.logger.error(`Error in createFolder for user ${userId}:`, err);
      return toolFailure();
    }
  }

  async updateFolder(
    userId: string,
    { folderId, name, color, icon, sortOrder }: z.input<typeof updateFolderDef.inputSchema>,
    options?: ToolExecutionOptions,
  ) {
    try {
      const existing = await this.prisma.folder.findFirst({
        where: { id: folderId, userId, deletedAt: null },
      });

      if (!existing) {
        return { ok: false, error: 'Folder not found.' };
      }

      const updated = await this.prisma.folder.update({
        where: { id: folderId },
        data: {
          ...(name ? { name: name.trim() } : {}),
          ...(color ? { color } : {}),
          ...(icon ? { icon } : {}),
          ...(sortOrder != null ? { sortOrder } : {}),
          version: { increment: 1 },
        },
        select: { id: true, name: true, color: true, icon: true, sortOrder: true },
      });

      this.recordFolderAudit(
        userId,
        'updateFolder',
        'folder',
        updated.id,
        `Updated folder "${updated.name}"`,
        options,
        {
          changes: this.audit.trackChanges(
            { name: existing.name, color: existing.color, icon: existing.icon, sortOrder: existing.sortOrder },
            { name: updated.name, color: updated.color, icon: updated.icon, sortOrder: updated.sortOrder },
            ['name', 'color', 'icon', 'sortOrder'],
          ),
        },
      );

      return { ok: true, folder: updated, folderId: updated.id, name: updated.name };
    } catch (err) {
      this.logger.error(`Error in updateFolder for user ${userId}:`, err);
      return toolFailure();
    }
  }

  async organizeNote(
    userId: string,
    { noteId, folderId, tags }: z.input<typeof organizeNoteDef.inputSchema>,
    options?: ToolExecutionOptions,
  ) {
    try {
      const existingNote = await this.prisma.note.findFirst({
        where: { id: noteId, userId, deletedAt: null },
      });

      if (!existingNote) {
        return { ok: false, error: 'Note not found.' };
      }

      let folderName: string | null = null;
      if (folderId) {
        const folderExists = await this.prisma.folder.findFirst({
          where: { id: folderId, userId, deletedAt: null },
          select: { id: true, name: true },
        });
        if (!folderExists) {
          return { ok: false, error: 'Target folder does not exist.' };
        }
        folderName = folderExists.name;
      }

      const note = await this.prisma.note.update({
        where: { id: noteId },
        data: {
          folderId: folderId === undefined ? existingNote.folderId : folderId,
          ...(tags != null ? { tags } : {}),
          version: { increment: 1 },
        },
        select: {
          id: true,
          title: true,
          folderId: true,
          tags: true,
          folder: { select: { id: true, name: true } },
        },
      });

      this.recordFolderAudit(
        userId,
        'organizeNote',
        'note',
        note.id,
        `Organized note "${note.title}"`,
        options,
        {
          severity: 'WARN',
          metadata: { folderId: note.folderId, previousFolderId: existingNote.folderId },
        },
      );

      return {
        ok: true,
        noteId: note.id,
        title: note.title,
        folderId: note.folderId,
        folderName: note.folder?.name ?? folderName ?? null,
        tags: note.tags,
      };
    } catch (err) {
      this.logger.error(`Error in organizeNote for user ${userId}:`, err);
      return toolFailure();
    }
  }
}
