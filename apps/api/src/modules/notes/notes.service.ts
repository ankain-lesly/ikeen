import {
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { NoteMutationPayload } from '@repo/types';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateNoteDto } from './dto/create-note.dto.js';
import { UpdateNoteDto } from './dto/update-note.dto.js';
import { BlockMutationDto } from '../sync/dto/sync-push.dto.js';
import { packServerBlockContent } from './block-content.codec.js';

export type NoteSyncData = NoteMutationPayload;

@Injectable()
export class NotesService {
  private readonly logger = new Logger(NotesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieves all active (non-deleted) notes for a user, optionally filtered by folderId.
   */
  async findAll(userId: string, folderId?: string) {
    return this.prisma.note.findMany({
      where: {
        userId,
        deletedAt: null,
        ...(folderId !== undefined && { folderId }),
      },
      orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }],
    });
  }

  /**
   * Finds a single active note by ID.
   */
  async findOne(userId: string, id: string) {
    const note = await this.prisma.note.findFirst({
      where: { id, userId, deletedAt: null },
    });
    if (!note) {
      throw new NotFoundException(`Note with id "${id}" not found.`);
    }
    return note;
  }

  /**
   * Creates a new note.
   */
  async create(userId: string, dto: CreateNoteDto) {
    if (dto.folderId) {
      const folderExists = await this.prisma.folder.findFirst({
        where: { id: dto.folderId, userId },
      });
      if (!folderExists) {
        dto.folderId = null;
      }
    }

    return this.prisma.note.create({
      data: {
        ...(dto.id && { id: dto.id }),
        userId,
        folderId: dto.folderId ?? null,
        title: dto.title,
        content: dto.content ?? '',
        tags: dto.tags ?? [],
        isPinned: dto.isPinned ?? false,
        isArchived: dto.isArchived ?? false,
        summary: dto.summary ?? null,
        version: 1,
      },
    });
  }

  /**
   * Updates an existing note with version incrementing.
   */
  async update(userId: string, id: string, dto: UpdateNoteDto) {
    await this.findOne(userId, id);

    if (dto.folderId !== undefined && dto.folderId !== null) {
      const folderExists = await this.prisma.folder.findFirst({
        where: { id: dto.folderId, userId },
      });
      if (!folderExists) {
        dto.folderId = null;
      }
    }

    return this.prisma.note.update({
      where: { id },
      data: {
        ...(dto.folderId !== undefined && { folderId: dto.folderId }),
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.content !== undefined && { content: dto.content }),
        ...(dto.tags !== undefined && { tags: dto.tags }),
        ...(dto.isPinned !== undefined && { isPinned: dto.isPinned }),
        ...(dto.isArchived !== undefined && { isArchived: dto.isArchived }),
        ...(dto.summary !== undefined && { summary: dto.summary }),
        version: { increment: 1 },
      },
    });
  }

  /**
   * Soft deletes a note by stamping deletedAt.
   */
  async softDelete(userId: string, id: string) {
    await this.findOne(userId, id);

    return this.prisma.note.update({
      where: { id },
      data: { deletedAt: new Date(), version: { increment: 1 } },
    });
  }

  /**
   * Reusable Last-Write-Wins (LWW) upsert for notes with partial patching and versioning.
   * Strictly reads entity properties from `n.changes`.
   */
  async upsertWithLww(
    userId: string,
    n: NoteMutationPayload,
    prismaClient: Prisma.TransactionClient | PrismaService = this.prisma,
  ): Promise<{ applied: boolean; noteId: string }> {
    const clientUpdatedAt = new Date(n.updatedAt);
    const existing = await prismaClient.note.findUnique({
      where: { id: n.id },
    });

    if (existing && clientUpdatedAt < existing.updatedAt) {
      this.logger.debug(
        `LWW: Skipping older note mutation for ${n.id} (client: ${n.updatedAt}, server: ${existing.updatedAt.toISOString()})`,
      );
      return { applied: false, noteId: n.id };
    }

    const nextVersion = Math.max((existing?.version ?? 0) + 1, n.version ?? 1);

    // Validate folder ownership if folderId is changed or created
    const targetFolderId = n.changes.folderId;
    let validatedFolderId: string | null | undefined = undefined;

    if (targetFolderId !== undefined) {
      if (targetFolderId === null) {
        validatedFolderId = null;
      } else {
        const folderExists = await prismaClient.folder.findFirst({
          where: { id: targetFolderId, userId },
        });
        validatedFolderId = folderExists ? targetFolderId : null;
      }
    }

    if (existing) {
      const patchData: Prisma.NoteUncheckedUpdateInput = {
        updatedAt: clientUpdatedAt,
        version: nextVersion,
      };

      if (validatedFolderId !== undefined)
        patchData.folderId = validatedFolderId;

      if (n.changes.title !== undefined) patchData.title = n.changes.title;
      if (n.changes.content !== undefined) patchData.content = n.changes.content;
      if (n.changes.tags !== undefined)
        patchData.tags = Array.isArray(n.changes.tags) ? n.changes.tags : [];
      if (n.changes.isPinned !== undefined) patchData.isPinned = n.changes.isPinned;
      if (n.changes.isArchived !== undefined) patchData.isArchived = n.changes.isArchived;
      if (n.changes.summary !== undefined) patchData.summary = n.changes.summary;
      if (n.changes.deletedAt !== undefined) {
        patchData.deletedAt = n.changes.deletedAt ? new Date(n.changes.deletedAt) : null;
      }
      if (n.changes.createdAt !== undefined) {
        patchData.createdAt = n.changes.createdAt ? new Date(n.changes.createdAt) : undefined;
      }

      await prismaClient.note.update({
        where: { id: n.id },
        data: patchData,
      });
    } else {
      const tagsArray = Array.isArray(n.changes?.tags) ? n.changes.tags : [];

      await prismaClient.note.create({
        data: {
          id: n.id,
          userId,
          folderId: validatedFolderId ?? null,
          title: n.changes.title ?? '',
          content: n.changes.content ?? '',
          tags: tagsArray,
          isPinned: n.changes.isPinned ?? false,
          isArchived: n.changes.isArchived ?? false,
          summary: n.changes.summary ?? null,
          version: nextVersion,
          createdAt: clientUpdatedAt,
          updatedAt: clientUpdatedAt,
          deletedAt: n.changes.deletedAt ? new Date(n.changes.deletedAt) : null,
        },
      });
    }

    this.logger.debug(
      `[LWW:Note:Applied] id=${n.id} action=${n.action} version=${nextVersion} isExisting=${!!existing}`,
    );

    return { applied: true, noteId: n.id };
  }

  /**
   * Reusable Last-Write-Wins (LWW) upsert for note blocks with partial patching and versioning.
   */
  async upsertBlockWithLww(
    userId: string,
    b: BlockMutationDto,
    prismaClient: Prisma.TransactionClient | PrismaService = this.prisma,
  ): Promise<{ applied: boolean; blockId: string }> {
    const clientUpdatedAt = new Date(b.updatedAt);
    const existing = await prismaClient.noteBlock.findUnique({
      where: { id: b.id },
    });

    if (existing && clientUpdatedAt < existing.updatedAt) {
      this.logger.debug(
        `LWW: Skipping older note block mutation for ${b.id} (client: ${b.updatedAt}, server: ${existing.updatedAt.toISOString()})`,
      );
      return { applied: false, blockId: b.id };
    }

    const nextVersion = Math.max((existing?.version ?? 0) + 1, b.version ?? 1);

    // Handle block deletion
    if (b.action === 'delete') {
      if (!existing) {
        return { applied: false, blockId: b.id };
      }

      const targetNoteId = b.changes?.noteId ?? existing.noteId;
      const parentNote = await prismaClient.note.findFirst({
        where: { id: targetNoteId, userId },
      });

      if (!parentNote) {
        this.logger.warn(
          `Block delete skipped: parent note ${targetNoteId} not found for user ${userId}`,
        );
        return { applied: false, blockId: b.id };
      }

      // Soft-delete using tombstone so delta-pull propagates deletion to other devices
      await prismaClient.noteBlock.update({
        where: { id: b.id },
        data: {
          deletedAt: clientUpdatedAt,
          version: nextVersion,
          updatedAt: clientUpdatedAt,
        },
      });

      this.logger.debug(
        `[LWW:NoteBlock:Tombstone] id=${b.id} noteId=${targetNoteId}`,
      );

      return { applied: true, blockId: b.id };
    }

    const targetNoteId = b.changes?.noteId ?? existing?.noteId;
    if (!targetNoteId) {
      this.logger.warn(`Block upsert skipped: missing noteId for block ${b.id}`);
      return { applied: false, blockId: b.id };
    }

    // Verify the parent note exists and belongs to the user
    const parentNote = await prismaClient.note.findFirst({
      where: { id: targetNoteId, userId },
    });

    if (!parentNote) {
      throw new UnprocessableEntityException(
        `Cannot upsert block ${b.id}: parent note ${targetNoteId} not found for user ${userId}`,
      );
    }

    const resolvedType = b.changes.type ?? existing?.type ?? 'text';
    const nextContent = packServerBlockContent(
      resolvedType,
      b.changes,
      existing?.content,
    );

    const blockPatch: Prisma.NoteBlockUpdateInput = {
      updatedAt: clientUpdatedAt,
      type: resolvedType,
      position: b.changes.position ?? existing?.position,
      content: nextContent as unknown as Prisma.InputJsonValue,
      version: nextVersion,
    };
    if (b.changes.deletedAt !== undefined) {
      blockPatch.deletedAt = b.changes.deletedAt ? new Date(b.changes.deletedAt) : null;
    }

    if (existing) {
      await prismaClient.noteBlock.update({
        where: { id: b.id },
        data: blockPatch,
      });
    } else {
      await prismaClient.noteBlock.create({
        data: {
          id: b.id,
          noteId: targetNoteId,
          type: resolvedType,
          position: b.changes.position ?? 0,
          content: nextContent as unknown as Prisma.InputJsonValue,
          version: nextVersion,
          createdAt: clientUpdatedAt,
          updatedAt: clientUpdatedAt,
          deletedAt: b.changes.deletedAt ? new Date(b.changes.deletedAt) : null,
        },
      });
    }

    this.logger.debug(
      `[LWW:NoteBlock:Applied] id=${b.id} action=${b.action} version=${nextVersion} isExisting=${!!existing}`,
    );

    return { applied: true, blockId: b.id };
  }
}
