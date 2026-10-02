import { optionalId, ikeenToolContext } from '../call-options.js';
import { summarizeKnowledgeInputSchema } from './summary.tools.js';

describe('optionalId', () => {
  it('treats null and empty string as omitted', () => {
    expect(optionalId.parse(null)).toBeUndefined();
    expect(optionalId.parse('')).toBeUndefined();
    expect(optionalId.parse(undefined)).toBeUndefined();
    expect(optionalId.parse('folder-1')).toBe('folder-1');
  });
});

describe('summarizeKnowledgeInputSchema', () => {
  it('accepts a null folderId when noteIds are present', () => {
    const parsed = summarizeKnowledgeInputSchema.safeParse({
      folderId: null,
      noteIds: ['note-1'],
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.folderId).toBeUndefined();
      expect(parsed.data.noteIds).toEqual(['note-1']);
    }
  });
});

describe('ikeenToolContext', () => {
  it('includes webSearch and readWebPage keys', () => {
    const context = ikeenToolContext('user-1', 'conv-1');
    const bound = { userId: 'user-1', conversationId: 'conv-1' };

    expect(context.webSearch).toEqual(bound);
    expect(context.readWebPage).toEqual(bound);
  });
});