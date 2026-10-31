import { z } from 'zod';
import {
  defaultNullable,
  optionalId,
  optionalNullable,
} from '../agent/call-options.js';

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
    limit: defaultNullable(z.number().int().min(1).max(30), 10).describe(
      'Maximum number of notes to return',
    ),
    includeArchived: defaultNullable(z.boolean(), false).describe(
      'Set true to include archived notes in results',
    ),
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
    limit: defaultNullable(z.number().int().min(1).max(20), 8).describe(
      'Number of recent notes to fetch',
    ),
    pinnedOnly: defaultNullable(z.boolean(), false).describe(
      'Whether to only return pinned notes',
    ),
    includeArchived: defaultNullable(z.boolean(), false).describe(
      'Set true to include archived notes in results',
    ),
  }),
};

export const blockInputSchema = z.object({
  type: z.enum(['text', 'list']).describe('Type of block: text or list'),
  markdown: z
    .string()
    .describe(
      'Markdown content for the block. For checklists, use "- [ ] task" or "- [x] task". For bullet lists, use "- item". For ordered lists, use "1. item". For text, standard markdown paragraphs or headers.',
    ),
  header: optionalNullable(z.string()).describe(
    'Optional title or header above this block',
  ),
  footer: optionalNullable(z.string()).describe(
    'Optional tip, note, warning, timing info, or summary rendered below the list in markdown (e.g. "> 💡 Tip: ...")',
  ),
});

export const createNoteDef = {
  name: 'ikeen_create_note',
  description:
    'Create a new note in the workspace with title, optional general content, optional structured blocks, optional folderId, and tags. To create interactive native checklists and segmented sections, supply `blocks`.',
  inputSchema: z.object({
    title: z.string().trim().min(1).describe('Title of the note'),
    content: defaultNullable(z.string(), '').describe(
      'General or summary body text of the note. Omit or leave empty if blocks are used.',
    ),
    blocks: optionalNullable(z.array(blockInputSchema)).describe(
      'Optional structured blocks. Use type: "list" with "- [ ] task" to create interactive tap-to-toggle checklists in the mobile app.',
    ),
    folderId: optionalId.describe(
      'Folder id from listFolders. Omit to save at root. Do not pass null.',
    ),
    tags: defaultNullable(z.array(z.string()), []).describe(
      'List of tags to categorize the note',
    ),
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
    header: optionalNullable(z.string()).describe(
      'Optional header for this block',
    ),
    footer: optionalNullable(z.string()).describe(
      'Optional footer (tips, notes, warnings, or timing) below the list',
    ),
    position: optionalNullable(z.number().int()).describe(
      '0-indexed position. Omit to append at the end of the note.',
    ),
  }),
};

export const updateBlockDef = {
  name: 'ikeen_update_block',
  description:
    'Update an existing block within a note. Can replace the block markdown, or use `checklistPatch` to check/uncheck items or append tasks without rewriting the block.',
  inputSchema: z.object({
    noteId: z.string().describe('UUID of the note'),
    blockId: z.string().describe('UUID of the block to update'),
    markdown: optionalNullable(z.string()).describe(
      'New replacement markdown for this block.',
    ),
    header: optionalNullable(z.string()).describe(
      'Updated header for this block',
    ),
    footer: optionalNullable(z.string()).describe(
      'Updated footer for this block',
    ),
    checklistPatch: optionalNullable(
      z.object({
        toggleItemText: optionalNullable(z.string()).describe(
          'Text or keyword of the checklist item to toggle or update',
        ),
        setChecked: optionalNullable(z.boolean()).describe(
          'Target checked state (true = checked, false = unchecked)',
        ),
        appendItems: optionalNullable(z.array(z.string())).describe(
          'New task strings to append to this checklist',
        ),
      }),
    ).describe('Targeted checklist patch without replacing the full block'),
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

export const imageItemInputSchema = z.object({
  url: z.url().describe('Direct HTTP/HTTPS URL of the image'),
  caption: optionalNullable(z.string()).describe(
    'Optional caption or description displayed beneath the image',
  ),
  name: optionalNullable(z.string()).describe(
    'Optional display title or filename for the image (e.g. "Architecture Diagram.png")',
  ),
});

export const attachImageDef = {
  name: 'ikeen_attach_image',
  description:
    'Attach one or more images to a note. All images in the `images` array are batched together into the same media block. By default, appends into an existing media block if one exists, or creates a new media block automatically. Set createNewBlock: true to force creating a separate new media block.',
  inputSchema: z.object({
    noteId: z.string().describe('The UUID of the note to attach image(s) to'),
    images: z
      .array(imageItemInputSchema)
      .min(1)
      .describe('List of 1 or more images to attach (pass 1 item for single image, multiple for batch)'),
    createNewBlock: defaultNullable(z.boolean(), false).describe(
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
    title: optionalNullable(z.string()).describe('New title if changing'),
    content: optionalNullable(z.string()).describe(
      'Replacement content. Set confirm true on the first call when the user already asked to rewrite.',
    ),
    appendContent: optionalNullable(z.string()).describe(
      'Additional text or checklist to append to the end of the existing content',
    ),
    tags: optionalNullable(z.array(z.string())).describe(
      'New or updated array of tags',
    ),
    confirm: optionalNullable(z.boolean()).describe(
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
    isPinned: defaultNullable(z.boolean(), true).describe(
      'True to pin the note, false to unpin it',
    ),
  }),
};

export const archiveNoteDef = {
  name: 'ikeen_archive_note',
  description:
    'Archive or unarchive a note to remove it from the active workspace without deleting it.',
  inputSchema: z.object({
    noteId: z.string().describe('The UUID of the note to archive or unarchive'),
    isArchived: defaultNullable(z.boolean(), true).describe(
      'True to archive the note, false to restore/unarchive it',
    ),
  }),
};

export const deleteNoteDef = {
  name: 'ikeen_delete_note',
  description:
    'Permanently delete or soft-delete a note from the workspace. Use with caution.',
  inputSchema: z.object({
    noteId: z.string().describe('The UUID of the note to delete'),
    hardDelete: defaultNullable(z.boolean(), false).describe(
      'If true, removes permanently from database; otherwise marks deleted',
    ),
  }),
};
