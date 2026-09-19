import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AblyService } from '../ably/ably.service';
import { FoldersService } from '../folders/folders.service';
import { NotesService } from '../notes/notes.service';
import { SyncPushDto } from './dto/sync-push.dto';

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
   * Processes a batch push of client-side outbox mutations with Last-Write-Wins (LWW).
   * Delegates mutation handling to FoldersService and NotesService within a Prisma transaction.
   */
  async push(userId: string, dto: SyncPushDto) {
    const serverTimestamp = new Date().toISOString();
    const touchedEntities: string[] = [];

    await this.prisma.$transaction(async (tx: any) => {
      // 1. Process Folders via FoldersService
      if (dto.folders && dto.folders.length > 0) {
        touchedEntities.push('folders');

        for (const f of dto.folders) {
          await this.foldersService.upsertWithLww(userId, f, tx);
        }
      }

      // 2. Process Notes via NotesService
      if (dto.notes && dto.notes.length > 0) {
        touchedEntities.push('notes');

        for (const n of dto.notes) {
          await this.notesService.upsertWithLww(userId, n, tx);
        }
      }
    });

    // Broadcast invalidation ping over Ably to alert other devices of this user
    if (touchedEntities.length > 0) {
      this.ablyService.publishInvalidation(userId, touchedEntities).catch(() => {});
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
        tags: n.tags, // Native string[] array
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
