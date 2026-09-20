import { Test, TestingModule } from '@nestjs/testing';
import { SyncService } from './sync.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AblyService } from '../ably/ably.service';
import { FoldersService } from '../folders/folders.service';
import { NotesService } from '../notes/notes.service';

describe('SyncService', () => {
  let service: SyncService;
  let prisma: any;
  let ablyService: any;
  let foldersService: any;
  let notesService: any;

  beforeEach(async () => {
    prisma = {
      $transaction: vi.fn(async (cb) => cb(prisma)),
      syncLog: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: 'log-1' }),
      },
      folder: {
        findMany: vi.fn(),
      },
      note: {
        findMany: vi.fn(),
      },
    };

    ablyService = {
      createRealtimeAuth: vi.fn().mockResolvedValue({ enabled: false }),
      publishInvalidation: vi.fn().mockResolvedValue(undefined),
    };

    foldersService = {
      upsertWithLww: vi.fn().mockResolvedValue({ applied: true, folderId: 'f-1' }),
    };

    notesService = {
      upsertWithLww: vi.fn().mockResolvedValue({ applied: true, noteId: 'n-1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyncService,
        { provide: PrismaService, useValue: prisma },
        { provide: AblyService, useValue: ablyService },
        { provide: FoldersService, useValue: foldersService },
        { provide: NotesService, useValue: notesService },
      ],
    }).compile();

    service = module.get<SyncService>(SyncService);
  });

  describe('push', () => {
    it('should delegate folder and note mutations to respective services and record sync_logs', async () => {
      const result = await service.push('user-1', {
        clientTimestamp: new Date().toISOString(),
        folders: [
          {
            id: 'f-1',
            mutationId: 'folders:upsert:f-1',
            action: 'upsert',
            version: 1,
            changes: { name: 'Personal' },
            updatedAt: '2026-09-18T10:00:00.000Z',
          },
        ],
        notes: [
          {
            id: 'n-1',
            mutationId: 'notes:upsert:n-1',
            action: 'upsert',
            version: 1,
            changes: { title: 'My First Note', tags: ['tag1'] },
            updatedAt: '2026-09-18T10:00:00.000Z',
          },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.serverTimestamp).toBeDefined();
      expect(foldersService.upsertWithLww).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ id: 'f-1' }),
        prisma,
      );
      expect(notesService.upsertWithLww).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ id: 'n-1' }),
        prisma,
      );
      expect(prisma.syncLog.create).toHaveBeenCalledTimes(2);
      expect(ablyService.publishInvalidation).toHaveBeenCalledWith('user-1', [
        'folders',
        'notes',
      ]);
    });

    it('should skip duplicate mutations already logged in sync_logs (idempotency)', async () => {
      prisma.syncLog.findUnique.mockResolvedValueOnce({ id: 'existing-log-1' });

      const result = await service.push('user-1', {
        clientTimestamp: new Date().toISOString(),
        folders: [
          {
            id: 'f-1',
            mutationId: 'folders:upsert:f-1',
            action: 'upsert',
            changes: { name: 'Personal' },
            updatedAt: '2026-09-18T10:00:00.000Z',
          },
        ],
      });

      expect(result.success).toBe(true);
      expect(foldersService.upsertWithLww).not.toHaveBeenCalled();
      expect(prisma.syncLog.create).not.toHaveBeenCalled();
    });
  });

  describe('pull', () => {
    it('should query folders and notes updated after since timestamp', async () => {
      const now = new Date();
      prisma.folder.findMany.mockResolvedValue([
        {
          id: 'f-1',
          name: 'Work',
          color: '#3b82f6',
          icon: 'folder',
          isLocked: false,
          pinCode: null,
          sortOrder: 0,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        },
      ]);
      prisma.note.findMany.mockResolvedValue([
        {
          id: 'n-1',
          folderId: 'f-1',
          title: 'Meeting Notes',
          content: 'Important items',
          tags: ['work', 'meeting'],
          isPinned: false,
          isArchived: false,
          summary: null,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        },
      ]);

      const result = await service.pull('user-1', '2026-09-18T00:00:00.000Z');

      expect(result.serverTimestamp).toBeDefined();
      expect(result.folders).toHaveLength(1);
      expect(result.notes).toHaveLength(1);
      expect(result.folders[0].name).toBe('Work');
      expect(result.notes[0].title).toBe('Meeting Notes');
      expect(result.notes[0].tags).toEqual(['work', 'meeting']);
    });
  });

  describe('createRealtimeAuth', () => {
    it('should delegate to ablyService', async () => {
      await service.createRealtimeAuth('user-1');
      expect(ablyService.createRealtimeAuth).toHaveBeenCalledWith('user-1');
    });
  });
});
