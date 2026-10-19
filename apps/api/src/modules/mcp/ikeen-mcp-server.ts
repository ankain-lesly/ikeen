import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  ErrorCode,
  McpError,
  type CallToolResult,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import type { PrismaService } from '../../prisma/prisma.service.js';
import type { NotesToolService } from '../notes/notes-tool.service.js';
import type { FoldersToolService } from '../folders/folders-tool.service.js';
import {
  archiveNoteDef,
  createNoteDef,
  deleteNoteDef,
  getNoteDetailsDef,
  listRecentNotesDef,
  pinNoteDef,
  searchNotesDef,
  updateNoteDef,
} from '../notes/notes.tool-definitions.js';
import {
  createFolderDef,
  listFoldersDef,
  organizeNoteDef,
  updateFolderDef,
} from '../folders/folders.tool-definitions.js';

export interface IkeenMcpServerOptions {
  notesToolService: NotesToolService;
  foldersToolService: FoldersToolService;
  prisma: PrismaService;
  userId: string;
  clientId?: string;
  apiKey?: {
    id: string;
    name: string;
    keyPrefix: string;
  };
}

function formatResult(data: unknown): CallToolResult {
  const isErr =
    typeof data === 'object' &&
    data !== null &&
    'ok' in data &&
    (data as { ok: boolean }).ok === false;

  return {
    content: [
      {
        type: 'text',
        text: typeof data === 'string' ? data : JSON.stringify(data, null, 2),
      },
    ],
    ...(isErr ? { isError: true } : {}),
  };
}

function toolError(message: string): CallToolResult {
  return {
    isError: true,
    content: [{ type: 'text', text: `Tool error: ${message}` }],
  };
}

export function createIkeenMcpServer({
  notesToolService,
  foldersToolService,
  prisma,
  userId,
  clientId = 'mcp-client',
  apiKey,
}: IkeenMcpServerOptions): McpServer {
  const server = new McpServer(
    {
      name: 'ikeen',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
      },
    },
  );

  const toolExecutionOpts = {
    source: 'mcp' as const,
    clientId,
    apiKey,
  };

  // --- 1. NOTES TOOLS (Canonical ikeen_* registration with annotations) ---

  server.registerTool(
    createNoteDef.name,
    {
      description: createNoteDef.description,
      inputSchema: createNoteDef.inputSchema.shape,
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    async (args: z.infer<typeof createNoteDef.inputSchema>): Promise<CallToolResult> => {
      try {
        const result = await notesToolService.createNote(userId, args, toolExecutionOpts);
        return formatResult(result);
      } catch (err) {
        return toolError(err instanceof Error ? err.message : String(err));
      }
    },
  );

  server.registerTool(
    getNoteDetailsDef.name,
    {
      description: getNoteDetailsDef.description,
      inputSchema: getNoteDetailsDef.inputSchema.shape,
      annotations: { readOnlyHint: true },
    },
    async (args: z.infer<typeof getNoteDetailsDef.inputSchema>): Promise<CallToolResult> => {
      try {
        const result = await notesToolService.getNoteDetails(userId, args);
        return formatResult(result);
      } catch (err) {
        return toolError(err instanceof Error ? err.message : String(err));
      }
    },
  );

  server.registerTool(
    listRecentNotesDef.name,
    {
      description: listRecentNotesDef.description,
      inputSchema: listRecentNotesDef.inputSchema.shape,
      annotations: { readOnlyHint: true },
    },
    async (args: z.infer<typeof listRecentNotesDef.inputSchema>): Promise<CallToolResult> => {
      try {
        const result = await notesToolService.listRecentNotes(userId, args);
        return formatResult(result);
      } catch (err) {
        return toolError(err instanceof Error ? err.message : String(err));
      }
    },
  );

  server.registerTool(
    deleteNoteDef.name,
    {
      description: deleteNoteDef.description,
      inputSchema: deleteNoteDef.inputSchema.shape,
      annotations: { readOnlyHint: false, destructiveHint: true },
    },
    async (args: z.infer<typeof deleteNoteDef.inputSchema>): Promise<CallToolResult> => {
      try {
        const result = await notesToolService.deleteNote(userId, args, toolExecutionOpts);
        return formatResult(result);
      } catch (err) {
        return toolError(err instanceof Error ? err.message : String(err));
      }
    },
  );

  server.registerTool(
    searchNotesDef.name,
    {
      description: searchNotesDef.description,
      inputSchema: searchNotesDef.inputSchema.shape,
      annotations: { readOnlyHint: true },
    },
    async (args: z.infer<typeof searchNotesDef.inputSchema>): Promise<CallToolResult> => {
      try {
        const result = await notesToolService.searchNotes(userId, args);
        return formatResult(result);
      } catch (err) {
        return toolError(err instanceof Error ? err.message : String(err));
      }
    },
  );

  server.registerTool(
    updateNoteDef.name,
    {
      description: updateNoteDef.description,
      inputSchema: updateNoteDef.inputSchema.shape,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    async (args: z.infer<typeof updateNoteDef.inputSchema>): Promise<CallToolResult> => {
      try {
        const result = await notesToolService.updateNote(userId, args, toolExecutionOpts);
        return formatResult(result);
      } catch (err) {
        return toolError(err instanceof Error ? err.message : String(err));
      }
    },
  );

  server.registerTool(
    pinNoteDef.name,
    {
      description: pinNoteDef.description,
      inputSchema: pinNoteDef.inputSchema.shape,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    async (args: z.infer<typeof pinNoteDef.inputSchema>): Promise<CallToolResult> => {
      try {
        const result = await notesToolService.pinNote(userId, args, toolExecutionOpts);
        return formatResult(result);
      } catch (err) {
        return toolError(err instanceof Error ? err.message : String(err));
      }
    },
  );

  server.registerTool(
    archiveNoteDef.name,
    {
      description: archiveNoteDef.description,
      inputSchema: archiveNoteDef.inputSchema.shape,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    async (args: z.infer<typeof archiveNoteDef.inputSchema>): Promise<CallToolResult> => {
      try {
        const result = await notesToolService.archiveNote(userId, args, toolExecutionOpts);
        return formatResult(result);
      } catch (err) {
        return toolError(err instanceof Error ? err.message : String(err));
      }
    },
  );

  // --- 2. FOLDERS TOOLS (Canonical ikeen_* registration with annotations) ---

  server.registerTool(
    listFoldersDef.name,
    {
      description: listFoldersDef.description,
      inputSchema: listFoldersDef.inputSchema.shape,
      annotations: { readOnlyHint: true },
    },
    async (args: z.infer<typeof listFoldersDef.inputSchema>): Promise<CallToolResult> => {
      try {
        const result = await foldersToolService.listFolders(userId, args);
        return formatResult(result);
      } catch (err) {
        return toolError(err instanceof Error ? err.message : String(err));
      }
    },
  );

  server.registerTool(
    createFolderDef.name,
    {
      description: createFolderDef.description,
      inputSchema: createFolderDef.inputSchema.shape,
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    async (args: z.infer<typeof createFolderDef.inputSchema>): Promise<CallToolResult> => {
      try {
        const result = await foldersToolService.createFolder(userId, args, toolExecutionOpts);
        return formatResult(result);
      } catch (err) {
        return toolError(err instanceof Error ? err.message : String(err));
      }
    },
  );

  server.registerTool(
    updateFolderDef.name,
    {
      description: updateFolderDef.description,
      inputSchema: updateFolderDef.inputSchema.shape,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    async (args: z.infer<typeof updateFolderDef.inputSchema>): Promise<CallToolResult> => {
      try {
        const result = await foldersToolService.updateFolder(userId, args, toolExecutionOpts);
        return formatResult(result);
      } catch (err) {
        return toolError(err instanceof Error ? err.message : String(err));
      }
    },
  );

  server.registerTool(
    organizeNoteDef.name,
    {
      description: organizeNoteDef.description,
      inputSchema: organizeNoteDef.inputSchema.shape,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    async (args: z.infer<typeof organizeNoteDef.inputSchema>): Promise<CallToolResult> => {
      try {
        const result = await foldersToolService.organizeNote(userId, args, toolExecutionOpts);
        return formatResult(result);
      } catch (err) {
        return toolError(err instanceof Error ? err.message : String(err));
      }
    },
  );

  // --- 3. RESOURCES ---

  server.registerResource(
    'recent-notes',
    'ikeen://notes/recent',
    {
      title: 'Recent Notes',
      description: 'Returns the most recently modified active notes in the workspace',
      mimeType: 'application/json',
    },
    async (uri) => {
      const notes = await prisma.note.findMany({
        where: {
          userId,
          deletedAt: null,
          isArchived: false,
        },
        select: {
          id: true,
          title: true,
          content: true,
          tags: true,
          folderId: true,
          isPinned: true,
          updatedAt: true,
        },
        orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }],
        take: 15,
      });

      const mapped = notes.map((n) => {
        const isTruncated = n.content.trim().length > 280;
        return {
          ...n,
          content: isTruncated
            ? `${n.content.trim().slice(0, 280)}… [truncated]`
            : n.content.trim(),
          isTruncated,
        };
      });

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(mapped, null, 2),
          },
        ],
      };
    },
  );

  server.registerResource(
    'note-content',
    new ResourceTemplate('ikeen://notes/{noteId}', {
      list: async () => {
        const notes = await prisma.note.findMany({
          where: { userId, deletedAt: null },
          select: { id: true, title: true },
          take: 50,
          orderBy: { updatedAt: 'desc' },
        });
        return {
          resources: notes.map((n) => ({
            uri: `ikeen://notes/${n.id}`,
            name: n.title,
            mimeType: 'text/markdown',
          })),
        };
      },
    }),
    {
      title: 'Note Content',
      description: 'Returns the raw markdown body and metadata of a specific note',
      mimeType: 'text/markdown',
    },
    async (uri, { noteId }) => {
      const note = await prisma.note.findFirst({
        where: {
          id: String(noteId),
          userId,
          deletedAt: null,
        },
        select: {
          id: true,
          title: true,
          content: true,
          tags: true,
          updatedAt: true,
        },
      });

      if (!note) {
        throw new McpError(ErrorCode.InvalidParams, `Note not found: ${noteId}`);
      }

      const safeTitle = JSON.stringify(note.title);
      const safeTags = JSON.stringify(note.tags);
      const header = `---\ntitle: ${safeTitle}\nid: ${note.id}\ntags: ${safeTags}\nupdatedAt: ${note.updatedAt.toISOString()}\n---\n\n`;
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'text/markdown',
            text: `${header}# ${note.title}\n\n${note.content}`,
          },
        ],
      };
    },
  );

  server.registerResource(
    'folder-overview',
    new ResourceTemplate('ikeen://folders/{folderId}', {
      list: async () => {
        const folders = await prisma.folder.findMany({
          where: { userId, deletedAt: null },
          select: { id: true, name: true },
          take: 50,
          orderBy: { updatedAt: 'desc' },
        });
        return {
          resources: folders.map((f) => ({
            uri: `ikeen://folders/${f.id}`,
            name: f.name,
            mimeType: 'application/json',
          })),
        };
      },
    }),
    {
      title: 'Folder Overview',
      description: 'Returns folder details and all notes inside the specified folder',
      mimeType: 'application/json',
    },
    async (uri, { folderId }) => {
      const folder = await prisma.folder.findFirst({
        where: {
          id: String(folderId),
          userId,
          deletedAt: null,
        },
        include: {
          notes: {
            where: { deletedAt: null },
            select: {
              id: true,
              title: true,
              tags: true,
              isPinned: true,
              updatedAt: true,
            },
          },
        },
      });

      if (!folder) {
        throw new McpError(ErrorCode.InvalidParams, `Folder not found: ${folderId}`);
      }

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(folder, null, 2),
          },
        ],
      };
    },
  );

  // --- 4. PROMPTS ---

  server.registerPrompt(
    'ikeen-workspace',
    {
      description: 'Instructions on how to navigate, search, and update notes and folders in iKeen',
      argsSchema: {
        task: z.string().describe('The user objective, e.g. finding information or drafting a note'),
      },
    },
    async ({ task }) => ({
      description: 'iKeen Workspace Assistant Guidelines',
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: [
              `Task: ${task}`,
              '',
              'When interacting with the user iKeen workspace:',
              '1. Always call `ikeen_search_notes` or `ikeen_list_recent_notes` first to find existing context before creating or altering notes.',
              '2. To read full details of a note, call `ikeen_get_note_details` or inspect the `ikeen://notes/{noteId}` resource.',
              '3. When updating a note, prefer appending (`appendContent`) or updating tags unless the user specifically asks to rewrite it. Note that full content replacements return a confirmation diff preview unless `confirm: true` is passed.',
              '4. To organize notes into categories, check existing folders with `ikeen_list_folders` and use `ikeen_organize_note`.',
            ].join('\n'),
          },
        },
      ],
    }),
  );

  server.registerPrompt(
    'synthesize-notes',
    {
      description: 'Instructions to synthesize multiple notes into a structured summary or action plan',
      argsSchema: {
        topic: z.string().describe('Topic or tag to synthesize notes about'),
      },
    },
    async ({ topic }) => ({
      description: 'Synthesize iKeen Notes by Topic',
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Search for all notes relating to "${topic}" using \`ikeen_search_notes\`. Read the relevant notes and synthesize their key points, decisions, and action items into a clean, markdown structured document.`,
          },
        },
      ],
    }),
  );

  server.registerPrompt(
    'weekly-review',
    {
      description: 'Review and synthesize notes from the past week into accomplishments, insights, and next steps',
      argsSchema: {
        focus: z.string().optional().describe('Optional specific focus or objective to highlight during the review'),
      },
    },
    async ({ focus }) => {
      let notesSummary = '(No recent notes found)';
      try {
        const recent = await notesToolService.listRecentNotes(userId, { limit: 15 });
        if (recent.ok && 'notes' in recent && recent.notes.length > 0) {
          notesSummary = recent.notes
            .map(
              (n) =>
                `- [${n.title || 'Untitled'}] (id: ${n.id}, updated: ${n.updatedAt instanceof Date ? n.updatedAt.toISOString() : String(n.updatedAt)}): ${n.content || ''}`,
            )
            .join('\n');
        }
      } catch {
        notesSummary = '(Failed to fetch recent notes automatically; please call `ikeen_list_recent_notes`)';
      }

      return {
        description: 'iKeen Weekly Review',
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: [
                'Please perform a comprehensive weekly review based on my recent iKeen notes below.',
                focus ? `Specific focus for this review: ${focus}` : '',
                '',
                '### Objectives:',
                '1. **Key Accomplishments & Themes**: Group related updates and summarize major milestones.',
                '2. **Action Items & Follow-ups**: Identify todos, open questions, commitments, or deadlines.',
                '3. **Suggested Next Steps**: Propose prioritized priorities for the upcoming week.',
                '4. If any note needs deeper context, call `ikeen_get_note_details` with the note id.',
                '',
                '### Recent Notes in Workspace:',
                notesSummary,
              ]
                .filter(Boolean)
                .join('\n'),
            },
          },
        ],
      };
    },
  );

  server.registerPrompt(
    'extract-action-items',
    {
      description: 'Extract actionable tasks, deadlines, and owners from notes matching a topic or query',
      argsSchema: {
        query: z.string().describe('Search query, topic, or keyword to extract tasks from'),
      },
    },
    async ({ query }) => {
      let notesSummary = '(No matching notes found)';
      try {
        const results = await notesToolService.searchNotes(userId, { query, limit: 10 });
        if (results.ok && 'notes' in results && results.notes.length > 0) {
          notesSummary = results.notes
            .map(
              (n) =>
                `- [${n.title || 'Untitled'}] (id: ${n.id}): ${n.content || ''}`,
            )
            .join('\n');
        }
      } catch {
        notesSummary = `(Failed to search notes automatically; please call \`ikeen_search_notes\` with query "${query}")`;
      }

      return {
        description: 'Extract Action Items from iKeen Notes',
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: [
                `Analyze the following notes matching "${query}" and extract a prioritized action plan:`,
                '',
                '### Format requested:',
                '- **High Priority / Immediate**: Tasks with urgent deadlines or blockers.',
                '- **Standard Tasks**: Action items with context, suggested owners, or milestones.',
                '- **Follow-up Questions**: Ambiguities or unresolved decisions.',
                '- If deeper content is needed for any note, call `ikeen_get_note_details`.',
                '',
                '### Notes Matching Query:',
                notesSummary,
              ].join('\n'),
            },
          },
        ],
      };
    },
  );

  server.registerPrompt(
    'organize-inbox',
    {
      description: 'Review uncategorized notes and propose moving them into appropriate folders',
      argsSchema: {},
    },
    async () => {
      let notesSummary = '(All recent notes are already organized into folders!)';
      let foldersSummary = '(No folders found)';

      try {
        const [notesRes, foldersRes] = await Promise.all([
          notesToolService.listRecentNotes(userId, { limit: 30 }),
          foldersToolService.listFolders(userId, { limit: 50 }),
        ]);

        if (notesRes.ok && 'notes' in notesRes) {
          const uncategorized = notesRes.notes.filter((n) => !n.folderId);
          if (uncategorized.length > 0) {
            notesSummary = uncategorized
              .map(
                (n) =>
                  `- [${n.title || 'Untitled'}] (id: ${n.id}): ${n.content || ''}`,
              )
              .join('\n');
          }
        }

        if (foldersRes.ok && 'folders' in foldersRes && foldersRes.folders.length > 0) {
          foldersSummary = foldersRes.folders
            .map((f) => `- **${f.name}** (id: ${f.id})`)
            .join('\n');
        }
      } catch {
        // Fallback gracefully
      }

      return {
        description: 'Organize Uncategorized Notes into Folders',
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: [
                'Help organize my uncategorized notes into appropriate folders.',
                '',
                '### Available Folders:',
                foldersSummary,
                '',
                '### Uncategorized Notes to Categorize:',
                notesSummary,
                '',
                '### Instructions:',
                '1. Propose which existing folder each note belongs to based on its subject.',
                '2. If a note does not fit any existing folder, suggest creating a new folder.',
                '3. Suggest moving notes using `ikeen_organize_note` with `{ noteId, folderId }`.',
              ].join('\n'),
            },
          },
        ],
      };
    },
  );

  return server;
}


