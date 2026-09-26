import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AblyService } from '../ably/ably.service.js';
import { FoldersService } from '../folders/folders.service.js';
import { NotesService } from '../notes/notes.service.js';
import { SyncPushDto } from './dto/sync-push.dto.js';
import { CheckUpdatesQueryDto } from './dto/check-updates.dto.js';
import { SYNC_CONSTANTS } from '@repo/utils/constants';
import { log } from '@repo/utils/logger';
import type {
  SyncPullResponse,
  SyncPushResponse,
  SyncEntityType,
  SyncMutationBase,
  AppUpdateInfo,
} from '@repo/types/sync';
import type { Prisma } from '@repo/db';

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
    applyFn: (mutation: T, tx: Prisma.TransactionClient) => Promise<unknown>,
    tx: Prisma.TransactionClient,
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
          log('[Sync:Idempotency:Skip]', {
            userId,
            entity,
            mutationId: mutation.mutationId,
          });
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
    const startTime = Date.now();
    const serverTimestamp = new Date().toISOString();
    const touchedEntities: string[] = [];

    log('[Sync:Push:Received]', {
      userId,
      foldersCount: dto.folders?.length ?? 0,
      notesCount: dto.notes?.length ?? 0,
      clientTimestamp: dto.clientTimestamp,
    });

    try {
      await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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

      log('[Sync:Push:Success]', {
        userId,
        touchedEntities,
        durationMs: Date.now() - startTime,
      });

      return {
        success: true,
        serverTimestamp,
      };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      log('[Sync:Push:Error]', { userId, error: errorMessage });
      throw err;
    }
  }

  /**
   * Fetches all entity deltas (including soft deletes) updated after `since`.
   * Pull limits are enforced internally via SYNC_CONSTANTS.PULL_LIMIT.
   */
  async pull(userId: string, since?: string): Promise<SyncPullResponse> {
    const serverTimestamp = new Date().toISOString();
    const sinceDate = since ? new Date(since) : new Date(0);

    log('[Sync:Pull:Received]', {
      userId,
      since: since ?? 'epoch',
      limit: SYNC_CONSTANTS.PULL_LIMIT,
    });

    try {
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

      log('[Sync:Pull:Success]', {
        userId,
        foldersCount: folders.length,
        notesCount: notes.length,
        serverTimestamp,
      });

      return {
        serverTimestamp,
        folders: folders.map((f) => ({
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
        notes: notes.map((n) => ({
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
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      log('[Sync:Pull:Error]', { userId, error: errorMessage });
      throw err;
    }
  }

  /**
   * Retrieves app update information for mobile clients.
   */
  getAppUpdates(query?: CheckUpdatesQueryDto): AppUpdateInfo {
    const latestVersion = '1.0.1';
    const latestBuild = 2;
    const minRequiredVersion = '1.0.0';
    const isGloballyMandatory = false;

    let mandatory = isGloballyMandatory;
    if (query?.currentVersion && !mandatory) {
      mandatory = this.isOlderVersion(query.currentVersion, minRequiredVersion);
    }

    const platform = query?.platform?.toLowerCase();
    let url = 'https://github.com/ankain-lesly/ikeen/releases';
    if (platform === 'android') {
      // (Could use a dedicated Android URL if specified in the future)
    } else if (platform === 'ios') {
      // (Could use a dedicated iOS URL if specified in the future)
    }

    return {
      version: latestVersion,
      build: latestBuild,
      mandatory,
      title: 'New Update Available 🚀',
      description:
        '• Improved sync performance\n• AI agent chat improvements\n• General bug fixes and stability improvements',
      url,
    };
  }

  private isOlderVersion(currentVersion: string, targetVersion: string): boolean {
    const a = currentVersion.split('.').map(Number);
    const b = targetVersion.split('.').map(Number);
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      const partA = a[i] || 0;
      const partB = b[i] || 0;
      if (partA < partB) return true;
      if (partA > partB) return false;
    }
    return false;
  }
}
