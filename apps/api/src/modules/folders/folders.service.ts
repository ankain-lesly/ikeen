import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { FolderMutationPayload } from '@repo/types';
// import { DEFAULT_FOLDER_COLOR } from '@repo/utils/constants';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateFolderDto } from './dto/create-folder.dto.js';
import { UpdateFolderDto } from './dto/update-folder.dto.js';

export type FolderSyncData = FolderMutationPayload;

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
      orderBy: {
        sortOrder: 'asc',
      },
    });
  }

  /**
   * Retrieves a single folder by ID.
   */
  async findOne(userId: string, id: string) {
    const folder = await this.prisma.folder.findFirst({
      where: { id, userId, deletedAt: null },
    });

    if (!folder) {
      throw new NotFoundException(`Folder with ID ${id} not found`);
    }

    return folder;
  }

  /**
   * Creates a new folder.
   */
  async create(userId: string, dto: CreateFolderDto) {
    return this.prisma.folder.create({
      data: {
        userId,
        name: dto.name,
        // color: dto.color ?? DEFAULT_FOLDER_COLOR,
        color: dto.color ?? '#3b82f6',
        icon: dto.icon ?? 'folder',
        isLocked: dto.isLocked ?? false,
        pinCode: dto.pinCode,
        sortOrder: dto.sortOrder ?? 0,
        version: 1,
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
        ...dto,
        version: { increment: 1 },
      },
    });
  }

  /**
   * Soft deletes a folder.
   */
  async softDelete(userId: string, id: string) {
    await this.findOne(userId, id);

    return this.prisma.folder.update({
      where: { id },
      data: { deletedAt: new Date(), version: { increment: 1 } },
    });
  }

  /**
   * Reusable Last-Write-Wins (LWW) upsert for folders with partial patching and versioning.
   * Strictly reads entity properties from `f.changes`.
   */
  async upsertWithLww(
    userId: string,
    f: FolderMutationPayload,
    prismaClient: Prisma.TransactionClient | PrismaService = this.prisma,
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

    const nextVersion = Math.max((existing?.version ?? 0) + 1, f.version ?? 1);

    if (existing) {
      const patchData: Prisma.FolderUpdateInput = {
        updatedAt: clientUpdatedAt,
        version: nextVersion,
      };

      if (f.changes.name !== undefined) patchData.name = f.changes.name;
      if (f.changes.color !== undefined) patchData.color = f.changes.color;
      if (f.changes.icon !== undefined) patchData.icon = f.changes.icon;
      if (f.changes.isLocked !== undefined) patchData.isLocked = f.changes.isLocked;
      if (f.changes.pinCode !== undefined) patchData.pinCode = f.changes.pinCode;
      if (f.changes.sortOrder !== undefined) patchData.sortOrder = f.changes.sortOrder;
      if (f.changes.deletedAt !== undefined) {
        patchData.deletedAt = f.changes.deletedAt ? new Date(f.changes.deletedAt) : null;
      }
      if (f.changes.createdAt !== undefined) {
        patchData.createdAt = f.changes.createdAt ? new Date(f.changes.createdAt) : undefined;
      }

      await prismaClient.folder.update({
        where: { id: f.id },
        data: patchData,
      });
    } else {
      await prismaClient.folder.create({
        data: {
          id: f.id,
          userId,
          name: f.changes.name ?? '',
          // color: f.changes.color ?? DEFAULT_FOLDER_COLOR,
          color: f.changes.color ?? '#3b82f6',
          icon: f.changes.icon ?? 'folder',
          isLocked: f.changes.isLocked ?? false,
          pinCode: f.changes.pinCode ?? null,
          sortOrder: f.changes.sortOrder ?? 0,
          version: nextVersion,
          createdAt: clientUpdatedAt,
          updatedAt: clientUpdatedAt,
          deletedAt: f.changes.deletedAt ? new Date(f.changes.deletedAt) : null,
        },
      });
    }

    this.logger.debug(
      `[LWW:Folder:Applied] id=${f.id} action=${f.action} version=${nextVersion} isExisting=${!!existing}`,
    );

    return { applied: true, folderId: f.id };
  }
}
