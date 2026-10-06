import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NotesToolService } from './notes-tool.service.js';

describe('NotesToolService', () => {
  let service: NotesToolService;
  let mockPrisma: any;
  let mockAudit: any;
  let mockAbly: any;

  beforeEach(() => {
    mockPrisma = {
      note: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      folder: {
        findFirst: vi.fn(),
      },
    };
    mockAudit = {
      logAgent: vi.fn(),
      trackChanges: vi.fn().mockReturnValue({}),
    };
    mockAbly = {
      publishInvalidation: vi.fn().mockResolvedValue(undefined),
    };
    service = new NotesToolService(mockPrisma, mockAudit, mockAbly);
  });

  describe('searchNotes', () => {
    it('searches notes scoped strictly to userId', async () => {
      mockPrisma.note.findMany.mockResolvedValue([
        {
          id: 'note-1',
          title: 'Meeting Notes',
          content: 'Meeting notes content here',
          tags: ['work'],
          folderId: 'f-1',
          isPinned: true,
          isArchived: false,
          updatedAt: new Date(),
          folder: { name: 'Work' },
        },
      ]);

      const result = await service.searchNotes('user-1', {
        query: 'Meeting',
        limit: 10,
        includeArchived: false,
      });

      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error('Expected result.ok to be true');

      expect(result.count).toBe(1);
      expect(mockPrisma.note.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-1',
            deletedAt: null,
            isArchived: false,
          }),
        }),
      );
    });
  });

  describe('createNote', () => {
    it('creates note, logs audit, and broadcasts Ably invalidation', async () => {
      mockPrisma.note.create.mockResolvedValue({
        id: 'note-new',
        title: 'New Note',
        folderId: null,
        tags: ['mcp'],
        createdAt: new Date(),
      });

      const result = await service.createNote(
        'user-1',
        {
          title: 'New Note',
          content: 'Content here',
          tags: ['mcp'],
        },
        { source: 'mcp', clientId: 'cursor' },
      );

      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error('Expected result.ok to be true');

      expect(result.noteId).toBe('note-new');
      expect(mockPrisma.note.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          title: 'New Note',
          content: 'Content here',
        }),
      });
      expect(mockAudit.logAgent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'mcp.createNote',
          userId: 'user-1',
          metadata: expect.objectContaining({
            source: 'mcp',
            clientId: 'cursor',
          }),
        }),
      );
      expect(mockAbly.publishInvalidation).toHaveBeenCalledWith('user-1', ['notes']);
    });
  });

  describe('updateNote', () => {
    it('returns preview requiring confirmation when replacing content without confirm', async () => {
      mockPrisma.note.findFirst.mockResolvedValue({
        id: 'note-1',
        title: 'Original Title',
        content: 'Original Content',
        tags: [],
      });

      const result = await service.updateNote('user-1', {
        noteId: 'note-1',
        content: 'Entirely replaced content',
      });

      expect(result.ok).toBe(false);
      if (result.ok) throw new Error('Expected result.ok to be false');

      expect(result.needsConfirmation).toBe(true);
      expect(result.preview).toBeDefined();
      expect(mockPrisma.note.update).not.toHaveBeenCalled();
    });

    it('proceeds with content replacement when confirm is true', async () => {
      mockPrisma.note.findFirst.mockResolvedValue({
        id: 'note-1',
        title: 'Original Title',
        content: 'Original Content',
        tags: [],
      });
      mockPrisma.note.update.mockResolvedValue({
        id: 'note-1',
        title: 'Original Title',
        content: 'Replaced content',
        tags: [],
        version: 2,
        updatedAt: new Date(),
      });

      const result = await service.updateNote(
        'user-1',
        {
          noteId: 'note-1',
          content: 'Replaced content',
          confirm: true,
        },
        { source: 'mcp' },
      );

      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error('Expected result.ok to be true');

      expect(mockPrisma.note.update).toHaveBeenCalled();
      expect(mockAbly.publishInvalidation).toHaveBeenCalledWith('user-1', ['notes']);
    });
  });
});
