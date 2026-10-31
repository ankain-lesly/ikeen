import type { AblyService } from '../ably/ably.service.js';
import { getToolMutatedEntities } from '../sync/sync-events.constants.js';
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
  addBlockDef,
  archiveNoteDef,
  attachImageDef,
  createNoteDef,
  deleteBlockDef,
  deleteNoteDef,
  getNoteDetailsDef,
  listRecentNotesDef,
  pinNoteDef,
  searchNotesDef,
  updateBlockDef,
  updateNoteDef,
} from '../notes/notes.tool-definitions.js';
import {
  createFolderDef,
  listFoldersDef,
  organizeNoteDef,
  updateFolderDef,
} from '../folders/folders.tool-definitions.js';
import { generateImageKeenDef } from '../media/media.tool-definitions.js';
import type { MediaService } from '../media/media.service.js';

export interface IkeenMcpServerOptions {
  ably?: AblyService;
  notesToolService: NotesToolService;
  foldersToolService: FoldersToolService;
  mediaService?: MediaService;
  prisma: PrismaService;
  userId: string;
  clientId?: string;
  apiKey?: {
    id: string;
    name: string;
    keyPrefix: string;
  };
}

function formatResult(data: unknown, toolName?: string, ably?: AblyService, userId?: string): CallToolResult {
  const isOk = typeof data === 'object' && data !== null && 'ok' in data && (data as { ok: boolean }).ok === true;
  if (isOk && toolName && ably && userId) {
    const entities = getToolMutatedEntities(toolName);
    if (entities.length > 0) {
      void ably.publishInvalidation(userId, [...entities]);
    }
  }
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
  mediaService,
  prisma,
  userId,
  clientId = 'mcp-client',
  apiKey,
  ably,
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

  const registerMcpTool = <TDef extends { name: string; description: string; inputSchema: z.ZodObject<any> }>(
    def: TDef,
    annotations: { readOnlyHint: boolean; destructiveHint?: boolean; idempotentHint?: boolean },
    run: (args: z.infer<TDef['inputSchema']>) => Promise<unknown>,
  ) => {
    server.registerTool(
      def.name,
      { description: def.description, inputSchema: def.inputSchema.shape, annotations },
      async (args: Record<string, unknown>): Promise<CallToolResult> => {
        try {
          const result = await run(args as z.infer<TDef['inputSchema']>);
          return formatResult(result, def.name, ably, userId);
        } catch (err) {
          return toolError(err instanceof Error ? err.message : String(err));
        }
      },
    );
  };

  // --- 1. NOTES & FOLDERS TOOLS (Canonical ikeen_* registration with annotations) ---

  registerMcpTool(createNoteDef, { readOnlyHint: false, destructiveHint: false }, (args) =>
    notesToolService.createNote(userId, args, toolExecutionOpts),
  );
  registerMcpTool(addBlockDef, { readOnlyHint: false, destructiveHint: false }, (args) =>
    notesToolService.addBlock(userId, args, toolExecutionOpts),
  );
  registerMcpTool(updateBlockDef, { readOnlyHint: false, destructiveHint: false }, (args) =>
    notesToolService.updateBlock(userId, args, toolExecutionOpts),
  );
  registerMcpTool(deleteBlockDef, { readOnlyHint: false, destructiveHint: true }, (args) =>
    notesToolService.deleteBlock(userId, args, toolExecutionOpts),
  );
  registerMcpTool(attachImageDef, { readOnlyHint: false, destructiveHint: false }, (args) =>
    notesToolService.attachImage(userId, args, toolExecutionOpts),
  );
  if (mediaService) {
    registerMcpTool(generateImageKeenDef, { readOnlyHint: false, destructiveHint: false }, (args) =>
      mediaService.generateAndUploadImage(args.description, userId),
    );
  }
  registerMcpTool(getNoteDetailsDef, { readOnlyHint: true }, (args) =>
    notesToolService.getNoteDetails(userId, args),
  );
  registerMcpTool(listRecentNotesDef, { readOnlyHint: true }, (args) =>
    notesToolService.listRecentNotes(userId, args),
  );
  registerMcpTool(deleteNoteDef, { readOnlyHint: false, destructiveHint: true }, (args) =>
    notesToolService.deleteNote(userId, args, toolExecutionOpts),
  );
  registerMcpTool(searchNotesDef, { readOnlyHint: true }, (args) =>
    notesToolService.searchNotes(userId, args),
  );
  registerMcpTool(updateNoteDef, { readOnlyHint: false, destructiveHint: false, idempotentHint: true }, (args) =>
    notesToolService.updateNote(userId, args, toolExecutionOpts),
  );
  registerMcpTool(pinNoteDef, { readOnlyHint: false, destructiveHint: false, idempotentHint: true }, (args) =>
    notesToolService.pinNote(userId, args, toolExecutionOpts),
  );
  registerMcpTool(archiveNoteDef, { readOnlyHint: false, destructiveHint: false, idempotentHint: true }, (args) =>
    notesToolService.archiveNote(userId, args, toolExecutionOpts),
  );
  registerMcpTool(listFoldersDef, { readOnlyHint: true }, (args) =>
    foldersToolService.listFolders(userId, args),
  );
  registerMcpTool(createFolderDef, { readOnlyHint: false, destructiveHint: false }, (args) =>
    foldersToolService.createFolder(userId, args, toolExecutionOpts),
  );
  registerMcpTool(updateFolderDef, { readOnlyHint: false, destructiveHint: false, idempotentHint: true }, (args) =>
    foldersToolService.updateFolder(userId, args, toolExecutionOpts),
  );
  registerMcpTool(organizeNoteDef, { readOnlyHint: false, destructiveHint: false, idempotentHint: true }, (args) =>
    foldersToolService.organizeNote(userId, args, toolExecutionOpts),
  );

  // --- 2. RESOURCES ---

  server.registerResource(
    'recent-notes',
    'ikeen://notes/recent',
    {
      title: 'Recent Notes',
      description: 'Returns the most recently modified active notes in the workspace',
      mimeType: 'application/json',
    },
    async (uri) => {
      const recent = await notesToolService.listRecentNotes(userId, { limit: 15 });
      const notes = recent.ok && 'notes' in recent ? recent.notes : [];
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(notes, null, 2),
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

  // --- 3. PROMPTS ---

  const userPromptResult = (description: string, lines: string[]) => ({
    description,
    messages: [{ role: 'user' as const, content: { type: 'text' as const, text: lines.join('\n') } }],
  });

  const formatNoteLine = (n: { id: string; title?: string | null; content?: string | null; updatedAt?: unknown }, includeDate = false) => {
    const dateSuffix = includeDate && n.updatedAt
      ? `, updated: ${n.updatedAt instanceof Date ? n.updatedAt.toISOString() : String(n.updatedAt)}`
      : '';
    return `- [${n.title || 'Untitled'}] (id: ${n.id}${dateSuffix}): ${n.content || ''}`;
  };

  server.registerPrompt(
    'ikeen-workspace',
    {
      description: 'Instructions on how to navigate, search, and update notes and folders in iKeen',
      argsSchema: {
        task: z.string().describe('The user objective, e.g. finding information or drafting a note'),
      },
    },
    async ({ task }) =>
      userPromptResult('iKeen Workspace Assistant Guidelines', [
        `Task: ${task}`,
        '',
        'When interacting with the user iKeen workspace:',
        '1. Always call `ikeen_search_notes` or `ikeen_list_recent_notes` first to find existing context before creating or altering notes.',
        '2. To read full details of a note, call `ikeen_get_note_details` or inspect the `ikeen://notes/{noteId}` resource.',
        '3. To create interactive notes (checklists, todos, segmented notes), pass `blocks` to `ikeen_create_note` with clean markdown (e.g. type: "list" with "- [ ] task" creates native tap-to-toggle checkboxes on mobile). Leave `content` empty or restricted to a brief summary; never duplicate block text in both `content` and `blocks`.',
        '4. To modify existing checklists or notes, call `ikeen_add_block` or `ikeen_update_block` (with `checklistPatch` for checking/unchecking items or appending tasks) rather than rewriting the full note.',
        '5. When updating a note, prefer appending (`appendContent`) or updating tags unless the user specifically asks to rewrite it. Note that full content replacements return a confirmation diff preview unless `confirm: true` is passed.',
        '6. To organize notes into categories, check existing folders with `ikeen_list_folders` and use `ikeen_organize_note`.',
      ]),
  );

  server.registerPrompt(
    'synthesize-notes',
    {
      description: 'Instructions to synthesize multiple notes into a structured summary or action plan',
      argsSchema: {
        topic: z.string().describe('Topic or tag to synthesize notes about'),
      },
    },
    async ({ topic }) =>
      userPromptResult('Synthesize iKeen Notes by Topic', [
        `Search for all notes relating to "${topic}" using \`ikeen_search_notes\`. Read the relevant notes and synthesize their key points, decisions, and action items into a clean, markdown structured document.`,
      ]),
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
          notesSummary = recent.notes.map((n) => formatNoteLine(n, true)).join('\n');
        }
      } catch {
        notesSummary = '(Failed to fetch recent notes automatically; please call `ikeen_list_recent_notes`)';
      }

      return userPromptResult(
        'iKeen Weekly Review',
        [
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
        ].filter(Boolean),
      );
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
          notesSummary = results.notes.map((n) => formatNoteLine(n)).join('\n');
        }
      } catch {
        notesSummary = `(Failed to search notes automatically; please call \`ikeen_search_notes\` with query "${query}")`;
      }

      return userPromptResult('Extract Action Items from iKeen Notes', [
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
      ]);
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
            notesSummary = uncategorized.map((n) => formatNoteLine(n)).join('\n');
          }
        }

        if (foldersRes.ok && 'folders' in foldersRes && foldersRes.folders.length > 0) {
          foldersSummary = foldersRes.folders.map((f) => `- **${f.name}** (id: ${f.id})`).join('\n');
        }
      } catch {
        // Fallback gracefully
      }

      return userPromptResult('Organize Uncategorized Notes into Folders', [
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
      ]);
    },
  );

  return server;
}


