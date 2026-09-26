import { Test, TestingModule } from '@nestjs/testing';
import { ChatPersistenceService } from './chat-persistence.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
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
        findUnique: vi.fn().mockResolvedValue({ id: 'conv-1', title: 'Test Conversation', userId: 'user-1' }),
        create: vi.fn().mockResolvedValue({ id: 'conv-1', title: 'New Brainstorm' }),
        update: vi.fn().mockResolvedValue({ id: 'conv-1' }),
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
        findMany: vi.fn().mockResolvedValue([{ id: 'm-1', sequence: 0 }]),
        findUnique: vi.fn().mockResolvedValue(null),
        findFirst: vi.fn().mockResolvedValue({ sequence: 0 }),
        create: vi.fn().mockResolvedValue({ id: 'm-1' }),
        update: vi.fn().mockResolvedValue({ id: 'm-1' }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
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
      messages,
    });

    expect(mockPrisma.chatConversation.update).toHaveBeenCalledWith(
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
      skipDuplicates: true,
    });

    expect(result.insertedCount).toBe(1);
  });

  it('should filter initial messages, call updateMessage, and save only the rest', async () => {
    const initialMessages: UIMessage[] = [
      { id: 'm-1', role: 'user', parts: [{ type: 'text', text: 'Prompt' }] },
    ];
    const completedMessages: UIMessage[] = [
      { id: 'm-1', role: 'user', parts: [{ type: 'text', text: 'Prompt' }] },
      { id: 'm-2', role: 'assistant', parts: [{ type: 'text', text: 'Step 1' }] },
      { id: 'm-2', role: 'assistant', parts: [{ type: 'text', text: 'Final' }] },
    ];

    const result = await service.persistChat({
      conversationId: 'conv-1',
      initialMessages,
      messages: completedMessages,
    });

    expect(mockPrisma.chatMessage.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'm-1' },
      }),
    );

    // Only m-2 should be in createMany, and deduplicated to 1 item
    expect(mockPrisma.chatMessage.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          id: 'm-2',
          role: 'assistant',
          content: 'Final',
        }),
      ],
      skipDuplicates: true,
    });

    expect(result.insertedCount).toBe(1);
    expect(result.updatedCount).toBe(1);
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

  it('should retrieve a chat by id via getChatById', async () => {
    mockPrisma.chatConversation.findUnique.mockResolvedValueOnce({
      id: 'conv-1',
      title: 'Existing Chat',
      userId: 'user-1',
    });

    const chat = await service.getChatById({ id: 'conv-1' });
    expect(chat).toEqual(expect.objectContaining({ id: 'conv-1', title: 'Existing Chat' }));
  });

  it('should create a chat via createChat', async () => {
    mockPrisma.chatConversation.create.mockResolvedValueOnce({
      id: 'conv-new',
      title: 'New Brainstorm',
      userId: 'user-1',
    });

    const chat = await service.createChat({
      id: 'conv-new',
      userId: 'user-1',
      title: 'New Brainstorm',
    });

    expect(chat).toEqual(expect.objectContaining({ id: 'conv-new', title: 'New Brainstorm' }));
    expect(mockPrisma.chatConversation.create).toHaveBeenCalledWith({
      data: {
        id: 'conv-new',
        userId: 'user-1',
        title: 'New Brainstorm',
      },
      select: expect.any(Object),
    });
  });

  it('should save messages via saveMessages', async () => {
    const userMessage: UIMessage = {
      id: 'msg-user-1',
      role: 'user',
      parts: [{ type: 'text', text: 'Plan sprint' }],
    };

    const count = await service.saveMessages({
      conversationId: 'conv-1',
      messages: [userMessage],
    });

    expect(count).toBe(1);
    expect(mockPrisma.chatMessage.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          id: 'msg-user-1',
          conversationId: 'conv-1',
          role: 'user',
          content: 'Plan sprint',
        }),
      ],
      skipDuplicates: true,
    });
  });

  it('should update a message via updateMessage', async () => {
    const updated = await service.updateMessage({
      id: 'msg-1',
      content: 'Updated content',
      parts: [{ type: 'text', text: 'Updated content' }],
    });

    expect(updated).toBe(true);
    expect(mockPrisma.chatMessage.updateMany).toHaveBeenCalledWith({
      where: { id: 'msg-1' },
      data: {
        content: 'Updated content',
        parts: [{ type: 'text', text: 'Updated content' }],
      },
    });
  });
});
