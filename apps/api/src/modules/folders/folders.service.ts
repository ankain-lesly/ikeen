import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateFolderDto } from './dto/create-folder.dto';
import { UpdateFolderDto } from './dto/update-folder.dto';

export interface FolderSyncData {
  id: string;
  name: string;
  color?: string;
  icon?: string;
  isLocked?: boolean;
  pinCode?: string | null;
  sortOrder?: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

@Injectable()
export class FoldersService {
  private readonly logger = new Logger(FoldersService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieves all active (non-deleted) folders for a user.
   */
  async findAll(userId: string) {
    return this.prisma.folder.findMany({
      where: {
        userId,
        deletedAt: null,
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  /**
   * Finds a single active folder by ID.
   */
  async findOne(userId: string, id: string) {
    const folder = await this.prisma.folder.findFirst({
      where: { id, userId, deletedAt: null },
    });
    if (!folder) {
      throw new NotFoundException(`Folder with id "${id}" not found.`);
    }
    return folder;
  }

  /**
   * Creates a new folder.
   */
  async create(userId: string, dto: CreateFolderDto) {
    return this.prisma.folder.create({
      data: {
        id: dto.id,
        userId,
        name: dto.name,
        color: dto.color ?? '#3b82f6',
        icon: dto.icon ?? 'folder',
        isLocked: dto.isLocked ?? false,
        pinCode: dto.pinCode ?? null,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  /**
   * Updates an existing folder.
   */
  async update(userId: string, id: string, dto: UpdateFolderDto) {
    await this.findOne(userId, id);

    return this.prisma.folder.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.color !== undefined && { color: dto.color }),
        ...(dto.icon !== undefined && { icon: dto.icon }),
        ...(dto.isLocked !== undefined && { isLocked: dto.isLocked }),
        ...(dto.pinCode !== undefined && { pinCode: dto.pinCode }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      },
    });
  }

  /**
   * Soft deletes a folder by setting deletedAt.
   */
  async softDelete(userId: string, id: string) {
    await this.findOne(userId, id);

    return this.prisma.folder.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Reusable Last-Write-Wins (LWW) upsert for folders.
   * Can be executed inside an existing Prisma transaction or standalone.
   */
  async upsertWithLww(
    userId: string,
    f: FolderSyncData,
    prismaClient: any = this.prisma,
  ): Promise<{ applied: boolean; folderId: string }> {
    const clientUpdatedAt = new Date(f.updatedAt);
    const existing = await prismaClient.folder.findUnique({
      where: { id: f.id },
    });

    if (existing && clientUpdatedAt < existing.updatedAt) {
      this.logger.debug(
        `LWW: Skipping older folder mutation for ${f.id} (client: ${f.updatedAt}, server: ${existing.updatedAt.toISOString()})`,
      );
      return { applied: false, folderId: f.id };
    }

    await prismaClient.folder.upsert({
      where: { id: f.id },
      create: {
        id: f.id,
        userId,
        name: f.name,
        color: f.color ?? '#3b82f6',
        icon: f.icon ?? 'folder',
        isLocked: f.isLocked ?? false,
        pinCode: f.pinCode ?? null,
        sortOrder: f.sortOrder ?? 0,
        createdAt: new Date(f.createdAt),
        updatedAt: clientUpdatedAt,
        deletedAt: f.deletedAt ? new Date(f.deletedAt) : null,
      },
      update: {
        name: f.name,
        color: f.color ?? '#3b82f6',
        icon: f.icon ?? 'folder',
        isLocked: f.isLocked ?? false,
        pinCode: f.pinCode ?? null,
        sortOrder: f.sortOrder ?? 0,
        updatedAt: clientUpdatedAt,
        deletedAt: f.deletedAt ? new Date(f.deletedAt) : null,
      },
    });

    return { applied: true, folderId: f.id };
  }
}
