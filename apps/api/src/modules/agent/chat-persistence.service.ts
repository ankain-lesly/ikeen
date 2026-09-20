import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { UIMessage } from 'ai';
import { PrismaService } from '../../prisma/prisma.service';
import {
  persistableParts,
  textFromMessage,
  uiMessagesFromRows,
} from './chat-messages';

@Injectable()
export class ChatPersistenceService {
  private readonly logger = new Logger(ChatPersistenceService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Upserts the conversation thread and performs an append-only batch insert
   * for newly added messages without rewriting previous history.
   */
  async persistChat({
    conversationId,
    userId,
    messages,
    title,
  }: {
    conversationId: string;
    userId: string;
    messages: UIMessage[];
    title?: string;
  }): Promise<{ conversationId: string; insertedCount: number }> {
    try {
      // Derive a clean title from the first user message if not set
      let derivedTitle = title;
      if (!derivedTitle && messages.length > 0) {
        const firstUser = messages.find((m) => m.role === 'user');
        if (firstUser) {
          const text = textFromMessage(firstUser);
          if (text) {
            derivedTitle = text.length > 60 ? `${text.slice(0, 57)}...` : text;
          }
        }
      }

      await this.prisma.chatConversation.upsert({
        where: { id: conversationId },
        create: {
          id: conversationId,
          userId,
          title: derivedTitle || 'Brainstorming Session',
        },
        update: {
          updatedAt: new Date(),
          ...(derivedTitle ? { title: derivedTitle } : {}),
        },
      });

      const existingCount = await this.prisma.chatMessage.count({
        where: { conversationId },
      });

      const pending = messages.slice(existingCount);
      if (pending.length === 0) {
        return { conversationId, insertedCount: 0 };
      }

      let sequence = existingCount;
      const toInsert = pending.map((msg) => {
        const seq = sequence++;
        return {
          id:
            msg.id && typeof msg.id === 'string'
              ? msg.id
              : `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          conversationId,
          role: msg.role,
          content: textFromMessage(msg).slice(0, 8000),
          parts: persistableParts(msg),
          sequence: seq,
        };
      });

      await this.prisma.chatMessage.createMany({
        data: toInsert,
      });

      this.logger.log(
        `[ChatPersistence:Saved] convId=${conversationId} inserted=${toInsert.length} existing=${existingCount}`,
      );

      return { conversationId, insertedCount: toInsert.length };
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
      conversations: conversations.map((c) => ({
        id: c.id,
        title: c.title,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        messageCount: c._count.messages,
        lastMessage: c.messages[0] || null,
      })),
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

    return {
      id: conversation.id,
      title: conversation.title,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      uiMessages: uiMessagesFromRows(conversation.messages),
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
