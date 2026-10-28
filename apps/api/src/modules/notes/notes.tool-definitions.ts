import { z } from 'zod';
import { optionalId } from '../agent/call-options.js';

export const searchNotesDef = {
  name: 'ikeen_search_notes',
  description:
    'Search notes by keyword in title, content, or exact tag. Optionally filter by folder. Content preview is returned and marked with "… [truncated]" and isTruncated: true when exceeding 280 characters. Call ikeen_get_note_details if the full note body is required. Excludes archived notes unless includeArchived is true.',
  inputSchema: z.object({
    query: z
      .string()
      .min(1)
      .describe('Search query, keyword, or concept to find in notes'),
    folderId: optionalId.describe(
      'Folder id to filter by. Omit when unused. Do not pass null.',
    ),
    limit: z
      .number()
      .int()
      .min(1)
      .max(30)
      .default(10)
      .describe('Maximum number of notes to return'),
    includeArchived: z
      .boolean()
      .default(false)
      .describe('Set true to include archived notes in results'),
  }),
};

export const getNoteDetailsDef = {
  name: 'ikeen_get_note_details',
  description:
    'Retrieve full content, discrete note blocks (with checklist items & check states), tags, folder, and metadata of a specific note by ID.',
  inputSchema: z.object({
    noteId: z.string().describe('The UUID of the note to retrieve'),
  }),
};

export const listRecentNotesDef = {
  name: 'ikeen_list_recent_notes',
  description:
    'List the most recently updated or pinned notes in the workspace to establish context. Content preview is returned and marked with "… [truncated]" and isTruncated: true when exceeding 280 characters. Call ikeen_get_note_details if the full note body is required. Excludes archived notes unless includeArchived is true.',
  inputSchema: z.object({
    limit: z
      .number()
      .int()
      .min(1)
      .max(20)
      .default(8)
      .describe('Number of recent notes to fetch'),
    pinnedOnly: z
      .boolean()
      .default(false)
      .describe('Whether to only return pinned notes'),
    includeArchived: z
      .boolean()
      .default(false)
      .describe('Set true to include archived notes in results'),
  }),
};

export const blockInputSchema = z.object({
  type: z.enum(['text', 'list']).describe('Type of block: text or list'),
  markdown: z
    .string()
    .describe(
      'Markdown content for the block. For checklists, use "- [ ] task" or "- [x] task". For bullet lists, use "- item". For ordered lists, use "1. item". For text, standard markdown paragraphs or headers.',
    ),
  header: z
    .string()
    .optional()
    .describe('Optional title or header above this block'),
  footer: z
    .string()
    .optional()
    .describe(
      'Optional tip, note, warning, timing info, or summary rendered below the list in markdown (e.g. "> 💡 Tip: ...")',
    ),
});

export const createNoteDef = {
  name: 'ikeen_create_note',
  description:
    'Create a new note in the workspace with title, optional general content, optional structured blocks, optional folderId, and tags. To create interactive native checklists and segmented sections, supply `blocks`.',
  inputSchema: z.object({
    title: z.string().trim().min(1).describe('Title of the note'),
    content: z
      .string()
      .default('')
      .describe('General or summary body text of the note. Omit or leave empty if blocks are used.'),
    blocks: z
      .array(blockInputSchema)
      .optional()
      .describe(
        'Optional structured blocks. Use type: "list" with "- [ ] task" to create interactive tap-to-toggle checklists in the mobile app.',
      ),
    folderId: optionalId.describe(
      'Folder id from listFolders. Omit to save at root. Do not pass null.',
    ),
    tags: z
      .array(z.string())
      .default([])
      .describe('List of tags to categorize the note'),
  }),
};

export const addBlockDef = {
  name: 'ikeen_add_block',
  description:
    'Append or insert a discrete block into an existing note. Use type: "list" with "- [ ] item" to create an interactive checklist, or type: "text" for formatted paragraphs.',
  inputSchema: z.object({
    noteId: z.string().describe('The UUID of the note to append or insert into'),
    type: z.enum(['text', 'list']).describe('Type of block: text or list'),
    markdown: z
      .string()
      .describe(
        'Markdown string for this block. Use "- [ ] item" for checkboxes, "- item" for bullets, "1. item" for numbered, or standard markdown for text.',
      ),
    header: z.string().optional().describe('Optional header for this block'),
    footer: z
      .string()
      .optional()
      .describe(
        'Optional footer (tips, notes, warnings, or timing) below the list',
      ),
    position: z
      .number()
      .int()
      .optional()
      .describe('0-indexed position. Omit to append at the end of the note.'),
  }),
};

export const updateBlockDef = {
  name: 'ikeen_update_block',
  description:
    'Update an existing block within a note. Can replace the block markdown, or use `checklistPatch` to check/uncheck items or append tasks without rewriting the block.',
  inputSchema: z.object({
    noteId: z.string().describe('UUID of the note'),
    blockId: z.string().describe('UUID of the block to update'),
    markdown: z
      .string()
      .optional()
      .describe('New replacement markdown for this block.'),
    header: z.string().optional().describe('Updated header for this block'),
    footer: z.string().optional().describe('Updated footer for this block'),
    checklistPatch: z
      .object({
        toggleItemText: z
          .string()
          .optional()
          .describe('Text or keyword of the checklist item to toggle or update'),
        setChecked: z
          .boolean()
          .optional()
          .describe('Target checked state (true = checked, false = unchecked)'),
        appendItems: z
          .array(z.string())
          .optional()
          .describe('New task strings to append to this checklist'),
      })
      .optional()
      .describe('Targeted checklist patch without replacing the full block'),
  }),
};

export const deleteBlockDef = {
  name: 'ikeen_delete_block',
  description: 'Delete a specific block from a note by its block ID.',
  inputSchema: z.object({
    noteId: z.string().describe('UUID of the note'),
    blockId: z.string().describe('UUID of the block to delete'),
  }),
};

export const attachImageDef = {
  name: 'ikeen_attach_image',
  description:
    'Attach an image URL to a note with an optional caption. By default, it checks for an existing media block and appends the image, or creates a new media block if none exists. Set createNewBlock: true to force creating a new media block section.',
  inputSchema: z.object({
    noteId: z.string().describe('The UUID of the note to attach the image to'),
    url: z.string().url().describe('Direct HTTP/HTTPS URL of the image'),
    caption: z
      .string()
      .optional()
      .describe('Optional caption or description displayed beneath the image'),
    name: z
      .string()
      .optional()
      .describe('Optional display title or filename for the image (e.g. "Architecture Diagram.png")'),
    createNewBlock: z
      .boolean()
      .default(false)
      .describe(
        'If false (default), appends to an existing media block if present, or creates one if none exists. If true, always creates a separate new media block.',
      ),
  }),
};

export const updateNoteDef = {
  name: 'ikeen_update_note',
  description:
    'Update an existing note (title, tags, append, or replace content). If the user already asked to rewrite this note, pass content with confirm: true on the first call. Otherwise a replace without confirm returns a preview.',
  inputSchema: z.object({
    noteId: z.string().describe('The UUID of the note to update'),
    title: z.string().optional().describe('New title if changing'),
    content: z
      .string()
      .optional()
      .describe(
        'Replacement content. Set confirm true on the first call when the user already asked to rewrite.',
      ),
    appendContent: z
      .string()
      .optional()
      .describe(
        'Additional text or checklist to append to the end of the existing content',
      ),
    tags: z
      .array(z.string())
      .optional()
      .describe('New or updated array of tags'),
    confirm: z
      .boolean()
      .optional()
      .describe(
        'Set true only after the user agrees to a full content replace in this turn',
      ),
  }),
};

export const pinNoteDef = {
  name: 'ikeen_pin_note',
  description:
    'Pin or unpin a note to prioritize it at the top of the workspace list.',
  inputSchema: z.object({
    noteId: z.string().describe('The UUID of the note to pin or unpin'),
    isPinned: z
      .boolean()
      .default(true)
      .describe('True to pin the note, false to unpin it'),
  }),
};

export const archiveNoteDef = {
  name: 'ikeen_archive_note',
  description:
    'Archive or unarchive a note to remove it from the active workspace without deleting it.',
  inputSchema: z.object({
    noteId: z.string().describe('The UUID of the note to archive or unarchive'),
    isArchived: z
      .boolean()
      .default(true)
      .describe('True to archive the note, false to restore/unarchive it'),
  }),
};

export const deleteNoteDef = {
  name: 'ikeen_delete_note',
  description:
    'Permanently delete or soft-delete a note from the workspace. Use with caution.',
  inputSchema: z.object({
    noteId: z.string().describe('The UUID of the note to delete'),
    hardDelete: z
      .boolean()
      .default(false)
      .describe('If true, removes permanently from database; otherwise marks deleted'),
  }),
};
