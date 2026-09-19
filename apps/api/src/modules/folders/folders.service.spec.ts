import { Test, TestingModule } from '@nestjs/testing';
import { FoldersService } from './folders.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('FoldersService', () => {
  let service: FoldersService;
  let prisma: any;

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
    it('should apply upsert when no existing record', async () => {
      prisma.folder.findUnique.mockResolvedValue(null);
      prisma.folder.upsert.mockResolvedValue({ id: 'f-1' });

      const res = await service.upsertWithLww('u-1', {
        id: 'f-1',
        name: 'Work',
        createdAt: '2026-09-18T10:00:00.000Z',
        updatedAt: '2026-09-18T10:00:00.000Z',
      });

      expect(res.applied).toBe(true);
      expect(prisma.folder.upsert).toHaveBeenCalled();
    });

    it('should skip upsert when server record has newer updatedAt', async () => {
      prisma.folder.findUnique.mockResolvedValue({
        id: 'f-1',
        updatedAt: new Date('2026-09-18T12:00:00.000Z'),
      });

      const res = await service.upsertWithLww('u-1', {
        id: 'f-1',
        name: 'Work',
        createdAt: '2026-09-18T10:00:00.000Z',
        updatedAt: '2026-09-18T11:00:00.000Z',
      });

      expect(res.applied).toBe(false);
      expect(prisma.folder.upsert).not.toHaveBeenCalled();
    });
  });
});
