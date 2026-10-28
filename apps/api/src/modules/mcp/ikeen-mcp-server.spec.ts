import { describe, expect, it, vi, beforeEach } from 'vitest';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { createIkeenMcpServer } from './ikeen-mcp-server.js';

describe('IkeenMcpServer', () => {
  let mockNotesToolService: any;
  let mockFoldersToolService: any;
  let mockPrisma: any;

  beforeEach(() => {
    mockNotesToolService = {
      createNote: vi.fn().mockResolvedValue({ ok: true, noteId: 'note-1', title: 'Test Note' }),
      getNoteDetails: vi.fn().mockResolvedValue({ ok: true, id: 'note-1', title: 'Test Note', content: 'Body' }),
      listRecentNotes: vi.fn().mockResolvedValue({ ok: true, notes: [], total: 0 }),
      deleteNote: vi.fn().mockResolvedValue({ ok: true, noteId: 'note-1', deleted: true }),
      searchNotes: vi.fn().mockResolvedValue({ ok: true, notes: [], total: 0 }),
      updateNote: vi.fn().mockResolvedValue({ ok: true, noteId: 'note-1' }),
      pinNote: vi.fn().mockResolvedValue({ ok: true, noteId: 'note-1', isPinned: true }),
      archiveNote: vi.fn().mockResolvedValue({ ok: true, noteId: 'note-1', isArchived: true }),
    };

    mockFoldersToolService = {
      listFolders: vi.fn().mockResolvedValue({ ok: true, folders: [] }),
      createFolder: vi.fn().mockResolvedValue({ ok: true, folderId: 'folder-1' }),
      updateFolder: vi.fn().mockResolvedValue({ ok: true, folderId: 'folder-1' }),
      organizeNote: vi.fn().mockResolvedValue({ ok: true, noteId: 'note-1' }),
    };

    mockPrisma = {
      note: {
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn().mockResolvedValue(null),
      },
      folder: {
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn().mockResolvedValue(null),
      },
    };
  });

  it('initializes an McpServer instance with name "ikeen" and version "1.0.0"', () => {
    const server = createIkeenMcpServer({
      notesToolService: mockNotesToolService,
      foldersToolService: mockFoldersToolService,
      prisma: mockPrisma,
      userId: 'user-123',
      clientId: 'test-client',
    });

    expect(server).toBeDefined();
    expect(server.server).toBeDefined();
  });

  it('lists exactly 15 canonical ikeen_* tools with appropriate annotations', async () => {
    const server = createIkeenMcpServer({
      notesToolService: mockNotesToolService,
      foldersToolService: mockFoldersToolService,
      prisma: mockPrisma,
      userId: 'user-123',
      clientId: 'test-client',
    });

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);

    const client = new Client({ name: 'test-client', version: '1.0.0' }, { capabilities: {} });
    await client.connect(clientTransport);

    const toolsResult = await client.listTools();
    expect(toolsResult.tools.length).toBe(15);

    for (const tool of toolsResult.tools) {
      expect(tool.name).toMatch(/^ikeen_/);
      expect(tool.annotations).toBeDefined();
    }

    const deleteTool = toolsResult.tools.find((t) => t.name === 'ikeen_delete_note');
    expect(deleteTool?.annotations?.destructiveHint).toBe(true);

    const readTool = toolsResult.tools.find((t) => t.name === 'ikeen_get_note_details');
    expect(readTool?.annotations?.readOnlyHint).toBe(true);

    await client.close();
    await server.close();
  });

  it('executes a tool call successfully and passes user and client options', async () => {
    const server = createIkeenMcpServer({
      notesToolService: mockNotesToolService,
      foldersToolService: mockFoldersToolService,
      prisma: mockPrisma,
      userId: 'user-456',
      clientId: 'mcp-test-runner',
    });

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);

    const client = new Client({ name: 'test-client', version: '1.0.0' }, { capabilities: {} });
    await client.connect(clientTransport);

    const result = await client.callTool({
      name: 'ikeen_create_note',
      arguments: {
        title: 'Meeting Notes',
        content: 'Agenda items',
      },
    });

    expect(mockNotesToolService.createNote).toHaveBeenCalledWith(
      'user-456',
      expect.objectContaining({ title: 'Meeting Notes', content: 'Agenda items' }),
      { source: 'mcp', clientId: 'mcp-test-runner' },
    );
    expect(result.isError).toBeFalsy();
    expect(result.content).toBeDefined();

    await client.close();
    await server.close();
  });

  it('throws an error for non-existent resource according to MCP spec', async () => {
    const server = createIkeenMcpServer({
      notesToolService: mockNotesToolService,
      foldersToolService: mockFoldersToolService,
      prisma: mockPrisma,
      userId: 'user-789',
    });

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);

    const client = new Client({ name: 'test-client', version: '1.0.0' }, { capabilities: {} });
    await client.connect(clientTransport);

    await expect(
      client.readResource({ uri: 'ikeen://notes/non-existent-note-id' }),
    ).rejects.toThrow();

    await client.close();
    await server.close();
  });

  it('lists registered prompts and renders weekly-review prompt with notes context', async () => {
    mockNotesToolService.listRecentNotes.mockResolvedValueOnce({
      ok: true,
      notes: [
        { id: 'note-abc', title: 'Q3 Objectives', content: 'Focus on MCP integration', updatedAt: new Date() },
      ],
      total: 1,
    });

    const server = createIkeenMcpServer({
      notesToolService: mockNotesToolService,
      foldersToolService: mockFoldersToolService,
      prisma: mockPrisma,
      userId: 'user-prompt-test',
    });

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);

    const client = new Client({ name: 'test-client', version: '1.0.0' }, { capabilities: {} });
    await client.connect(clientTransport);

    const promptsResult = await client.listPrompts();
    const promptNames = promptsResult.prompts.map((p) => p.name);

    expect(promptNames).toContain('ikeen-workspace');
    expect(promptNames).toContain('synthesize-notes');
    expect(promptNames).toContain('weekly-review');
    expect(promptNames).toContain('extract-action-items');
    expect(promptNames).toContain('organize-inbox');

    const prompt = await client.getPrompt({
      name: 'weekly-review',
      arguments: { focus: 'Product goals' },
    });

    expect(prompt.description).toBe('iKeen Weekly Review');
    expect(prompt.messages.length).toBeGreaterThan(0);
    const messageText = (prompt.messages[0].content as { type: string; text: string }).text;
    expect(messageText).toContain('Product goals');
    expect(messageText).toContain('Q3 Objectives');

    await client.close();
    await server.close();
  });
});

