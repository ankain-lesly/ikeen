import { Test, TestingModule } from '@nestjs/testing';
import { AgentService } from './agent.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AblyService } from '../ably/ably.service';
import { AgentProviderService } from './agent-provider.service';
import { ChatPersistenceService } from './chat-persistence.service';

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
});
