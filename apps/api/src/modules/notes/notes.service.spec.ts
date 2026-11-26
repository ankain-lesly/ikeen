import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { NotesService } from './notes.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';

type MockPrisma = {
  note: Record<string, ReturnType<typeof vi.fn>>;
  noteBlock: Record<string, ReturnType<typeof vi.fn>>;
  folder: Record<string, ReturnType<typeof vi.fn>>;
  $transaction: ReturnType<typeof vi.fn>;
};

describe('NotesService', () => {
  let service: NotesService;
  let prisma: MockPrisma;

  beforeEach(async () => {
    prisma = {
      note: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        upsert: vi.fn(),
        delete: vi.fn(),
      },
      noteBlock: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      folder: {
        findFirst: vi.fn(),
      },
      $transaction: vi.fn((ops: unknown[]) => Promise.all(ops)),
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
    it('should create record with native tags when no existing record', async () => {
      prisma.note.findUnique.mockResolvedValue(null);
      prisma.note.create.mockResolvedValue({ id: 'n-1' });

      const res = await service.upsertWithLww('u-1', {
        id: 'n-1',
        mutationId: 'notes:upsert:n-1',
        action: 'upsert',
        changes: { title: 'Sync Note', tags: ['tag1', 'tag2'] },
        updatedAt: '2026-09-18T10:00:00.000Z',
      });

      expect(res.applied).toBe(true);
      expect(prisma.note.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            id: 'n-1',
            userId: 'u-1',
            title: 'Sync Note',
            tags: ['tag1', 'tag2'],
          }),
        }),
      );
    });

    it('should update record when existing note is older', async () => {
      prisma.note.findUnique.mockResolvedValue({
        id: 'n-1',
        version: 1,
        updatedAt: new Date('2026-09-18T09:00:00.000Z'),
      });
      prisma.note.update.mockResolvedValue({ id: 'n-1' });

      const res = await service.upsertWithLww('u-1', {
        id: 'n-1',
        mutationId: 'notes:upsert:n-1',
        action: 'upsert',
        changes: { title: 'Updated Note', tags: ['updated'] },
        updatedAt: '2026-09-18T11:00:00.000Z',
      });

      expect(res.applied).toBe(true);
      expect(prisma.note.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'n-1' },
          data: expect.objectContaining({
            title: 'Updated Note',
            tags: ['updated'],
            version: 2,
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
        mutationId: 'notes:upsert:n-1',
        action: 'upsert',
        changes: { title: 'Older Note' },
        updatedAt: '2026-09-18T12:00:00.000Z',
      });

      expect(res.applied).toBe(false);
      expect(prisma.note.create).not.toHaveBeenCalled();
      expect(prisma.note.update).not.toHaveBeenCalled();
    });
  });

  describe('upsertBlockWithLww', () => {
    it('should throw UnprocessableEntityException when parent note does not exist', async () => {
      prisma.noteBlock.findUnique.mockResolvedValue(null);
      prisma.note.findFirst.mockResolvedValue(null);

      await expect(
        service.upsertBlockWithLww('u-1', {
          id: 'b-1',
          mutationId: 'blocks:upsert:b-1',
          action: 'upsert',
          changes: { noteId: 'missing-note', type: 'text', content: 'Hello' },
          updatedAt: '2026-09-18T12:00:00.000Z',
        }),
      ).rejects.toThrow(UnprocessableEntityException);

      expect(prisma.noteBlock.create).not.toHaveBeenCalled();
      expect(prisma.noteBlock.update).not.toHaveBeenCalled();
    });

    it('should create block when parent note exists', async () => {
      prisma.noteBlock.findUnique.mockResolvedValue(null);
      prisma.note.findFirst.mockResolvedValue({ id: 'n-1', userId: 'u-1' });
      prisma.noteBlock.create.mockResolvedValue({ id: 'b-1' });

      const res = await service.upsertBlockWithLww('u-1', {
        id: 'b-1',
        mutationId: 'blocks:upsert:b-1',
        action: 'upsert',
        changes: { noteId: 'n-1', type: 'text', content: 'Hello' },
        updatedAt: '2026-09-18T12:00:00.000Z',
      });

      expect(res.applied).toBe(true);
      expect(prisma.noteBlock.create).toHaveBeenCalled();
    });

    it('should soft-delete block with tombstone when action is delete', async () => {
      prisma.noteBlock.findUnique.mockResolvedValue({
        id: 'b-1',
        noteId: 'n-1',
        version: 1,
        updatedAt: new Date('2026-09-18T10:00:00.000Z'),
      });
      prisma.note.findFirst.mockResolvedValue({ id: 'n-1', userId: 'u-1' });
      prisma.noteBlock.update.mockResolvedValue({ id: 'b-1' });

      const res = await service.upsertBlockWithLww('u-1', {
        id: 'b-1',
        mutationId: 'blocks:delete:b-1',
        action: 'delete',
        changes: { noteId: 'n-1' },
        updatedAt: '2026-09-18T12:00:00.000Z',
      });

      expect(res.applied).toBe(true);
      expect(prisma.noteBlock.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'b-1' },
          data: expect.objectContaining({
            deletedAt: expect.any(Date),
            version: 2,
          }),
        }),
      );
    });
  });

  describe('findAll', () => {
    it('should exclude archived notes by default', async () => {
      prisma.note.findMany.mockResolvedValue([]);
      await service.findAll('u-1');
      expect(prisma.note.findMany).toHaveBeenCalledWith({
        where: { userId: 'u-1', deletedAt: null, isArchived: false },
        orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }],
      });
    });

    it('should filter by folderId, pinnedOnly, and archivedOnly', async () => {
      prisma.note.findMany.mockResolvedValue([]);
      await service.findAll('u-1', {
        folderId: 'f-1',
        pinnedOnly: true,
        archivedOnly: true,
      });
      expect(prisma.note.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'u-1',
          deletedAt: null,
          folderId: 'f-1',
          isPinned: true,
          isArchived: true,
        },
        orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }],
      });
    });

    it('should include both archived and active when includeArchived is true', async () => {
      prisma.note.findMany.mockResolvedValue([]);
      await service.findAll('u-1', { includeArchived: true });
      expect(prisma.note.findMany).toHaveBeenCalledWith({
        where: { userId: 'u-1', deletedAt: null },
        orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }],
      });
    });
  });

  describe('findOne', () => {
    it('should return note with unpacked ordered blocks', async () => {
      const now = new Date('2026-11-26T00:00:00.000Z');
      prisma.note.findFirst.mockResolvedValue({
        id: 'n-1',
        userId: 'u-1',
        title: 'Test',
        blocks: [
          {
            id: 'b-1',
            noteId: 'n-1',
            type: 'text',
            position: 0,
            content: 'Hello **world**',
            createdAt: now,
            updatedAt: now,
            deletedAt: null,
          },
          {
            id: 'b-2',
            noteId: 'n-1',
            type: 'list',
            position: 1,
            content: {
              listType: 'checkbox',
              header: 'Tasks',
              content: [{ id: 'i-1', content: 'Ship Phase 1', checked: true }],
            },
            createdAt: now,
            updatedAt: now,
            deletedAt: null,
          },
        ],
      });

      const result = await service.findOne('u-1', 'n-1');
      expect(result.blocks).toHaveLength(2);
      expect(result.blocks[0]).toMatchObject({
        id: 'b-1',
        type: 'text',
        content: 'Hello **world**',
      });
      expect(result.blocks[1]).toMatchObject({
        id: 'b-2',
        type: 'list',
        listType: 'checkbox',
        header: 'Tasks',
        content: [{ id: 'i-1', content: 'Ship Phase 1', checked: true }],
      });
    });
  });

  describe('upsertBlock', () => {
    it('should throw NotFoundException when parent note does not exist', async () => {
      prisma.note.findFirst.mockResolvedValue(null);
      await expect(
        service.upsertBlock('u-1', 'n-missing', 'b-1', {
          type: 'text',
          content: 'Hi',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create a new text block and bump parent note updatedAt', async () => {
      const now = new Date('2026-11-26T00:00:00.000Z');
      prisma.note.findFirst.mockResolvedValue({ id: 'n-1', userId: 'u-1' });
      prisma.noteBlock.findUnique.mockResolvedValue(null);
      prisma.noteBlock.count.mockResolvedValue(2);
      prisma.noteBlock.create.mockResolvedValue({
        id: 'b-new',
        noteId: 'n-1',
        type: 'text',
        position: 2,
        content: 'Draft',
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      });
      prisma.note.update.mockResolvedValue({ id: 'n-1' });

      const result = await service.upsertBlock('u-1', 'n-1', 'b-new', {
        type: 'text',
        content: 'Draft',
      });

      expect(result).toMatchObject({
        id: 'b-new',
        noteId: 'n-1',
        type: 'text',
        position: 2,
        content: 'Draft',
      });
      expect(prisma.note.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'n-1' } }),
      );
    });

    it('should clear optional header when explicit null is passed on list update', async () => {
      const now = new Date('2026-11-26T00:00:00.000Z');
      prisma.note.findFirst.mockResolvedValue({ id: 'n-1', userId: 'u-1' });
      prisma.noteBlock.findUnique.mockResolvedValue({
        id: 'b-list',
        noteId: 'n-1',
        type: 'list',
        position: 0,
        content: {
          listType: 'checkbox',
          header: 'Old Header',
          content: [{ id: 'i-1', content: 'Item', checked: false }],
        },
      });
      prisma.noteBlock.update.mockImplementation(async ({ data }) => ({
        id: 'b-list',
        noteId: 'n-1',
        type: 'list',
        position: 0,
        content: data.content,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      }));
      prisma.note.update.mockResolvedValue({ id: 'n-1' });

      const result = await service.upsertBlock('u-1', 'n-1', 'b-list', {
        type: 'list',
        header: null,
      });

      expect(result.type).toBe('list');
      if (result.type === 'list') {
        expect(result.header).toBeUndefined();
        expect(result.content).toHaveLength(1);
      }
    });
  });

  describe('softDeleteBlock', () => {
    it('should soft-delete an active owned block and bump note updatedAt', async () => {
      prisma.note.findFirst.mockResolvedValue({ id: 'n-1', userId: 'u-1' });
      prisma.noteBlock.findFirst.mockResolvedValue({ id: 'b-1', noteId: 'n-1' });
      prisma.noteBlock.update.mockResolvedValue({ id: 'b-1' });
      prisma.note.update.mockResolvedValue({ id: 'n-1' });

      const res = await service.softDeleteBlock('u-1', 'n-1', 'b-1');
      expect(res.id).toBe('b-1');
      expect(res.noteId).toBe('n-1');
      expect(typeof res.deletedAt).toBe('string');
      expect(prisma.noteBlock.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'b-1' },
          data: expect.objectContaining({
            deletedAt: expect.any(Date),
            version: { increment: 1 },
          }),
        }),
      );
    });
  });

  describe('reorderBlocks', () => {
    it('should update changed positions in a transaction and return ordered blocks', async () => {
      const now = new Date('2026-11-26T00:00:00.000Z');
      prisma.note.findFirst.mockResolvedValue({ id: 'n-1', userId: 'u-1' });
      prisma.noteBlock.findMany
        .mockResolvedValueOnce([
          { id: 'b-1', noteId: 'n-1', type: 'text', position: 0, content: 'A', createdAt: now, updatedAt: now },
          { id: 'b-2', noteId: 'n-1', type: 'text', position: 1, content: 'B', createdAt: now, updatedAt: now },
        ])
        .mockResolvedValueOnce([
          { id: 'b-2', noteId: 'n-1', type: 'text', position: 0, content: 'B', createdAt: now, updatedAt: now },
          { id: 'b-1', noteId: 'n-1', type: 'text', position: 1, content: 'A', createdAt: now, updatedAt: now },
        ]);
      prisma.noteBlock.update.mockResolvedValue({});
      prisma.note.update.mockResolvedValue({ id: 'n-1' });

      const reordered = await service.reorderBlocks('u-1', 'n-1', ['b-2', 'b-1']);
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(reordered.map((b) => b.id)).toEqual(['b-2', 'b-1']);
    });
  });

  describe('trash & restore', () => {
    it('should list soft-deleted notes newest first', async () => {
      prisma.note.findMany.mockResolvedValue([{ id: 'n-del', deletedAt: new Date() }]);
      const res = await service.findTrashed('u-1');
      expect(res).toHaveLength(1);
      expect(prisma.note.findMany).toHaveBeenCalledWith({
        where: { userId: 'u-1', deletedAt: { not: null } },
        orderBy: { deletedAt: 'desc' },
      });
    });

    it('should restore a trashed note by clearing deletedAt and incrementing version', async () => {
      prisma.note.findFirst.mockResolvedValue({ id: 'n-del', userId: 'u-1', deletedAt: new Date() });
      prisma.note.update.mockResolvedValue({ id: 'n-del', deletedAt: null, version: 2 });

      const restored = await service.restore('u-1', 'n-del');
      expect(restored.deletedAt).toBeNull();
      expect(prisma.note.update).toHaveBeenCalledWith({
        where: { id: 'n-del' },
        data: { deletedAt: null, version: { increment: 1 } },
      });
    });

    it('should permanently delete an owned note', async () => {
      prisma.note.findFirst.mockResolvedValue({ id: 'n-del', userId: 'u-1' });
      prisma.note.delete.mockResolvedValue({ id: 'n-del' });

      const res = await service.permanentDelete('u-1', 'n-del');
      expect(res).toEqual({ id: 'n-del', deleted: true });
      expect(prisma.note.delete).toHaveBeenCalledWith({ where: { id: 'n-del' } });
    });
  });
});
