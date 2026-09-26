import { Test, TestingModule } from '@nestjs/testing';
import type { UIMessage } from 'ai';
import { AgentService } from './agent.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AblyService } from '../ably/ably.service.js';
import { AgentProviderService } from './agent-provider.service.js';
import { ChatPersistenceService } from './chat-persistence.service.js';

describe('AgentService', () => {
  let service: AgentService;

  beforeEach(async () => {
    const mockPrisma = {
      note: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      folder: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
      },
      user: {
        findUnique: vi.fn(),
      },
      auditLog: {
        create: vi.fn(),
      },
      chatMessage: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    };

    const mockAbly = {
      publishInvalidation: vi.fn().mockResolvedValue(undefined),
      isEnabled: vi.fn().mockReturnValue(true),
    };

    const mockProvider = {
      getChatModel: vi.fn().mockReturnValue({}),
    };

    const mockChatPersistence = {
      getChatById: vi.fn().mockResolvedValue({ id: 'conv-1', title: 'New Brainstorm', userId: 'user-1' }),
      createChat: vi.fn().mockResolvedValue({ id: 'conv-1', title: 'New Brainstorm', userId: 'user-1' }),
      saveMessages: vi.fn().mockResolvedValue(1),
      updateMessage: vi.fn().mockResolvedValue(undefined),
      generateTitleFromPrompt: vi.fn().mockResolvedValue('New Brainstorm'),
      updateTitle: vi.fn().mockResolvedValue(undefined),
      persistChat: vi.fn().mockResolvedValue({ conversationId: 'conv-1', insertedCount: 1 }),
      listConversations: vi.fn().mockResolvedValue({ total: 0, conversations: [] }),
      getConversationWithMessages: vi.fn().mockResolvedValue(null),
      deleteConversation: vi.fn().mockResolvedValue({ ok: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AblyService, useValue: mockAbly },
        { provide: AgentProviderService, useValue: mockProvider },
        { provide: ChatPersistenceService, useValue: mockChatPersistence },
      ],
    }).compile();

    service = module.get<AgentService>(AgentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should have all recommended iKeen tools registered', () => {
    const tools = service.getTools();
    const toolNames = Object.keys(tools);

    expect(toolNames).toContain('searchNotes');
    expect(toolNames).toContain('getNoteDetails');
    expect(toolNames).toContain('listRecentNotes');
    expect(toolNames).toContain('createNote');
    expect(toolNames).toContain('updateNote');
    expect(toolNames).toContain('listFolders');
    expect(toolNames).toContain('createFolder');
    expect(toolNames).toContain('updateFolder');
    expect(toolNames).toContain('organizeNote');
    expect(toolNames).toContain('pinNote');
    expect(toolNames).toContain('archiveNote');
    expect(toolNames).toContain('recordMemory');
    expect(toolNames).toContain('summarizeKnowledge');
  });

  describe('extractMutatedEntities (Strategy B)', () => {
    it('should return empty set for pure text messages or read-only tools', () => {
      const messages: UIMessage[] = [
        {
          id: 'm-1',
          role: 'user',
          parts: [{ type: 'text', text: 'Hello, what notes do I have?' }],
        },
        {
          id: 'm-2',
          role: 'assistant',
          parts: [
            {
              type: 'tool-searchNotes' as 'text',
              input: { query: 'test' },
              output: { ok: true, count: 0, notes: [] },
              state: 'output-available',
            } as unknown as UIMessage['parts'][number],
            { type: 'text', text: 'You have no notes.' },
          ],
        },
      ];

      const mutated = service.extractMutatedEntities(messages);
      expect(mutated.size).toBe(0);
    });

    it('should detect notes mutation from createNote and updateNote', () => {
      const messages: UIMessage[] = [
        {
          id: 'm-1',
          role: 'assistant',
          parts: [
            {
              type: 'tool-createNote' as 'text',
              output: { ok: true, noteId: 'note-1' },
            } as unknown as UIMessage['parts'][number],
            {
              type: 'tool-updateNote' as 'text',
              output: { ok: true, noteId: 'note-1' },
            } as unknown as UIMessage['parts'][number],
          ],
        },
      ];

      const mutated = service.extractMutatedEntities(messages);
      expect(Array.from(mutated)).toEqual(['notes']);
    });

    it('should detect folders mutation from createFolder and updateFolder', () => {
      const messages: UIMessage[] = [
        {
          id: 'm-1',
          role: 'assistant',
          parts: [
            {
              type: 'tool-createFolder' as 'text',
              output: { ok: true, folderId: 'f-1' },
            } as unknown as UIMessage['parts'][number],
            {
              type: 'tool-updateFolder' as 'text',
              output: { ok: true, folderId: 'f-1' },
            } as unknown as UIMessage['parts'][number],
          ],
        },
      ];

      const mutated = service.extractMutatedEntities(messages);
      expect(Array.from(mutated)).toEqual(['folders']);
    });

    it('should detect both notes and folders when organizeNote runs alongside pinNote', () => {
      const messages: UIMessage[] = [
        {
          id: 'm-1',
          role: 'assistant',
          parts: [
            {
              type: 'tool-organizeNote' as 'text',
              output: { ok: true, noteId: 'note-1', folderId: 'f-1' },
            } as unknown as UIMessage['parts'][number],
            {
              type: 'tool-pinNote' as 'text',
              output: { ok: true, noteId: 'note-1', isPinned: true },
            } as unknown as UIMessage['parts'][number],
          ],
        },
      ];

      const mutated = service.extractMutatedEntities(messages);
      expect(mutated.has('notes')).toBe(true);
      expect(mutated.has('folders')).toBe(true);
      expect(mutated.size).toBe(2);
    });

    it('should ignore failed tool executions (ok: false or state: error)', () => {
      const messages: UIMessage[] = [
        {
          id: 'm-1',
          role: 'assistant',
          parts: [
            {
              type: 'tool-createNote' as 'text',
              output: { ok: false, error: 'Database timeout' },
            } as unknown as UIMessage['parts'][number],
            {
              type: 'tool-createFolder' as 'text',
              state: 'error',
            } as unknown as UIMessage['parts'][number],
          ],
        },
      ];

      const mutated = service.extractMutatedEntities(messages);
      expect(mutated.size).toBe(0);
    });
  });
});
