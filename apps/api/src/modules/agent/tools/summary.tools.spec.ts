import { createSummaryTools, summarizeKnowledgeInputSchema } from './summary.tools.js';

const toolOptions = {
  context: { userId: 'user-1', conversationId: 'conv-1' },
  toolCallId: 'call-1',
  messages: [],
};

describe('summarizeKnowledgeInputSchema', () => {
  it('rejects missing folderId and noteIds', () => {
    const result = summarizeKnowledgeInputSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects an empty noteIds list without folderId', () => {
    const result = summarizeKnowledgeInputSchema.safeParse({ noteIds: [] });
    expect(result.success).toBe(false);
  });

  it('accepts folderId or a non-empty noteIds list', () => {
    expect(summarizeKnowledgeInputSchema.safeParse({ folderId: 'folder-1' }).success).toBe(
      true,
    );
    expect(
      summarizeKnowledgeInputSchema.safeParse({ noteIds: ['note-1'] }).success,
    ).toBe(true);
  });
});

describe('summarizeKnowledge execute', () => {
  it('queries noteIds without AND-ing folderId, excludes archived, and flags truncation', async () => {
    const findMany = vi.fn().mockResolvedValue([
      {
        id: 'note-1',
        title: 'Alpha',
        content: 'x'.repeat(3001),
        summary: null,
        tags: ['work'],
        updatedAt: new Date(),
      },
      {
        id: 'note-2',
        title: 'Beta',
        content: 'short',
        summary: null,
        tags: [],
        updatedAt: new Date(),
      },
    ]);
    const prisma = { note: { findMany } };
    const { summarizeKnowledge } = createSummaryTools({ prisma: prisma as never });

    const result = await summarizeKnowledge.execute!(
      { folderId: 'folder-ignored', noteIds: ['note-1', 'note-2'], focus: 'actions' },
      toolOptions as never,
    );

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: 'user-1',
          deletedAt: null,
          isArchived: false,
          id: { in: ['note-1', 'note-2'] },
        },
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        ok: true,
        focus: 'actions',
        notesCount: 2,
      }),
    );
    expect(result).toMatchObject({
      notes: [
        { id: 'note-1', truncated: true, content: 'x'.repeat(3000) },
        { id: 'note-2', truncated: false, content: 'short' },
      ],
    });
  });

  it('queries by folderId when noteIds are omitted', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const prisma = { note: { findMany } };
    const { summarizeKnowledge } = createSummaryTools({ prisma: prisma as never });

    const result = await summarizeKnowledge.execute!(
      { folderId: 'folder-1' },
      toolOptions as never,
    );

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: 'user-1',
          deletedAt: null,
          isArchived: false,
          folderId: 'folder-1',
        },
      }),
    );
    expect(result).toEqual({
      ok: false,
      error: 'No matching notes found to synthesize.',
    });
  });
});
