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
        delete: vi.fn(),
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
      expect(result.notes[0].isTruncated).toBe(false);
      expect(result.notes[0].content).toBe('Meeting notes content here');
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

    it('indicates truncated content when note exceeds 280 characters', async () => {
      const longContent = 'A'.repeat(300);
      mockPrisma.note.findMany.mockResolvedValue([
        {
          id: 'note-long',
          title: 'Long Note',
          content: longContent,
          tags: ['architecture'],
          folderId: null,
          isPinned: false,
          isArchived: false,
          updatedAt: new Date(),
          folder: null,
        },
      ]);

      const result = await service.searchNotes('user-1', {
        query: 'architecture',
      });

      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error('Expected result.ok to be true');

      expect(result.notes[0].isTruncated).toBe(true);
      expect(result.notes[0].content).toBe(`${'A'.repeat(280)}… [truncated]`);
    });
  });

  describe('listRecentNotes', () => {
    it('returns recent notes with truncation flag', async () => {
      mockPrisma.note.findMany.mockResolvedValue([
        {
          id: 'note-short',
          title: 'Short',
          content: 'Short content',
          tags: [],
          folderId: null,
          isPinned: true,
          isArchived: false,
          updatedAt: new Date(),
          folder: null,
        },
        {
          id: 'note-long',
          title: 'Long',
          content: 'X'.repeat(350),
          tags: [],
          folderId: null,
          isPinned: false,
          isArchived: false,
          updatedAt: new Date(),
          folder: null,
        },
      ]);

      const result = await service.listRecentNotes('user-1', { limit: 5 });

      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error('Expected result.ok to be true');

      expect(result.count).toBe(2);
      expect(result.notes[0].isTruncated).toBe(false);
      expect(result.notes[0].content).toBe('Short content');
      expect(result.notes[1].isTruncated).toBe(true);
      expect(result.notes[1].content).toContain('… [truncated]');
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

  describe('deleteNote', () => {
    it('soft deletes note by default and emits invalidation', async () => {
      mockPrisma.note.findFirst.mockResolvedValue({
        id: 'note-1',
        title: 'Note to Delete',
      });
      mockPrisma.note.update.mockResolvedValue({
        id: 'note-1',
        title: 'Note to Delete',
        deletedAt: new Date(),
      });

      const result = await service.deleteNote('user-1', { noteId: 'note-1' });

      expect(result.ok).toBe(true);
      expect(mockPrisma.note.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'note-1' },
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        }),
      );
      expect(mockAbly.publishInvalidation).toHaveBeenCalledWith('user-1', ['notes']);
    });

    it('hard deletes note when hardDelete is true', async () => {
      mockPrisma.note.findFirst.mockResolvedValue({
        id: 'note-1',
        title: 'Note to Hard Delete',
      });
      mockPrisma.note.delete.mockResolvedValue({ id: 'note-1' });

      const result = await service.deleteNote('user-1', {
        noteId: 'note-1',
        hardDelete: true,
      });

      expect(result.ok).toBe(true);
      expect(mockPrisma.note.delete).toHaveBeenCalledWith({
        where: { id: 'note-1' },
      });
    });

    it('returns error when note does not exist', async () => {
      mockPrisma.note.findFirst.mockResolvedValue(null);

      const result = await service.deleteNote('user-1', { noteId: 'missing-note' });

      expect(result.ok).toBe(false);
      expect(mockPrisma.note.delete).not.toHaveBeenCalled();
      expect(mockPrisma.note.update).not.toHaveBeenCalled();
    });
  });
});
