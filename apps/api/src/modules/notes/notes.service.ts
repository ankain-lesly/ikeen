import {
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { NoteBlock, NoteMutationPayload } from '@repo/types';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateNoteDto } from './dto/create-note.dto.js';
import { UpdateNoteDto } from './dto/update-note.dto.js';
import { ListNotesQueryDto } from './dto/list-notes-query.dto.js';
import { UpsertBlockDto } from './dto/upsert-block.dto.js';
import { BlockMutationDto, ReminderMutationDto } from '../sync/dto/sync-push.dto.js';
import {
  packServerBlockContent,
  unpackServerNoteBlock,
} from './block-content.codec.js';

export type NoteSyncData = NoteMutationPayload;

@Injectable()
export class NotesService {
  private readonly logger = new Logger(NotesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieves all active (non-deleted) notes for a user with optional filters.
   * Excludes archived notes by default unless `includeArchived` or `archivedOnly` is true.
   */
  async findAll(userId: string, query?: ListNotesQueryDto | string) {
    const filters: ListNotesQueryDto =
      typeof query === 'string' ? { folderId: query } : (query ?? {});

    const where: Prisma.NoteWhereInput = {
      userId,
      deletedAt: null,
      ...(filters.folderId !== undefined && { folderId: filters.folderId }),
      ...(filters.pinnedOnly && { isPinned: true }),
      ...(filters.archivedOnly
        ? { isArchived: true }
        : !filters.includeArchived
          ? { isArchived: false }
          : {}),
    };

    return this.prisma.note.findMany({
      where,
      orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }],
      ...(filters.offset !== undefined && { skip: filters.offset }),
      ...(filters.limit !== undefined && { take: filters.limit }),
    });
  }

  /**
   * Finds a single active note by ID, including unpacked active blocks ordered by position.
   */
  async findOne(userId: string, id: string) {
    const note = await this.prisma.note.findFirst({
      where: { id, userId, deletedAt: null },
      include: {
        blocks: {
          where: { deletedAt: null },
          orderBy: { position: 'asc' },
        },
      },
    });
    if (!note) {
      throw new NotFoundException(`Note with id "${id}" not found.`);
    }

    const { blocks, ...rest } = note;
    return {
      ...rest,
      blocks: (blocks ?? []).map((b) => unpackServerNoteBlock(b)),
    };
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
   * Lists soft-deleted notes in the user's trash, newest deletions first.
   */
  async findTrashed(userId: string) {
    return this.prisma.note.findMany({
      where: {
        userId,
        deletedAt: { not: null },
      },
      orderBy: { deletedAt: 'desc' },
    });
  }

  /**
   * Restores a soft-deleted note back to active workspace.
   */
  async restore(userId: string, id: string) {
    const existing = await this.prisma.note.findFirst({
      where: { id, userId, deletedAt: { not: null } },
    });
    if (!existing) {
      throw new NotFoundException(`Trashed note with id "${id}" not found.`);
    }

    return this.prisma.note.update({
      where: { id },
      data: {
        deletedAt: null,
        version: { increment: 1 },
      },
    });
  }

  /**
   * Permanently deletes an owned note (cascades note_blocks & reminders).
   */
  async permanentDelete(userId: string, id: string) {
    const existing = await this.prisma.note.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      throw new NotFoundException(`Note with id "${id}" not found.`);
    }

    await this.prisma.note.delete({ where: { id } });
    return { id, deleted: true };
  }

  /**
   * Upserts a single NoteBlock for an owned note using the canonical block codec.
   * Bumps parent note.updatedAt so list ordering stays accurate across devices.
   */
  async upsertBlock(
    userId: string,
    noteId: string,
    blockId: string,
    dto: UpsertBlockDto,
  ): Promise<NoteBlock> {
    const parentNote = await this.prisma.note.findFirst({
      where: { id: noteId, userId, deletedAt: null },
    });
    if (!parentNote) {
      throw new NotFoundException(`Note with id "${noteId}" not found.`);
    }

    const existing = await this.prisma.noteBlock.findUnique({
      where: { id: blockId },
    });
    if (existing && existing.noteId !== noteId) {
      throw new NotFoundException(
        `Block "${blockId}" does not belong to note "${noteId}".`,
      );
    }

    const packedContent = packServerBlockContent(
      dto.type,
      dto,
      existing?.content,
    );
    const now = new Date();

    let resolvedPosition = dto.position ?? existing?.position;
    if (resolvedPosition === undefined) {
      const activeCount = await this.prisma.noteBlock.count({
        where: { noteId, deletedAt: null },
      });
      resolvedPosition = activeCount;
    }

    const saved = existing
      ? await this.prisma.noteBlock.update({
          where: { id: blockId },
          data: {
            type: dto.type,
            position: resolvedPosition,
            content: packedContent as unknown as Prisma.InputJsonValue,
            deletedAt: null,
            version: { increment: 1 },
            updatedAt: now,
          },
        })
      : await this.prisma.noteBlock.create({
          data: {
            id: blockId,
            noteId,
            type: dto.type,
            position: resolvedPosition,
            content: packedContent as unknown as Prisma.InputJsonValue,
            version: 1,
            createdAt: now,
            updatedAt: now,
            deletedAt: null,
          },
        });

    await this.prisma.note.update({
      where: { id: noteId },
      data: { updatedAt: now },
    });

    return unpackServerNoteBlock(saved);
  }

  /**
   * Soft-deletes a single NoteBlock using a tombstone so delta-pull propagates to mobile/desktop.
   */
  async softDeleteBlock(
    userId: string,
    noteId: string,
    blockId: string,
  ): Promise<{ id: string; noteId: string; deletedAt: string }> {
    const parentNote = await this.prisma.note.findFirst({
      where: { id: noteId, userId, deletedAt: null },
    });
    if (!parentNote) {
      throw new NotFoundException(`Note with id "${noteId}" not found.`);
    }

    const existing = await this.prisma.noteBlock.findFirst({
      where: { id: blockId, noteId, deletedAt: null },
    });
    if (!existing) {
      throw new NotFoundException(
        `Block "${blockId}" not found in note "${noteId}".`,
      );
    }

    const now = new Date();
    await this.prisma.noteBlock.update({
      where: { id: blockId },
      data: {
        deletedAt: now,
        version: { increment: 1 },
        updatedAt: now,
      },
    });

    await this.prisma.note.update({
      where: { id: noteId },
      data: { updatedAt: now },
    });

    return {
      id: blockId,
      noteId,
      deletedAt: now.toISOString(),
    };
  }

  /**
   * Reorders active blocks for an owned note in a single transaction.
   */
  async reorderBlocks(
    userId: string,
    noteId: string,
    blockIds: string[],
  ): Promise<NoteBlock[]> {
    const parentNote = await this.prisma.note.findFirst({
      where: { id: noteId, userId, deletedAt: null },
    });
    if (!parentNote) {
      throw new NotFoundException(`Note with id "${noteId}" not found.`);
    }

    const activeBlocks = await this.prisma.noteBlock.findMany({
      where: { noteId, deletedAt: null },
      orderBy: { position: 'asc' },
    });
    const activeById = new Map(activeBlocks.map((b) => [b.id, b]));
    const now = new Date();

    const orderedIds = [
      ...blockIds.filter((id) => activeById.has(id)),
      ...activeBlocks
        .map((b) => b.id)
        .filter((id) => !blockIds.includes(id)),
    ];

    const updates = orderedIds
      .map((id, index) => {
        const current = activeById.get(id);
        if (!current || current.position === index) return null;
        return this.prisma.noteBlock.update({
          where: { id },
          data: {
            position: index,
            version: { increment: 1 },
            updatedAt: now,
          },
        });
      })
      .filter((op): op is NonNullable<typeof op> => op !== null);

    if (updates.length > 0) {
      await this.prisma.$transaction([
        ...updates,
        this.prisma.note.update({
          where: { id: noteId },
          data: { updatedAt: now },
        }),
      ]);
    }

    const refreshed = await this.prisma.noteBlock.findMany({
      where: { noteId, deletedAt: null },
      orderBy: { position: 'asc' },
    });

    return refreshed.map((b) => unpackServerNoteBlock(b));
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

  async upsertReminderWithLww(
    userId: string,
    r: ReminderMutationDto,
    prismaClient: Prisma.TransactionClient | PrismaService = this.prisma,
  ): Promise<{ applied: boolean; reminderId: string }> {
    const clientUpdatedAt = new Date(r.updatedAt);
    const existing = await prismaClient.reminder.findUnique({
      where: { id: r.id },
    });

    if (existing && existing.userId !== userId) {
      this.logger.warn(
        `LWW: Unauthorized reminder mutation attempt for ${r.id} by user ${userId}`,
      );
      return { applied: false, reminderId: r.id };
    }

    if (existing && clientUpdatedAt < existing.updatedAt) {
      this.logger.debug(
        `LWW: Skipping older reminder mutation for ${r.id} (client: ${r.updatedAt}, server: ${existing.updatedAt.toISOString()})`,
      );
      return { applied: false, reminderId: r.id };
    }

    if (r.action === 'delete') {
      if (!existing) {
        return { applied: false, reminderId: r.id };
      }
      await prismaClient.reminder.update({
        where: { id: r.id },
        data: {
          deletedAt: clientUpdatedAt,
          updatedAt: clientUpdatedAt,
        },
      });
      return { applied: true, reminderId: r.id };
    }

    const targetNoteId = r.changes?.noteId ?? existing?.noteId;
    const dueAt = r.changes?.dueAt ? new Date(r.changes.dueAt) : (existing?.dueAt ?? new Date());

    await prismaClient.reminder.upsert({
      where: { id: r.id },
      create: {
        id: r.id,
        userId,
        noteId: targetNoteId,
        title: r.changes?.title ?? '',
        dueAt,
        repeat: (r.changes?.repeat as any) ?? 'none',
        isCompleted: r.changes?.isCompleted ?? false,
        notificationId: r.changes?.notificationId,
        createdAt: r.changes?.createdAt ? new Date(r.changes.createdAt) : clientUpdatedAt,
        updatedAt: clientUpdatedAt,
        deletedAt: r.changes?.deletedAt ? new Date(r.changes.deletedAt) : null,
      },
      update: {
        userId,
        noteId: targetNoteId,
        ...(r.changes?.title !== undefined && { title: r.changes.title }),
        ...(r.changes?.dueAt !== undefined && { dueAt: new Date(r.changes.dueAt) }),
        ...(r.changes?.repeat !== undefined && { repeat: r.changes.repeat as any }),
        ...(r.changes?.isCompleted !== undefined && { isCompleted: r.changes.isCompleted }),
        ...(r.changes?.notificationId !== undefined && { notificationId: r.changes.notificationId }),
        ...(r.changes?.deletedAt !== undefined && {
          deletedAt: r.changes.deletedAt ? new Date(r.changes.deletedAt) : null,
        }),
        updatedAt: clientUpdatedAt,
      },
    });

    return { applied: true, reminderId: r.id };
  }

}
