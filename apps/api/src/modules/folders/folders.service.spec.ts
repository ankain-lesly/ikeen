import { Test, TestingModule } from '@nestjs/testing';
import { FoldersService } from './folders.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';

type MockPrisma = {
  folder: Record<string, ReturnType<typeof vi.fn>>;
};

describe('FoldersService', () => {
  let service: FoldersService;
  let prisma: MockPrisma;

  beforeEach(async () => {
    prisma = {
      folder: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        upsert: vi.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FoldersService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<FoldersService>(FoldersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return active folders for user', async () => {
      const mockFolders = [{ id: 'f-1', name: 'Work', userId: 'u-1' }];
      prisma.folder.findMany.mockResolvedValue(mockFolders);

      const result = await service.findAll('u-1');
      expect(result).toEqual(mockFolders);
      expect(prisma.folder.findMany).toHaveBeenCalledWith({
        where: { userId: 'u-1', deletedAt: null },
        orderBy: { sortOrder: 'asc' },
      });
    });
  });

  describe('upsertWithLww', () => {
    it('should create record when no existing folder found', async () => {
      prisma.folder.findUnique.mockResolvedValue(null);
      prisma.folder.create.mockResolvedValue({ id: 'f-1' });

      const res = await service.upsertWithLww('u-1', {
        id: 'f-1',
        mutationId: 'folders:upsert:f-1',
        action: 'upsert',
        changes: { name: 'Work' },
        updatedAt: '2026-09-18T10:00:00.000Z',
      });

      expect(res.applied).toBe(true);
      expect(prisma.folder.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            id: 'f-1',
            userId: 'u-1',
            name: 'Work',
          }),
        }),
      );
    });

    it('should update record when existing folder is older', async () => {
      prisma.folder.findUnique.mockResolvedValue({
        id: 'f-1',
        version: 1,
        updatedAt: new Date('2026-09-18T09:00:00.000Z'),
      });
      prisma.folder.update.mockResolvedValue({ id: 'f-1' });

      const res = await service.upsertWithLww('u-1', {
        id: 'f-1',
        mutationId: 'folders:upsert:f-1',
        action: 'upsert',
        changes: { name: 'Renamed Work' },
        updatedAt: '2026-09-18T11:00:00.000Z',
      });

      expect(res.applied).toBe(true);
      expect(prisma.folder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'f-1' },
          data: expect.objectContaining({
            name: 'Renamed Work',
            version: 2,
          }),
        }),
      );
    });

    it('should skip upsert when server record has newer updatedAt', async () => {
      prisma.folder.findUnique.mockResolvedValue({
        id: 'f-1',
        updatedAt: new Date('2026-09-18T12:00:00.000Z'),
      });

      const res = await service.upsertWithLww('u-1', {
        id: 'f-1',
        mutationId: 'folders:upsert:f-1',
        action: 'upsert',
        changes: { name: 'Work' },
        updatedAt: '2026-09-18T11:00:00.000Z',
      });

      expect(res.applied).toBe(false);
      expect(prisma.folder.create).not.toHaveBeenCalled();
      expect(prisma.folder.update).not.toHaveBeenCalled();
    });
  });
});
