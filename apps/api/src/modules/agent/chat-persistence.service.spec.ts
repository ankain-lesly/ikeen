import { Test, TestingModule } from '@nestjs/testing';
import { ChatPersistenceService } from './chat-persistence.service';
import { PrismaService } from '../../prisma/prisma.service';
import type { UIMessage } from 'ai';

type MockPrisma = {
  chatConversation: Record<string, ReturnType<typeof vi.fn>>;
  chatMessage: Record<string, ReturnType<typeof vi.fn>>;
  chatMemory: Record<string, ReturnType<typeof vi.fn>>;
};

describe('ChatPersistenceService', () => {
  let service: ChatPersistenceService;
  let mockPrisma: MockPrisma;

  beforeEach(async () => {
    mockPrisma = {
      chatConversation: {
        upsert: vi.fn().mockResolvedValue({ id: 'conv-1' }),
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'conv-1',
            title: 'Test Conversation',
            createdAt: new Date(),
            updatedAt: new Date(),
            messages: [{ content: 'Hello', role: 'user', createdAt: new Date() }],
            _count: { messages: 2 },
          },
        ]),
        count: vi.fn().mockResolvedValue(1),
        findFirst: vi.fn().mockResolvedValue({
          id: 'conv-1',
          title: 'Test Conversation',
          createdAt: new Date(),
          updatedAt: new Date(),
          messages: [
            {
              id: 'm-1',
              role: 'user',
              content: 'Hello',
              parts: [{ type: 'text', text: 'Hello' }],
              sequence: 0,
              createdAt: new Date(),
            },
            {
              id: 'm-2',
              role: 'assistant',
              content: 'Hi there!',
              parts: [{ type: 'text', text: 'Hi there!' }],
              sequence: 1,
              createdAt: new Date(),
            },
          ],
        }),
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      chatMessage: {
        count: vi.fn().mockResolvedValue(1),
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      chatMemory: {
        create: vi.fn().mockResolvedValue({ id: 'mem-1' }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatPersistenceService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ChatPersistenceService>(ChatPersistenceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should only insert pending messages via createMany in persistChat', async () => {
    const messages: UIMessage[] = [
      { id: 'm-1', role: 'user', parts: [{ type: 'text', text: 'Existing message' }] },
      { id: 'm-2', role: 'assistant', parts: [{ type: 'text', text: 'New response' }] },
    ];

    // mockPrisma.chatMessage.count returns 1 existing message
    const result = await service.persistChat({
      conversationId: 'conv-1',
      userId: 'user-1',
      messages,
    });

    expect(mockPrisma.chatConversation.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'conv-1' },
      }),
    );

    // Only the second message (index 1) should be inserted
    expect(mockPrisma.chatMessage.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'New response',
          sequence: 1,
        }),
      ],
    });

    expect(result.insertedCount).toBe(1);
  });

  it('should save memory record to chatMemory', async () => {
    await service.saveMemoryRecord({
      userId: 'user-1',
      conversationId: 'conv-1',
      category: 'GOAL',
      description: 'Finish mobile app architecture',
      importance: 5,
    });

    expect(mockPrisma.chatMemory.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        conversationId: 'conv-1',
        category: 'GOAL',
        description: 'Finish mobile app architecture',
        importance: 5,
      },
    });
  });

  it('should list conversations with previews and counts', async () => {
    const result = await service.listConversations('user-1');

    expect(result.total).toBe(1);
    expect(result.conversations).toHaveLength(1);
    expect(result.conversations[0].title).toBe('Test Conversation');
  });

  it('should retrieve conversation and rehydrate UIMessages', async () => {
    const result = await service.getConversationWithMessages('user-1', 'conv-1');

    expect(result.id).toBe('conv-1');
    expect(result.uiMessages).toHaveLength(2);
    expect(result.uiMessages[0].parts[0]).toEqual({ type: 'text', text: 'Hello' });
  });
});
