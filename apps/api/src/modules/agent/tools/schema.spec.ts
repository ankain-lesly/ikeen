import { z } from 'zod';
import {
  defaultNullable,
  ikeenToolContext,
  optionalId,
  optionalNullable,
} from '../call-options.js';
import { summarizeKnowledgeInputSchema } from './summary.tools.js';
import {
  addBlockDef,
  attachImageDef,
  createNoteDef,
  searchNotesDef,
  updateBlockDef,
  updateNoteDef,
} from '../../notes/notes.tool-definitions.js';
import {
  createFolderDef,
  listFoldersDef,
  updateFolderDef,
} from '../../folders/folders.tool-definitions.js';

describe('optionalId, optionalNullable, and defaultNullable', () => {
  it('normalizes null, empty string, and undefined across schema helpers', () => {
    expect(optionalId.parse(null)).toBeUndefined();
    expect(optionalId.parse('')).toBeUndefined();
    expect(optionalId.parse(undefined)).toBeUndefined();
    expect(optionalId.parse('folder-1')).toBe('folder-1');

    const optStr = optionalNullable(z.string());
    expect(optStr.parse(null)).toBeUndefined();
    expect(optStr.parse(undefined)).toBeUndefined();
    expect(optStr.parse('hello')).toBe('hello');

    const defBool = defaultNullable(z.boolean(), false);
    expect(defBool.parse(null)).toBe(false);
    expect(defBool.parse(undefined)).toBe(false);
    expect(defBool.parse(true)).toBe(true);
  });
});

describe('tool input schemas accept null for optional/defaulted LLM arguments', () => {
  it.each([
    [
      'searchNotes',
      searchNotesDef.inputSchema,
      { query: 'roadmap', folderId: null, limit: null, includeArchived: null },
      { query: 'roadmap', folderId: undefined, limit: 10, includeArchived: false },
    ],
    [
      'createNote',
      createNoteDef.inputSchema,
      { title: 'Sprint', content: null, blocks: [{ type: 'list', markdown: '- [ ] Task', header: null, footer: null }], folderId: null, tags: null },
      { title: 'Sprint', content: '', blocks: [{ type: 'list', markdown: '- [ ] Task', header: undefined, footer: undefined }], folderId: undefined, tags: [] },
    ],
    [
      'addBlock',
      addBlockDef.inputSchema,
      { noteId: 'n-1', type: 'text', markdown: 'Hello', header: null, footer: null, position: null },
      { noteId: 'n-1', type: 'text', markdown: 'Hello', header: undefined, footer: undefined, position: undefined },
    ],
    [
      'updateBlock',
      updateBlockDef.inputSchema,
      { noteId: 'n-1', blockId: 'b-1', markdown: null, header: null, footer: null, checklistPatch: { toggleItemText: 'Task', setChecked: null, appendItems: null } },
      { noteId: 'n-1', blockId: 'b-1', markdown: undefined, header: undefined, footer: undefined, checklistPatch: { toggleItemText: 'Task', setChecked: undefined, appendItems: undefined } },
    ],
    [
      'attachImage',
      attachImageDef.inputSchema,
      { noteId: 'n-1', images: [{ url: 'https://example.com/a.png', caption: null, name: null }], createNewBlock: null },
      { noteId: 'n-1', images: [{ url: 'https://example.com/a.png', caption: undefined, name: undefined }], createNewBlock: false },
    ],
    [
      'updateNote',
      updateNoteDef.inputSchema,
      { noteId: 'n-1', title: null, content: null, appendContent: 'More', tags: null, confirm: null },
      { noteId: 'n-1', title: undefined, content: undefined, appendContent: 'More', tags: undefined, confirm: undefined },
    ],
    [
      'listFolders',
      listFoldersDef.inputSchema,
      { query: null, limit: null },
      { query: undefined, limit: 30 },
    ],
    [
      'createFolder',
      createFolderDef.inputSchema,
      { name: 'Research', color: null, icon: null },
      { name: 'Research', color: '#3b82f6', icon: 'folder' },
    ],
    [
      'updateFolder',
      updateFolderDef.inputSchema,
      { folderId: 'f-1', name: null, color: null, icon: null, sortOrder: null },
      { folderId: 'f-1', name: undefined, color: undefined, icon: undefined, sortOrder: undefined },
    ],
  ])('parses null arguments in %s without throwing', (_name, schema, input, expected) => {
    expect((schema as z.ZodTypeAny).parse(input)).toEqual(expected);
  });
});

describe('summarizeKnowledgeInputSchema & ikeenToolContext', () => {
  it('accepts a null folderId when noteIds are present and binds web tools', () => {
    const parsed = summarizeKnowledgeInputSchema.safeParse({
      folderId: null,
      noteIds: ['note-1'],
      focus: null,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data).toEqual({ folderId: undefined, noteIds: ['note-1'], focus: undefined });
    }

    const context = ikeenToolContext('user-1', 'conv-1');
    const bound = { userId: 'user-1', conversationId: 'conv-1' };
    expect(context.webSearch).toEqual(bound);
    expect(context.readWebPage).toEqual(bound);
  });
});
