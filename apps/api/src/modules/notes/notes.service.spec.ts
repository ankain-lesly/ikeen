import { Test, TestingModule } from '@nestjs/testing';
import { NotesService } from './notes.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('NotesService', () => {
  let service: NotesService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      note: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        upsert: vi.fn(),
      },
      folder: {
        findFirst: vi.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<NotesService>(NotesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a note with native string[] tags', async () => {
      const mockCreated = {
        id: 'n-1',
        userId: 'u-1',
        title: 'Title',
        content: 'Body',
        tags: ['urgent', 'work'],
      };
      prisma.note.create.mockResolvedValue(mockCreated);

      const result = await service.create('u-1', {
        title: 'Title',
        content: 'Body',
        tags: ['urgent', 'work'],
      });

      expect(result).toEqual(mockCreated);
      expect(prisma.note.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'u-1',
          title: 'Title',
          tags: ['urgent', 'work'],
        }),
      });
    });
  });

  describe('upsertWithLww', () => {
    it('should apply upsert with native tags when no existing record', async () => {
      prisma.note.findUnique.mockResolvedValue(null);
      prisma.note.upsert.mockResolvedValue({ id: 'n-1' });

      const res = await service.upsertWithLww('u-1', {
        id: 'n-1',
        title: 'Sync Note',
        tags: ['tag1', 'tag2'],
        createdAt: '2026-09-18T10:00:00.000Z',
        updatedAt: '2026-09-18T10:00:00.000Z',
      });

      expect(res.applied).toBe(true);
      expect(prisma.note.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'n-1' },
          create: expect.objectContaining({
            tags: ['tag1', 'tag2'],
          }),
        }),
      );
    });

    it('should skip older mutations when existing record is newer', async () => {
      prisma.note.findUnique.mockResolvedValue({
        id: 'n-1',
        updatedAt: new Date('2026-09-18T15:00:00.000Z'),
      });

      const res = await service.upsertWithLww('u-1', {
        id: 'n-1',
        title: 'Older Note',
        createdAt: '2026-09-18T10:00:00.000Z',
        updatedAt: '2026-09-18T12:00:00.000Z',
      });

      expect(res.applied).toBe(false);
      expect(prisma.note.upsert).not.toHaveBeenCalled();
    });
  });
});
