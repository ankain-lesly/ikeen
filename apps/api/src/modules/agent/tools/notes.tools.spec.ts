import { createNotesTools } from './notes.tools.js';

const toolOptions = {
  context: { userId: 'user-1', conversationId: 'conv-1' },
  toolCallId: 'call-1',
  messages: [],
};

function mockAudit() {
  return {
    log: vi.fn(),
    logAgent: vi.fn(),
    trackChanges: vi.fn().mockReturnValue({ title: { old: 'Old', new: 'New' } }),
  };
}

describe('createNote', () => {
  it('saves at root with a warning when the folder is missing', async () => {
    const prisma = {
      folder: { findFirst: vi.fn().mockResolvedValue(null) },
      note: {
        create: vi.fn().mockResolvedValue({
          id: 'note-1',
          title: 'Draft',
          folderId: null,
          tags: [],
          createdAt: new Date(),
        }),
      },
    };
    const audit = mockAudit();
    const { createNote } = createNotesTools({
      prisma: prisma as never,
      audit: audit as never,
    });

    const result = await createNote.execute!(
      { title: 'Draft', content: 'Hello', folderId: 'missing-folder', tags: [] },
      toolOptions as never,
    );

    expect(prisma.note.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        folderId: null,
        title: 'Draft',
      }),
    });
    expect(result).toEqual(
      expect.objectContaining({
        ok: true,
        folderId: null,
        warning: 'Folder not found; saved at root',
      }),
    );
    expect(audit.logAgent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'agent.createNote',
        resourceId: 'note-1',
      }),
    );
  });
});

describe('updateNote', () => {
  const existing = {
    id: 'note-1',
    title: 'Old',
    content: 'body',
    tags: ['a'],
  };

  it('refuses a content replace without confirm and does not write', async () => {
    const prisma = {
      note: {
        findFirst: vi.fn().mockResolvedValue(existing),
        update: vi.fn(),
      },
    };
    const audit = mockAudit();
    const { updateNote } = createNotesTools({
      prisma: prisma as never,
      audit: audit as never,
    });

    const result = await updateNote.execute!(
      { noteId: 'note-1', content: 'rewritten' },
      toolOptions as never,
    );

    expect(prisma.note.update).not.toHaveBeenCalled();
    expect(audit.logAgent).not.toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({
        ok: false,
        needsConfirmation: true,
        preview: expect.objectContaining({
          title: 'Old',
          current: 'body',
          proposed: 'rewritten',
        }),
      }),
    );
  });

  it('replaces content when confirm is true and audits WARN', async () => {
    const prisma = {
      note: {
        findFirst: vi.fn().mockResolvedValue(existing),
        update: vi.fn().mockResolvedValue({
          id: 'note-1',
          title: 'Old',
          content: 'rewritten',
          tags: ['a'],
          version: 2,
          updatedAt: new Date(),
        }),
      },
    };
    const audit = mockAudit();
    const { updateNote } = createNotesTools({
      prisma: prisma as never,
      audit: audit as never,
    });

    const result = await updateNote.execute!(
      { noteId: 'note-1', content: 'rewritten', confirm: true },
      toolOptions as never,
    );

    expect(prisma.note.update).toHaveBeenCalled();
    expect(result).toEqual(expect.objectContaining({ ok: true, noteId: 'note-1' }));
    expect(audit.logAgent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'agent.replaceNote',
        severity: 'WARN',
      }),
    );
  });

  it('rejects passing content and appendContent together', async () => {
    const prisma = {
      note: {
        findFirst: vi.fn(),
        update: vi.fn(),
      },
    };
    const { updateNote } = createNotesTools({
      prisma: prisma as never,
      audit: mockAudit() as never,
    });

    const result = await updateNote.execute!(
      { noteId: 'note-1', content: 'new', appendContent: 'more' },
      toolOptions as never,
    );

    expect(prisma.note.findFirst).not.toHaveBeenCalled();
    expect(result).toEqual({
      ok: false,
      error: 'Pass content or appendContent, not both.',
    });
  });
});
