import { z } from 'zod';
import {
  defaultNullable,
  optionalNullable,
} from '../agent/call-options.js';

export const HEX_COLOR = z
  .string()
  .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Must be a valid hex color code');

export const listFoldersDef = {
  name: 'ikeen_list_folders',
  description:
    'List all folders in the user workspace with their names, colors, icons, and note counts. Optionally filter by name query.',
  inputSchema: z.object({
    query: optionalNullable(z.string()).describe(
      'Optional search query to filter folders by name',
    ),
    limit: defaultNullable(z.number().int().min(1).max(50), 30).describe(
      'Maximum number of folders to return',
    ),
  }),
};

export const createFolderDef = {
  name: 'ikeen_create_folder',
  description:
    'Create a new folder in the user workspace with a name, optional hex color, and icon. Use ONLY when the user explicitly requests creating a folder.',
  inputSchema: z.object({
    name: z.string().trim().min(1).max(100).describe('Name of the new folder'),
    color: defaultNullable(HEX_COLOR, '#3b82f6').describe(
      'Hex color code for the folder (e.g. #3b82f6, #10b981, #f59e0b, #8b5cf6, #ef4444)',
    ),
    icon: defaultNullable(z.string(), 'folder').describe(
      'Icon identifier for the folder, e.g. folder, briefcase, book, lightbulb, code, heart, star',
    ),
  }),
};

export const updateFolderDef = {
  name: 'ikeen_update_folder',
  description:
    'Update an existing folder (rename, change color, update icon, or adjust sort order).',
  inputSchema: z.object({
    folderId: z.string().describe('The UUID of the folder to update'),
    name: optionalNullable(z.string().trim().min(1).max(100)).describe(
      'New name for the folder',
    ),
    color: optionalNullable(HEX_COLOR).describe(
      'New hex color code for the folder (e.g. #3b82f6)',
    ),
    icon: optionalNullable(z.string()).describe(
      'New icon identifier for the folder (e.g. folder, briefcase, book, lightbulb, code)',
    ),
    sortOrder: optionalNullable(z.number().int()).describe(
      'Sort order index for ordering folders in the UI',
    ),
  }),
};

export const organizeNoteDef = {
  name: 'ikeen_organize_note',
  description:
    'Move a note into a specific folder or unassign it, and optionally adjust its tags. Rely strictly on folderId.',
  inputSchema: z.object({
    noteId: z.string().describe('The UUID of the note to organize'),
    folderId: z
      .union([
        z.string().describe('Target folder UUID (from listFolders)'),
        z.null().describe('Pass null to remove note from any folder'),
      ])
      .optional()
      .describe(
        'Target folder UUID (from listFolders), or null to remove note from any folder',
      ),
    tags: optionalNullable(z.array(z.string())).describe(
      'Optional updated array of tags',
    ),
  }),
};
