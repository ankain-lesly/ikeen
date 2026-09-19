import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';

export interface NoteSyncData {
  id: string;
  folderId?: string | null;
  title: string;
  content?: string;
  tags?: string[];
  isPinned?: boolean;
  isArchived?: boolean;
  summary?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

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
    // Validate folder ownership if folderId is provided
    let validatedFolderId: string | null = null;
    if (dto.folderId) {
      const folder = await this.prisma.folder.findFirst({
        where: { id: dto.folderId, userId },
      });
      if (folder) {
        validatedFolderId = dto.folderId;
      }
    }

    return this.prisma.note.create({
      data: {
        id: dto.id,
        userId,
        folderId: validatedFolderId,
        title: dto.title ?? '',
        content: dto.content ?? '',
        tags: dto.tags ?? [],
        isPinned: dto.isPinned ?? false,
        isArchived: dto.isArchived ?? false,
        summary: dto.summary ?? null,
      },
    });
  }

  /**
   * Updates an existing note.
   */
  async update(userId: string, id: string, dto: UpdateNoteDto) {
    await this.findOne(userId, id);

    let validatedFolderId: string | null | undefined = undefined;
    if (dto.folderId !== undefined) {
      if (dto.folderId === null) {
        validatedFolderId = null;
      } else {
        const folder = await this.prisma.folder.findFirst({
          where: { id: dto.folderId, userId },
        });
        validatedFolderId = folder ? dto.folderId : null;
      }
    }

    return this.prisma.note.update({
      where: { id },
      data: {
        ...(validatedFolderId !== undefined && { folderId: validatedFolderId }),
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.content !== undefined && { content: dto.content }),
        ...(dto.tags !== undefined && { tags: dto.tags }),
        ...(dto.isPinned !== undefined && { isPinned: dto.isPinned }),
        ...(dto.isArchived !== undefined && { isArchived: dto.isArchived }),
        ...(dto.summary !== undefined && { summary: dto.summary }),
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
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Reusable Last-Write-Wins (LWW) upsert for notes.
   * Can be executed inside an existing Prisma transaction or standalone.
   */
  async upsertWithLww(
    userId: string,
    n: NoteSyncData,
    prismaClient: any = this.prisma,
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

    let validatedFolderId: string | null = null;
    if (n.folderId) {
      const folderExists = await prismaClient.folder.findFirst({
        where: { id: n.folderId, userId },
      });
      if (folderExists) {
        validatedFolderId = n.folderId;
      }
    }

    // Ensure tags is a native string array
    const tagsArray = Array.isArray(n.tags) ? n.tags : [];

    await prismaClient.note.upsert({
      where: { id: n.id },
      create: {
        id: n.id,
        userId,
        folderId: validatedFolderId,
        title: n.title ?? '',
        content: n.content ?? '',
        tags: tagsArray,
        isPinned: n.isPinned ?? false,
        isArchived: n.isArchived ?? false,
        summary: n.summary ?? null,
        createdAt: new Date(n.createdAt),
        updatedAt: clientUpdatedAt,
        deletedAt: n.deletedAt ? new Date(n.deletedAt) : null,
      },
      update: {
        folderId: validatedFolderId,
        title: n.title ?? '',
        content: n.content ?? '',
        tags: tagsArray,
        isPinned: n.isPinned ?? false,
        isArchived: n.isArchived ?? false,
        summary: n.summary ?? null,
        updatedAt: clientUpdatedAt,
        deletedAt: n.deletedAt ? new Date(n.deletedAt) : null,
      },
    });

    return { applied: true, noteId: n.id };
  }
}
