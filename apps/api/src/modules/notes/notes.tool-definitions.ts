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
    'Retrieve full content, tags, folder, and metadata of a specific note by ID.',
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

export const createNoteDef = {
  name: 'ikeen_create_note',
  description:
    'Create a new note in the workspace with title, markdown content, optional folderId, and tags.',
  inputSchema: z.object({
    title: z.string().trim().min(1).describe('Title of the note'),
    content: z
      .string()
      .describe('Markdown content or body of the note'),
    folderId: optionalId.describe(
      'Folder id from listFolders. Omit to save at root. Do not pass null.',
    ),
    tags: z
      .array(z.string())
      .default([])
      .describe('List of tags to categorize the note'),
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
