import {
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import type { UIMessage } from 'ai';
import { generateText } from 'ai';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AgentProviderService } from './agent-provider.service.js';
import {
  persistableParts,
  textFromMessage,
  uiMessagesFromRows,
} from './chat-messages.js';
import { PROMPT_SEGMENT_TITLE_GENERATION } from './prompts/segments.js';

@Injectable()
export class ChatPersistenceService {
  private readonly logger = new Logger(ChatPersistenceService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly providerService?: AgentProviderService,
  ) {}

  /**
   * Retrieves a chat conversation by ID.
   */
  async getChatById({ id }: { id?: string }) {
    if (!id) return null;
    return this.prisma.chatConversation.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        userId: true,
        composioSessionId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Creates a new chat conversation record in the database.
   */
  async createChat({
    id,
    userId,
    title = 'New Brainstorm',
  }: {
    id?: string;
    userId: string;
    title?: string;
  }) {
    return this.prisma.chatConversation.create({
      data: {
        ...(id ? { id } : {}),
        userId,
        title,
      },
      select: {
        id: true,
        title: true,
        userId: true,
        composioSessionId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Stores the Composio session id so later turns in this thread can resume it.
   */
  async updateComposioSessionId({
    conversationId,
    sessionId,
  }: {
    conversationId: string;
    sessionId: string;
  }) {
    return this.prisma.chatConversation.update({
      where: { id: conversationId },
      data: { composioSessionId: sessionId },
      select: { id: true, composioSessionId: true },
    });
  }

  /**
   * Persists new messages to the database.
   * Calculates the next sequence dynamically from the highest existing sequence.
   */
  async saveMessages({
    conversationId,
    messages,
  }: {
    conversationId: string;
    messages: UIMessage[];
  }): Promise<number> {
    if (!messages || messages.length === 0) {
      return 0;
    }

    const lastMessage = await this.prisma.chatMessage.findFirst({
      where: { conversationId },
      orderBy: { sequence: 'desc' },
      select: { sequence: true },
    });

    let nextSequence = lastMessage !== null ? lastMessage.sequence + 1 : 0;

    const toInsert = messages.map((msg) => ({
      ...(msg.id ? { id: msg.id } : {}),
      conversationId,
      role: msg.role,
      content: textFromMessage(msg).slice(0, 8000),
      parts: persistableParts(msg),
      sequence: nextSequence++,
    }));

    await this.prisma.chatMessage.createMany({
      data: toInsert,
      skipDuplicates: true,
    });

    await this.touchConversation(conversationId);

    this.logger.log(
      `[ChatPersistence:MessagesSaved] convId=${conversationId} count=${toInsert.length}`,
    );

    return toInsert.length;
  }

  /**
   * Bumps conversation updatedAt so the thread list stays ordered.
   */
  async touchConversation(conversationId: string): Promise<void> {
    await this.prisma.chatConversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });
  }

  /**
   * Updates an existing message's content and/or parts (e.g. tool execution results).
   */
  async updateMessage({
    id,
    message,
    content,
    parts,
  }: {
    id: string;
    message?: UIMessage;
    content?: string;
    parts?: ReturnType<typeof persistableParts>;
  }): Promise<boolean> {
    const updatedContent =
      content !== undefined
        ? content
        : message
          ? textFromMessage(message).slice(0, 8000)
          : undefined;

    const updatedParts =
      parts !== undefined
        ? parts
        : message
          ? persistableParts(message)
          : undefined;

    const result = await this.prisma.chatMessage.updateMany({
      where: { id },
      data: {
        ...(updatedContent !== undefined ? { content: updatedContent } : {}),
        ...(updatedParts !== undefined ? { parts: updatedParts } : {}),
      },
    });

    if (result.count > 0) {
      this.logger.log(`[ChatPersistence:MessageUpdated] msgId=${id}`);
      return true;
    }
    return false;
  }

  /**
   * Generates a semantic title from user prompt.
   * Falls back to a clean truncated prompt if model generation fails.
   */
  async generateTitleFromPrompt({
    prompt,
  }: {
    prompt: string;
  }): Promise<string> {
    const cleanPrompt = prompt.trim().replace(/\s+/g, ' ');
    if (!cleanPrompt) return 'New Brainstorm';

    let generatedTitle = '';
    if (this.providerService) {
      try {
        const model = this.providerService.getChatModel();
        const response = await generateText({
          model,
          system: PROMPT_SEGMENT_TITLE_GENERATION,
          prompt: cleanPrompt.slice(0, 500),
          maxOutputTokens: 20,
        });
        generatedTitle =
          response.text
            ?.trim()
            .replace(/^["']|["']$/g, '')
            .replace(/\.$/, '') || '';
      } catch (genError) {
        this.logger.warn(
          `AI title generation failed, using fallback: ${genError}`,
        );
      }
    }

    return (
      generatedTitle ||
      (cleanPrompt.length > 50 ? `${cleanPrompt.slice(0, 47)}...` : cleanPrompt)
    );
  }

  /**
   * Updates conversation title by id.
   */
  async updateTitle({
    conversationId,
    title,
  }: {
    conversationId: string;
    title: string;
  }): Promise<void> {
    await this.prisma.chatConversation.update({
      where: { id: conversationId },
      data: { title },
    });
    this.logger.log(
      `[ChatPersistence:TitleUpdated] convId=${conversationId} title="${title}"`,
    );
  }

  /**
   * Persists completed chat messages and updates conversation timestamp.
   * Updates mutated tool messages and batch-inserts new assistant messages.
   */
  async persistChat({
    conversationId,
    initialMessages = [],
    messages,
  }: {
    conversationId: string;
    initialMessages?: UIMessage[];
    messages: UIMessage[];
  }): Promise<{
    conversationId: string;
    insertedCount: number;
    updatedCount: number;
  }> {
    try {
      // 1. Touch conversation timestamp
      await this.prisma.chatConversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });

      // 2. Identify saved messages from above
      const savedIds = new Set(initialMessages.map((m) => m.id).filter(Boolean));

      const existingInDb = await this.prisma.chatMessage.findMany({
        where: { conversationId },
        select: { id: true },
      });
      for (const row of existingInDb) {
        savedIds.add(row.id);
      }

      let updatedCount = 0;
      const restMap = new Map<string, UIMessage>();

      for (const msg of messages) {
        const msgId = msg.id && typeof msg.id === 'string' ? msg.id : null;
        if (msgId && savedIds.has(msgId)) {
          // Message was saved from above; update content & tool parts
          await this.updateMessage({ id: msgId, message: msg });
          updatedCount++;
        } else if (msgId) {
          // Deduplicate multi-step tool chunks for the same turn, keeping latest state
          restMap.set(msgId, msg);
        } else {
          restMap.set(`temp_${restMap.size}`, msg);
        }
      }

      // 3. The rest will serve as saveMessages
      const toSave = Array.from(restMap.values());
      let insertedCount = 0;

      if (toSave.length > 0) {
        insertedCount = await this.saveMessages({
          conversationId,
          messages: toSave,
        });
      }

      this.logger.log(
        `[ChatPersistence:Persisted] convId=${conversationId} inserted=${insertedCount} updated=${updatedCount}`,
      );

      return { conversationId, insertedCount, updatedCount };
    } catch (error) {
      this.logger.error(
        `[ChatPersistence:Error] Failed to persist chat for convId=${conversationId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Persists an autonomous memory insight to ChatMemory.
   */
  async saveMemoryRecord({
    userId,
    conversationId,
    category,
    description,
    importance,
  }: {
    userId: string;
    conversationId?: string;
    category: string;
    description: string;
    importance: number;
  }) {
    return this.prisma.chatMemory.create({
      data: {
        userId,
        conversationId: conversationId || null,
        category,
        description: description.trim(),
        importance: Math.min(Math.max(importance, 1), 5),
      },
    });
  }

  /**
   * Loads the highest-importance memories for prompt injection (no extra agent step).
   */
  async listMemoriesForUser(userId: string, { limit = 12 }: { limit?: number } = {}) {
    const take = Math.min(Math.max(limit, 1), 24);
    const rows = await this.prisma.chatMemory.findMany({
      where: { userId },
      orderBy: [{ importance: 'desc' }, { createdAt: 'desc' }],
      take,
      select: {
        category: true,
        description: true,
        importance: true,
      },
    });

    return rows.map((row) => ({
      category: row.category,
      description: row.description.trim().slice(0, 200),
    }));
  }

  /**
   * Lists conversations for an authenticated user with pagination and latest message preview.
   */
  async listConversations(userId: string, limit = 20, offset = 0) {
    const [conversations, total] = await Promise.all([
      this.prisma.chatConversation.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          messages: {
            take: 1,
            orderBy: { sequence: 'desc' },
            select: {
              content: true,
              role: true,
              createdAt: true,
            },
          },
          _count: {
            select: { messages: true },
          },
        },
      }),
      this.prisma.chatConversation.count({ where: { userId } }),
    ]);

    return {
      total,
      limit,
      offset,
      conversations: conversations.map(
        (c: {
          id: string;
          title: string | null;
          createdAt: Date;
          updatedAt: Date;
          _count: { messages: number };
          messages: Array<{
            content: string;
            role: string;
            createdAt: Date;
          }>;
        }) => ({
        id: c.id,
        title: c.title,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        messageCount: c._count.messages,
        lastMessage: c.messages[0] || null,
      }),
      ),
    };
  }

  /**
   * Retrieves a single conversation thread with its rehydrated AI SDK UIMessages.
   */
  async getConversationWithMessages(userId: string, conversationId: string) {
    const conversation = await this.prisma.chatConversation.findFirst({
      where: {
        id: conversationId,
        userId,
      },
      include: {
        messages: {
          orderBy: { sequence: 'asc' },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const uiMessages = uiMessagesFromRows(conversation.messages);

    return {
      id: conversation.id,
      title: conversation.title,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      uiMessages,
      messages: uiMessages,
    };
  }

  /**
   * Deletes a conversation and its messages.
   */
  async deleteConversation(userId: string, conversationId: string) {
    const result = await this.prisma.chatConversation.deleteMany({
      where: {
        id: conversationId,
        userId,
      },
    });

    if (result.count === 0) {
      throw new NotFoundException('Conversation not found');
    }

    return { ok: true, conversationId };
  }
}
