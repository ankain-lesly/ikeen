import { Injectable, Logger } from '@nestjs/common';
import * as Ably from 'ably';
import { PrismaService } from '../../prisma/prisma.service';
import { SyncPushDto } from './dto/sync-push.dto';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);
  private ablyRest: Ably.Rest | null = null;

  constructor(private readonly prisma: PrismaService) {
    const ablyApiKey = process.env.ABLY_API_KEY;
    if (ablyApiKey) {
      this.ablyRest = new Ably.Rest({ key: ablyApiKey });
      this.logger.log('Ably Realtime initialized successfully for SyncModule');
    } else {
      this.logger.warn(
        'ABLY_API_KEY is not configured. Real-time WebSocket invalidations will be skipped.',
      );
    }
  }

  /**
   * Generates an Ably token request for client-side WebSocket authorization.
   */
  async createRealtimeAuth(userId: string) {
    if (!this.ablyRest) {
      return {
        enabled: false,
        message: 'Ably is not configured on this server.',
      };
    }

    try {
      const tokenRequest = await this.ablyRest.auth.createTokenRequest({
        clientId: userId,
        capability: {
          [`user:${userId}`]: ['subscribe'],
        },
      });

      return {
        enabled: true,
        tokenRequest,
      };
    } catch (err: any) {
      this.logger.error(`Failed to create Ably token request: ${err.message}`);
      return {
        enabled: false,
        error: err.message,
      };
    }
  }

  /**
   * Broadcasts a sync invalidation ping over Ably to alert all active client devices.
   */
  private async publishInvalidation(userId: string, entities: string[]) {
    if (!this.ablyRest) return;

    try {
      const channel = this.ablyRest.channels.get(`user:${userId}`);
      await channel.publish('sync:invalidate', {
        timestamp: new Date().toISOString(),
        entities,
      });
    } catch (err: any) {
      this.logger.warn(`Failed to publish Ably sync invalidation: ${err.message}`);
    }
  }

  /**
   * Processes a batch push of client-side outbox mutations with Last-Write-Wins (LWW).
   */
  async push(userId: string, dto: SyncPushDto) {
    const serverTimestamp = new Date().toISOString();
    const touchedEntities: string[] = [];

    await this.prisma.$transaction(async (tx: any) => {
      // 1. Process Folders
      if (dto.folders && dto.folders.length > 0) {
        touchedEntities.push('folders');

        for (const f of dto.folders) {
          const clientUpdatedAt = new Date(f.updatedAt);
          const existing = await tx.folder.findUnique({
            where: { id: f.id },
          });

          // Last-Write-Wins check
          if (existing && clientUpdatedAt < existing.updatedAt) {
            this.logger.debug(
              `LWW: Skipping older folder mutation for ${f.id} (client: ${f.updatedAt}, server: ${existing.updatedAt.toISOString()})`,
            );
            continue;
          }

          await tx.folder.upsert({
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
        }
      }

      // 2. Process Notes
      if (dto.notes && dto.notes.length > 0) {
        touchedEntities.push('notes');

        for (const n of dto.notes) {
          const clientUpdatedAt = new Date(n.updatedAt);
          const existing = await tx.note.findUnique({
            where: { id: n.id },
          });

          // Last-Write-Wins check
          if (existing && clientUpdatedAt < existing.updatedAt) {
            this.logger.debug(
              `LWW: Skipping older note mutation for ${n.id} (client: ${n.updatedAt}, server: ${existing.updatedAt.toISOString()})`,
            );
            continue;
          }

          // If folderId is specified, ensure it belongs to the user or set null
          let validatedFolderId: string | null = null;
          if (n.folderId) {
            const folderExists = await tx.folder.findFirst({
              where: { id: n.folderId, userId },
            });
            if (folderExists) {
              validatedFolderId = n.folderId;
            }
          }

          await tx.note.upsert({
            where: { id: n.id },
            create: {
              id: n.id,
              userId,
              folderId: validatedFolderId,
              title: n.title ?? '',
              content: n.content ?? '',
              tags: n.tags ?? '[]',
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
              tags: n.tags ?? '[]',
              isPinned: n.isPinned ?? false,
              isArchived: n.isArchived ?? false,
              summary: n.summary ?? null,
              updatedAt: clientUpdatedAt,
              deletedAt: n.deletedAt ? new Date(n.deletedAt) : null,
            },
          });
        }
      }
    });

    // Notify connected devices via Ably in background
    if (touchedEntities.length > 0) {
      this.publishInvalidation(userId, touchedEntities).catch(() => {});
    }

    return {
      success: true,
      serverTimestamp,
    };
  }

  /**
   * Fetches all entity deltas (including soft deletes) updated after `since`.
   */
  async pull(userId: string, since?: string) {
    const serverTimestamp = new Date().toISOString();
    const sinceDate = since ? new Date(since) : new Date(0);

    const [folders, notes] = await Promise.all([
      this.prisma.folder.findMany({
        where: {
          userId,
          updatedAt: { gt: sinceDate },
        },
        orderBy: { updatedAt: 'asc' },
      }),
      this.prisma.note.findMany({
        where: {
          userId,
          updatedAt: { gt: sinceDate },
        },
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
        createdAt: n.createdAt.toISOString(),
        updatedAt: n.updatedAt.toISOString(),
        deletedAt: n.deletedAt ? n.deletedAt.toISOString() : null,
      })),
    };
  }
}
