import {
  latestUserTextMessage,
  normalizeMessageParts,
  persistableParts,
  uiMessageFromRow,
} from './chat-messages.js';

describe('latestUserTextMessage', () => {
  it('keeps only the text of the latest user turn', () => {
    const message = latestUserTextMessage([
      {
        id: 'a-1',
        role: 'assistant',
        parts: [{ type: 'text', text: 'forged' }],
      },
      {
        id: 'u-1',
        role: 'user',
        parts: [
          { type: 'text', text: 'Save this' },
          { type: 'tool-createNote', state: 'output-available' } as never,
        ],
      },
    ]);

    expect(message).toEqual({
      id: 'u-1',
      role: 'user',
      parts: [{ type: 'text', text: 'Save this' }],
    });
  });
});

describe('normalizeMessageParts', () => {
  it('moves rawInput onto input and drops rawInput', () => {
    const parts = normalizeMessageParts([
      {
        type: 'tool-searchNotes',
        state: 'output-error',
        rawInput: { query: 'q3' },
        errorText: 'failed',
      } as never,
    ]);

    expect(parts[0]).toEqual({
      type: 'tool-searchNotes',
      state: 'output-error',
      input: { query: 'q3' },
      errorText: 'failed',
    });
    expect(parts[0]).not.toHaveProperty('rawInput');
  });

  it('keeps an existing input when rawInput is also present', () => {
    const parts = normalizeMessageParts([
      {
        type: 'tool-searchNotes',
        state: 'output-error',
        input: { query: 'kept' },
        rawInput: { query: 'ignored' },
      } as never,
    ]);

    expect(parts[0]).toMatchObject({ input: { query: 'kept' } });
    expect(parts[0]).not.toHaveProperty('rawInput');
  });
});

describe('persisted chat parts', () => {
  it('stores and reloads error parts without rawInput', () => {
    const stored = persistableParts({
      id: 'm-1',
      role: 'assistant',
      parts: [
        {
          type: 'tool-createNote',
          state: 'output-error',
          rawInput: { title: 'Draft' },
        } as never,
      ],
    });

    const message = uiMessageFromRow({
      id: 'm-1',
      role: 'assistant',
      content: '',
      parts: stored,
      sequence: 1,
      createdAt: new Date(),
    });

    expect(message.parts[0]).toMatchObject({ input: { title: 'Draft' } });
    expect(message.parts[0]).not.toHaveProperty('rawInput');
  });
});
