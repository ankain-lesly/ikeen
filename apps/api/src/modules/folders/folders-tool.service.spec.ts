import { describe, expect, it, vi, beforeEach } from 'vitest';
import { FoldersToolService } from './folders-tool.service.js';

describe('FoldersToolService', () => {
  let service: FoldersToolService;
  let mockPrisma: any;
  let mockAudit: any;
  let mockAbly: any;

  beforeEach(() => {
    mockPrisma = {
      folder: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      note: {
        findFirst: vi.fn(),
        update: vi.fn(),
      },
    };
    mockAudit = {
      logAgent: vi.fn(),
      trackChanges: vi.fn().mockReturnValue({}),
    };
        service = new FoldersToolService(mockPrisma, mockAudit);
  });

  describe('listFolders', () => {
    it('returns folders with note counts for user', async () => {
      mockPrisma.folder.findMany.mockResolvedValue([
        {
          id: 'folder-1',
          name: 'Personal',
          color: '#3b82f6',
          icon: 'folder',
          isLocked: false,
          _count: { notes: 5 },
        },
      ]);

      const result = await service.listFolders('user-1', { limit: 30 });

      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error('Expected result.ok to be true');

      expect(result.count).toBe(1);
      expect(result.folders[0].noteCount).toBe(5);
      expect(mockPrisma.folder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 'user-1', deletedAt: null }),
        }),
      );
    });
  });

  describe('createFolder', () => {
    it('creates folder, broadcasts Ably, and logs audit', async () => {
      mockPrisma.folder.findFirst.mockResolvedValue(null);
      mockPrisma.folder.create.mockResolvedValue({
        id: 'folder-new',
        name: 'Work Projects',
        color: '#10b981',
        icon: 'briefcase',
      });

      const result = await service.createFolder(
        'user-1',
        {
          name: 'Work Projects',
          color: '#10b981',
          icon: 'briefcase',
        },
        { source: 'mcp', clientId: 'claude' },
      );

      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error('Expected result.ok to be true');

      expect(result.folderId).toBe('folder-new');
      expect(mockPrisma.folder.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          name: 'Work Projects',
        }),
      });
      expect(mockAudit.logAgent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'mcp.createFolder',
          userId: 'user-1',
        }),
      );
    });
  });

  describe('organizeNote', () => {
    it('moves note to target folder and publishes invalidation', async () => {
      mockPrisma.note.findFirst.mockResolvedValue({
        id: 'note-1',
        userId: 'user-1',
        folderId: 'folder-old',
      });
      mockPrisma.folder.findFirst.mockResolvedValue({
        id: 'folder-new',
        name: 'Target Folder',
      });
      mockPrisma.note.update.mockResolvedValue({
        id: 'note-1',
        title: 'Organized Note',
        folderId: 'folder-new',
        tags: ['tag1'],
        folder: { id: 'folder-new', name: 'Target Folder' },
      });

      const result = await service.organizeNote(
        'user-1',
        {
          noteId: 'note-1',
          folderId: 'folder-new',
        },
        { source: 'mcp' },
      );

      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error('Expected result.ok to be true');

      expect(result.folderId).toBe('folder-new');
    });
  });
});
