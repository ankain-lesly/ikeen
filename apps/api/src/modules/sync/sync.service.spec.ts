import { Test, TestingModule } from '@nestjs/testing';
import { SyncService } from './sync.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('SyncService', () => {
  let service: SyncService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      $transaction: vi.fn(async (cb) => cb(prisma)),
      folder: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        upsert: vi.fn(),
        findMany: vi.fn(),
      },
      note: {
        findUnique: vi.fn(),
        upsert: vi.fn(),
        findMany: vi.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyncService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<SyncService>(SyncService);
  });

  describe('push', () => {
    it('should upsert folders and notes in a transaction', async () => {
      prisma.folder.findUnique.mockResolvedValue(null);
      prisma.note.findUnique.mockResolvedValue(null);
      prisma.folder.upsert.mockResolvedValue({ id: 'f-1' });
      prisma.note.upsert.mockResolvedValue({ id: 'n-1' });

      const result = await service.push('user-1', {
        clientTimestamp: new Date().toISOString(),
        folders: [
          {
            id: 'f-1',
            name: 'Personal',
            createdAt: '2026-09-18T10:00:00.000Z',
            updatedAt: '2026-09-18T10:00:00.000Z',
          },
        ],
        notes: [
          {
            id: 'n-1',
            title: 'My First Note',
            content: 'Hello World',
            createdAt: '2026-09-18T10:00:00.000Z',
            updatedAt: '2026-09-18T10:00:00.000Z',
          },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.serverTimestamp).toBeDefined();
      expect(prisma.folder.upsert).toHaveBeenCalled();
      expect(prisma.note.upsert).toHaveBeenCalled();
    });

    it('should skip older mutations when existing record in DB is newer (LWW)', async () => {
      // Existing in DB has newer updatedAt
      prisma.note.findUnique.mockResolvedValue({
        id: 'n-1',
        updatedAt: new Date('2026-09-18T12:00:00.000Z'),
      });

      const result = await service.push('user-1', {
        notes: [
          {
            id: 'n-1',
            title: 'Stale Edit',
            content: 'Older text',
            createdAt: '2026-09-18T10:00:00.000Z',
            updatedAt: '2026-09-18T11:00:00.000Z', // Older than DB's 12:00
          },
        ],
      });

      expect(result.success).toBe(true);
      expect(prisma.note.upsert).not.toHaveBeenCalled();
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
          tags: '[]',
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
    });
  });

  describe('createRealtimeAuth', () => {
    it('should return enabled: false when Ably API key is not configured', async () => {
      const result = await service.createRealtimeAuth('user-1');
      expect(result.enabled).toBe(false);
    });
  });
});
