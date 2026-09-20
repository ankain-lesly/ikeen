import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AblyService } from '../ably/ably.service';
import { FoldersService } from '../folders/folders.service';
import { NotesService } from '../notes/notes.service';
import { SyncPushDto } from './dto/sync-push.dto';
import { SYNC_CONSTANTS } from '@repo/utils/constants';
import type {
  SyncPullResponse,
  SyncPushResponse,
  SyncEntityType,
  SyncMutationBase,
} from '@repo/types';
import { Prisma, PrismaClient } from '@repo/db';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ablyService: AblyService,
    private readonly foldersService: FoldersService,
    private readonly notesService: NotesService,
  ) {}

  /**
   * Generates an Ably token request for client-side WebSocket authorization.
   */
  async createRealtimeAuth(userId: string) {
    return this.ablyService.createRealtimeAuth(userId);
  }

  /**
   * Checks if a mutation has already been recorded in sync_logs (idempotency check).
   */
  async isMutationProcessed(
    userId: string,
    mutationId: string,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ): Promise<boolean> {
    const existingLog = await tx.syncLog.findUnique({
      where: {
        userId_mutationId: { userId, mutationId },
      },
    });
    return !!existingLog;
  }

  /**
   * Records a processed mutation in sync_logs for idempotency and auditing.
   */
  async recordSyncLog(
    userId: string,
    entity: SyncEntityType,
    mutation: SyncMutationBase,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ): Promise<void> {
    await tx.syncLog.create({
      data: {
        userId,
        mutationId: mutation.mutationId,
        entity,
        entityId: mutation.id,
        action: mutation.action,
        version: mutation.version ?? 1,
        status: 'applied',
      },
    });
  }

  /**
   * Reusable batch processor for entity mutations with idempotency checking and audit logging.
   */
  async processMutations<T extends SyncMutationBase>(
    userId: string,
    entity: SyncEntityType,
    mutations: T[] | undefined,
    applyFn: (mutation: T, tx: Prisma.TransactionClient) => Promise<any>,
    tx: any,
  ): Promise<boolean> {
    if (!mutations || mutations.length === 0) return false;

    for (const mutation of mutations) {
      if (mutation.mutationId) {
        const isProcessed = await this.isMutationProcessed(
          userId,
          mutation.mutationId,
          tx,
        );
        if (isProcessed) {
          this.logger.debug(
            `Idempotency: Skipping already-processed ${entity} mutation ${mutation.mutationId}`,
          );
          continue;
        }
      }

      await applyFn(mutation, tx);

      if (mutation.mutationId) {
        await this.recordSyncLog(userId, entity, mutation, tx);
      }
    }

    return true;
  }

  /**
   * Processes a batch push of client-side outbox mutations with Last-Write-Wins (LWW)
   * and idempotency protection backed by the sync_logs table.
   */
  async push(userId: string, dto: SyncPushDto): Promise<SyncPushResponse> {
    const serverTimestamp = new Date().toISOString();
    const touchedEntities: string[] = [];

    await this.prisma.$transaction(async (tx: any) => {
      // 1. Process Folders
      const foldersTouched = await this.processMutations(
        userId,
        'folders',
        dto.folders,
        (f, t) => this.foldersService.upsertWithLww(userId, f, t),
        tx,
      );
      if (foldersTouched) touchedEntities.push('folders');

      // 2. Process Notes
      const notesTouched = await this.processMutations(
        userId,
        'notes',
        dto.notes,
        (n, t) => this.notesService.upsertWithLww(userId, n, t),
        tx,
      );
      if (notesTouched) touchedEntities.push('notes');
    });

    // Broadcast invalidation ping over Ably to alert other devices of this user
    if (touchedEntities.length > 0) {
      this.ablyService
        .publishInvalidation(userId, touchedEntities)
        .catch(() => {});
    }

    return {
      success: true,
      serverTimestamp,
    };
  }

  /**
   * Fetches all entity deltas (including soft deletes) updated after `since`.
   * Pull limits are enforced internally via SYNC_CONSTANTS.PULL_LIMIT.
   */
  async pull(userId: string, since?: string): Promise<SyncPullResponse> {
    const serverTimestamp = new Date().toISOString();
    const sinceDate = since ? new Date(since) : new Date(0);

    const [folders, notes] = await Promise.all([
      this.prisma.folder.findMany({
        where: {
          userId,
          updatedAt: { gt: sinceDate },
        },
        take: SYNC_CONSTANTS.PULL_LIMIT,
        orderBy: { updatedAt: 'asc' },
      }),
      this.prisma.note.findMany({
        where: {
          userId,
          updatedAt: { gt: sinceDate },
        },
        take: SYNC_CONSTANTS.PULL_LIMIT,
        orderBy: { updatedAt: 'asc' },
      }),
    ]);

    return {
      serverTimestamp,
      folders: folders.map((f: any) => ({
        id: f.id,
        name: f.name,
        color: f.color,
        icon: f.icon,
        isLocked: f.isLocked,
        pinCode: f.pinCode,
        sortOrder: f.sortOrder,
        version: f.version ?? 1,
        createdAt: f.createdAt.toISOString(),
        updatedAt: f.updatedAt.toISOString(),
        deletedAt: f.deletedAt ? f.deletedAt.toISOString() : null,
      })),
      notes: notes.map((n: any) => ({
        id: n.id,
        folderId: n.folderId,
        title: n.title,
        content: n.content,
        tags: n.tags,
        isPinned: n.isPinned,
        isArchived: n.isArchived,
        summary: n.summary,
        version: n.version ?? 1,
        createdAt: n.createdAt.toISOString(),
        updatedAt: n.updatedAt.toISOString(),
        deletedAt: n.deletedAt ? n.deletedAt.toISOString() : null,
      })),
    };
  }
}
