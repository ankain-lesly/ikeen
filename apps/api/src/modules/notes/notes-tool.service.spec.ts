import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NotesToolService } from './notes-tool.service.js';

describe('NotesToolService', () => {
  let service: NotesToolService;
  let mockPrisma: any;
  let mockAudit: any;
  let mockAbly: any;

  beforeEach(() => {
    mockPrisma = {
      $transaction: vi.fn((fn: any) => fn(mockPrisma)),
      note: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      noteBlock: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        count: vi.fn().mockResolvedValue(0),
        create: vi.fn(),
        createMany: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
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

  describe('getNoteDetails', () => {
    it('returns note with unpacked blocks', async () => {
      mockPrisma.note.findFirst.mockResolvedValue({
        id: 'note-1',
        title: 'Note with blocks',
        content: 'Search text projection',
        tags: ['test'],
        folder: null,
        isPinned: false,
        isArchived: false,
        version: 1,
        updatedAt: new Date(),
        blocks: [
          {
            id: 'b-1',
            noteId: 'note-1',
            type: 'text',
            position: 0,
            content: 'Hello world',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: 'b-2',
            noteId: 'note-1',
            type: 'list',
            position: 1,
            content: {
              listType: 'checkbox',
              content: [{ id: 'i-1', content: 'Buy groceries', checked: false }],
            },
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      });

      const result = await service.getNoteDetails('user-1', { noteId: 'note-1' });
      expect(result.ok).toBe(true);
      if (!result.ok || !result.note) throw new Error('Expected result.ok to be true');

      expect(result.note.blocks).toHaveLength(2);
      expect(result.note.blocks[0].type).toBe('text');
      expect(result.note.blocks[1].type).toBe('list');
      if (result.note.blocks[1].type === 'list') {
        expect(result.note.blocks[1].content[0].content).toBe('Buy groceries');
      }
    });
  });

  describe('createNote', () => {
    it('creates note with blocks and broadcasts Ably invalidation for notes and note_blocks', async () => {
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
          blocks: [
            { type: 'text', markdown: 'Overview paragraph' },
            { type: 'list', markdown: '- [ ] Step 1\n- [x] Step 2' },
          ],
          tags: ['mcp'],
        },
        { source: 'mcp', clientId: 'cursor' },
      );

      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error('Expected result.ok to be true');

      expect(result.noteId).toBe('note-new');
      expect(result.blocksCount).toBe(2);
      expect(mockPrisma.note.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          title: 'New Note',
          content: '',
        }),
      });
      expect(mockPrisma.noteBlock.createMany).toHaveBeenCalled();
      expect(mockAbly.publishInvalidation).toHaveBeenCalledWith('user-1', ['notes', 'note_blocks']);
    });
  });

  describe('addBlock', () => {
    it('adds a block and updates note metadata', async () => {
      mockPrisma.note.findFirst.mockResolvedValue({
        id: 'note-1',
        title: 'Test Note',
        blocks: [],
      });
      mockPrisma.note.update.mockResolvedValue({});

      const result = await service.addBlock('user-1', {
        noteId: 'note-1',
        type: 'text',
        markdown: 'Newly added block',
      });

      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error('Expected result.ok to be true');
      expect(result.type).toBe('text');
      expect(mockPrisma.noteBlock.create).toHaveBeenCalled();
      expect(mockAbly.publishInvalidation).toHaveBeenCalledWith('user-1', ['notes', 'note_blocks']);
    });

    it('adds a list block with header and footer', async () => {
      mockPrisma.note.findFirst.mockResolvedValue({
        id: 'note-1',
        title: 'Recipe',
        blocks: [],
      });
      mockPrisma.note.update.mockResolvedValue({});

      const result = await service.addBlock('user-1', {
        noteId: 'note-1',
        type: 'list',
        header: 'Instructions',
        footer: '> 💡 Tip: Serve warm.',
        markdown: '- [ ] Bake for 20 mins',
      });

      expect(result.ok).toBe(true);
      expect(mockPrisma.noteBlock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            content: expect.objectContaining({
              header: 'Instructions',
              footer: '> 💡 Tip: Serve warm.',
              content: expect.arrayContaining([
                expect.objectContaining({ content: 'Bake for 20 mins' }),
              ]),
            }),
          }),
        }),
      );
    });
  });

  describe('updateBlock', () => {
    it('patches checklist items using checklistPatch', async () => {
      mockPrisma.note.findFirst.mockResolvedValue({
        id: 'note-1',
        title: 'Test Note',
      });
      mockPrisma.noteBlock.findFirst.mockResolvedValue({
        id: 'b-1',
        noteId: 'note-1',
        type: 'list',
        content: {
          listType: 'checkbox',
          content: [
            { id: 'i-1', content: 'Buy milk', checked: false },
            { id: 'i-2', content: 'Call doctor', checked: false },
          ],
        },
      });
      mockPrisma.noteBlock.findMany.mockResolvedValue([]);
      mockPrisma.note.update.mockResolvedValue({});

      const result = await service.updateBlock('user-1', {
        noteId: 'note-1',
        blockId: 'b-1',
        checklistPatch: {
          toggleItemText: 'milk',
          setChecked: true,
          appendItems: ['New task'],
        },
      });

      expect(result.ok).toBe(true);
      expect(mockPrisma.noteBlock.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'b-1' },
          data: expect.objectContaining({
            content: expect.objectContaining({
              content: expect.arrayContaining([
                expect.objectContaining({ content: 'Buy milk', checked: true }),
                expect.objectContaining({ content: 'New task', checked: false }),
              ]),
            }),
          }),
        }),
      );
      expect(mockAbly.publishInvalidation).toHaveBeenCalledWith('user-1', ['notes', 'note_blocks']);
    });

    it('updates list block header and footer', async () => {
      mockPrisma.note.findFirst.mockResolvedValue({
        id: 'note-1',
        title: 'Test Note',
      });
      mockPrisma.noteBlock.findFirst.mockResolvedValue({
        id: 'b-1',
        noteId: 'note-1',
        type: 'list',
        content: {
          listType: 'checkbox',
          header: 'Old Header',
          footer: 'Old Footer',
          content: [{ id: 'i-1', content: 'Item 1', checked: false }],
        },
      });
      mockPrisma.note.update.mockResolvedValue({});

      const result = await service.updateBlock('user-1', {
        noteId: 'note-1',
        blockId: 'b-1',
        header: 'New Header',
        footer: 'New Footer',
      });

      expect(result.ok).toBe(true);
      expect(mockPrisma.noteBlock.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'b-1' },
          data: expect.objectContaining({
            content: expect.objectContaining({
              header: 'New Header',
              footer: 'New Footer',
            }),
          }),
        }),
      );
    });
  });

  describe('deleteBlock', () => {
    it('deletes block and re-indexes remaining blocks', async () => {
      mockPrisma.note.findFirst.mockResolvedValue({
        id: 'note-1',
        title: 'Test Note',
      });
      mockPrisma.noteBlock.findFirst.mockResolvedValue({
        id: 'b-1',
        noteId: 'note-1',
      });
      mockPrisma.noteBlock.findMany.mockResolvedValue([
        { id: 'b-2', position: 1, type: 'text', content: 'Remaining block' },
      ]);
      mockPrisma.note.update.mockResolvedValue({});

      const result = await service.deleteBlock('user-1', {
        noteId: 'note-1',
        blockId: 'b-1',
      });

      expect(result.ok).toBe(true);
      expect(mockPrisma.noteBlock.delete).toHaveBeenCalledWith({ where: { id: 'b-1' } });
      expect(mockPrisma.noteBlock.update).toHaveBeenCalledWith({
        where: { id: 'b-2' },
        data: {
          position: 0,
          version: { increment: 1 },
          updatedAt: expect.any(Date),
        },
      });
      expect(mockAbly.publishInvalidation).toHaveBeenCalledWith('user-1', ['notes', 'note_blocks']);
    });
  });

  describe('attachImage', () => {
    it('creates a new media block when no media block exists on the note', async () => {
      mockPrisma.note.findFirst.mockResolvedValue({
        id: 'note-1',
        title: 'Project Architecture',
      });
      mockPrisma.noteBlock.findFirst.mockResolvedValue(null);
      mockPrisma.noteBlock.count.mockResolvedValue(1);
      mockPrisma.note.update.mockResolvedValue({});

      const result = await service.attachImage(
        'user-1',
        {
          noteId: 'note-1',
          images: [{ url: 'https://example.com/diagram.png', caption: 'Architecture Overview' }],
        },
        { source: 'mcp' },
      );

      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error('Expected result.ok to be true');
      expect(result.isNewBlock).toBe(true);
      expect(result.imagesCount).toBe(1);
      expect(result.imageIds).toHaveLength(1);
      expect(mockPrisma.noteBlock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            noteId: 'note-1',
            type: 'media',
            position: 1,
            content: expect.arrayContaining([
              expect.objectContaining({
                mediaType: 'image',
                url: 'https://example.com/diagram.png',
                caption: 'Architecture Overview',
              }),
            ]),
          }),
        }),
      );
      expect(mockAbly.publishInvalidation).toHaveBeenCalledWith('user-1', ['notes', 'note_blocks']);
    });

    it('batches multiple images into 1 media block via images array', async () => {
      mockPrisma.note.findFirst.mockResolvedValue({
        id: 'note-1',
        title: 'Food Recipes',
      });
      mockPrisma.noteBlock.findFirst.mockResolvedValue(null);
      mockPrisma.noteBlock.count.mockResolvedValue(0);
      mockPrisma.note.update.mockResolvedValue({});

      const result = await service.attachImage('user-1', {
        noteId: 'note-1',
        images: [
          { url: 'https://example.com/img1.png', caption: 'Plated dish' },
          { url: 'https://example.com/img2.png', caption: 'Ingredients' },
          { url: 'https://example.com/img3.png', caption: 'Table setting' },
        ],
      });

      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error('Expected result.ok to be true');
      expect(result.isNewBlock).toBe(true);
      expect(result.imagesCount).toBe(3);
      expect(result.imageIds).toHaveLength(3);
      expect(mockPrisma.noteBlock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            noteId: 'note-1',
            type: 'media',
            position: 0,
            content: expect.arrayContaining([
              expect.objectContaining({ url: 'https://example.com/img1.png', caption: 'Plated dish' }),
              expect.objectContaining({ url: 'https://example.com/img2.png', caption: 'Ingredients' }),
              expect.objectContaining({ url: 'https://example.com/img3.png', caption: 'Table setting' }),
            ]),
          }),
        }),
      );
    });

    it('appends multiple images to existing media block when createNewBlock is false', async () => {
      mockPrisma.note.findFirst.mockResolvedValue({
        id: 'note-1',
        title: 'Photos',
      });
      mockPrisma.noteBlock.findFirst.mockResolvedValue({
        id: 'b-media-1',
        type: 'media',
        position: 0,
        content: [
          {
            id: 'img-1',
            mediaType: 'image',
            url: 'https://example.com/photo1.png',
            caption: 'First photo',
          },
        ],
      });
      mockPrisma.note.update.mockResolvedValue({});

      const result = await service.attachImage('user-1', {
        noteId: 'note-1',
        images: [
          { url: 'https://example.com/photo2.png', caption: 'Second photo' },
          { url: 'https://example.com/photo3.png', caption: 'Third photo' },
        ],
        createNewBlock: false,
      });

      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error('Expected result.ok to be true');
      expect(result.isNewBlock).toBe(false);
      expect(result.blockId).toBe('b-media-1');
      expect(result.imagesCount).toBe(2);
      expect(mockPrisma.noteBlock.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'b-media-1' },
          data: expect.objectContaining({
            content: expect.arrayContaining([
              expect.objectContaining({ url: 'https://example.com/photo1.png' }),
              expect.objectContaining({ url: 'https://example.com/photo2.png', caption: 'Second photo' }),
              expect.objectContaining({ url: 'https://example.com/photo3.png', caption: 'Third photo' }),
            ]),
          }),
        }),
      );
      expect(mockPrisma.noteBlock.create).not.toHaveBeenCalled();
    });

    it('creates a separate new media block when createNewBlock is true even if one exists', async () => {
      mockPrisma.note.findFirst.mockResolvedValue({
        id: 'note-1',
        title: 'Photos',
      });
      mockPrisma.noteBlock.findFirst.mockResolvedValue(null);
      mockPrisma.noteBlock.count.mockResolvedValue(1);
      mockPrisma.note.update.mockResolvedValue({});

      const result = await service.attachImage('user-1', {
        noteId: 'note-1',
        images: [{ url: 'https://example.com/photo3.png' }],
        createNewBlock: true,
      });

      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error('Expected result.ok to be true');
      expect(result.isNewBlock).toBe(true);
      expect(mockPrisma.noteBlock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            noteId: 'note-1',
            type: 'media',
            position: 1,
            content: expect.arrayContaining([
              expect.objectContaining({ url: 'https://example.com/photo3.png' }),
            ]),
          }),
        }),
      );
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
      expect(mockAbly.publishInvalidation).toHaveBeenCalledWith('user-1', ['notes', 'note_blocks']);
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
      expect(mockAbly.publishInvalidation).toHaveBeenCalledWith('user-1', ['notes', 'note_blocks']);
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
