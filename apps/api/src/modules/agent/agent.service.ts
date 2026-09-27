import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  pipeAgentUIStreamToResponse,
  stepCountIs,
  ToolLoopAgent,
} from 'ai';
import type { ServerResponse } from 'node:http';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AblyService } from '../ably/ably.service.js';
import { AgentProviderService } from './agent-provider.service.js';
import { createAgentLifecycle } from './agent-lifecycle.js';
import {
  ikeenAgentCallOptionsSchema,
  ikeenToolContext,
} from './call-options.js';
import { buildIkeenInstructions } from './prompts/index.js';
import { createIkeenTools, type IkeenTools } from './tools/index.js';

import { ChatPersistenceService } from './chat-persistence.service.js';
import { textFromMessage } from './chat-messages.js';
import type { UIMessage } from 'ai';

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);
  private readonly tools: IkeenTools;

  constructor(
    private readonly prisma: PrismaService,
    private readonly ably: AblyService,
    private readonly providerService: AgentProviderService,
    private readonly chatPersistence: ChatPersistenceService,
  ) {
    this.tools = createIkeenTools({
      prisma: this.prisma,
      ably: this.ably,
    });
    this.logger.log('Ikeen AgentService initialized with tool registry');
  }

  /**
   * Returns the registered tools for the agent.
   */
  getTools(): IkeenTools {
    return this.tools;
  }

  /**
   * Executes the agent loop and pipes the SSE/UI stream directly to the Express ServerResponse.
   */
  async streamChatToResponse({
    userId,
    conversationId,
    messages,
    response,
  }: {
    userId: string;
    conversationId?: string;
    messages: UIMessage[];
    response: ServerResponse;
  }): Promise<void> {

    // Fetch user details for contextual prompt personalization
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, username: true },
    });

    if (!user) {
      throw new NotFoundException('User workspace profile not found');
    }


    // 1. Retrieve or create the chat conversation
    let chat = conversationId
      ? await this.chatPersistence.getChatById({ id: conversationId })
      : null;

    let isNew = false;
    if (!chat) {
      chat = await this.chatPersistence.createChat({
        id: conversationId,
        userId,
        title: 'New Brainstorm',
      });
      isNew = true;
    } else if (chat.userId !== userId) {
      throw new NotFoundException('Conversation not found or access denied');
    }

    if (!chat) {
      throw new NotFoundException('Conversation not found');
    }

    const activeConversationId = chat.id;
    const initialTitle = chat.title || 'New Brainstorm';

    let titlePromise: Promise<string> | null = null;

    // 2. Eagerly persist incoming user message before launching the agent loop
    const lastUserMessage = messages.filter((m) => m.role === 'user').pop();
    let savedUserMessageId: string | undefined;

    if (lastUserMessage) {
      await this.chatPersistence.saveMessages({
        conversationId: activeConversationId,
        messages: [lastUserMessage],
      });
      savedUserMessageId = lastUserMessage.id;

      // 3. Initiate non-blocking semantic title generation if this is a new conversation
      if (isNew) {
        const userText = textFromMessage(lastUserMessage);
        if (userText) {
          titlePromise = this.chatPersistence.generateTitleFromPrompt({
            prompt: userText,
          });
        }
      }
    }

    const instructions = buildIkeenInstructions({
      firstName: user.firstName,
      username: user.username,
    });

    const agent = new ToolLoopAgent({
      id: 'ikeen-agent',
      model: this.providerService.getChatModel(),
      instructions,
      tools: this.tools,
      maxOutputTokens: 8192,
      toolsContext: ikeenToolContext(userId, activeConversationId),
      stopWhen: [stepCountIs(8)],
      callOptionsSchema: ikeenAgentCallOptionsSchema,
      prepareCall: ({ options, ...settings }) => ({
        ...settings,
        instructions,
        toolsContext: ikeenToolContext(options.userId, options.conversationId),
      }),
      ...createAgentLifecycle(this.logger),
    });

    await pipeAgentUIStreamToResponse({
      response,
      agent,
      uiMessages: messages,
      options: {
        userId,
        conversationId: activeConversationId,
      },
      headers: {
        'X-Agent-Conversation-Id': activeConversationId,
        'X-Agent-Conversation-Title': encodeURIComponent(initialTitle),
      },
      onEnd: async ({ messages: completedMessages }) => {
        try {
          let resolvedTitle: string | undefined;
          if (titlePromise) {
            try {
              resolvedTitle = await titlePromise;
              await this.chatPersistence.updateTitle({
                conversationId: activeConversationId,
                title: resolvedTitle,
              });
            } catch (err) {
              this.logger.warn(
                `Failed to resolve titlePromise for convId=${activeConversationId}: ${err}`,
              );
            }
          }

          // Filter and update the saved message(s) from above
          const existingInDb = await this.prisma.chatMessage.findMany({
            where: { conversationId: activeConversationId },
            select: { id: true },
          });
          const savedIds = new Set(existingInDb.map((row) => row.id));
          if (savedUserMessageId) {
            savedIds.add(savedUserMessageId);
          }

          for (const msg of completedMessages) {
            if (msg.id && savedIds.has(msg.id)) {
              await this.chatPersistence.updateMessage({
                id: msg.id,
                message: msg,
              });
            }
          }

          // The rest will serve as saveMessages
          const rest = completedMessages.filter(
            (m) => !m.id || !savedIds.has(m.id),
          );

          if (rest.length > 0) {
            // Deduplicate intermediate tool loop chunks by id, keeping latest state
            const uniqueRest = new Map<string, UIMessage>();
            for (const msg of rest) {
              if (msg.id) {
                uniqueRest.set(msg.id, msg);
              } else {
                uniqueRest.set(`temp_${uniqueRest.size}`, msg);
              }
            }

            await this.chatPersistence.saveMessages({
              conversationId: activeConversationId,
              messages: Array.from(uniqueRest.values()),
            });
          }

          // Strategy B: Consolidated real-time sync invalidation ping across conversational turn
          const mutatedEntities = this.extractMutatedEntities(completedMessages);
          if (mutatedEntities.size > 0) {
            const entities = Array.from(mutatedEntities);
            this.logger.log(
              `Dispatching consolidated sync invalidation for user ${userId}: [${entities.join(', ')}]`,
            );
            await this.ably.publishInvalidation(userId, entities);
          }
        } catch (error) {
          this.logger.error(
            `Failed to persist completed chat for convId=${activeConversationId}`,
            error,
          );
        }
      },
    });
  }

  /**
   * Scans completed messages from an agent turn to discover which database entities
   * (e.g. notes, folders) were mutated by successfully executed tools.
   */
  extractMutatedEntities(messages: UIMessage[]): Set<string> {
    const mutated = new Set<string>();

    const recordMutation = (toolName: string, result: unknown) => {
      // If the tool explicitly returned { ok: false, ... }, the mutation failed
      if (
        result &&
        typeof result === 'object' &&
        'ok' in result &&
        (result as { ok?: boolean }).ok === false
      ) {
        return;
      }

      switch (toolName) {
        case 'createNote':
        case 'updateNote':
        case 'pinNote':
        case 'archiveNote':
          mutated.add('notes');
          break;
        case 'createFolder':
        case 'updateFolder':
          mutated.add('folders');
          break;
        case 'organizeNote':
          mutated.add('notes');
          mutated.add('folders');
          break;
      }
    };

    for (const msg of messages) {
      if (Array.isArray(msg.parts)) {
        for (const part of msg.parts) {
          const p = part as Record<string, unknown>;
          if (typeof p.type === 'string' && p.type.startsWith('tool-')) {
            const toolName = p.type.replace(/^tool-/, '');
            const result = p.output ?? p.result;
            if (p.state !== 'error') {
              recordMutation(toolName, result);
            }
          } else if (p.toolInvocation && typeof p.toolInvocation === 'object') {
            const inv = p.toolInvocation as Record<string, unknown>;
            const toolName = String(inv.toolName || '');
            if (inv.state !== 'error') {
              recordMutation(toolName, inv.result);
            }
          }
        }
      }

      const legacyInvocations = (msg as unknown as Record<string, unknown>).toolInvocations;
      if (Array.isArray(legacyInvocations)) {
        for (const inv of legacyInvocations) {
          if (inv && typeof inv === 'object') {
            const i = inv as Record<string, unknown>;
            const toolName = String(i.toolName || '');
            if (i.state !== 'error') {
              recordMutation(toolName, i.result);
            }
          }
        }
      }
    }

    return mutated;
  }

  /**
   * Retrieves conversation threads for an authenticated user.
   */
  async listConversations(userId: string, limit?: number, offset?: number) {
    return this.chatPersistence.listConversations(userId, limit, offset);
  }

  /**
   * Retrieves a single conversation thread with rehydrated messages.
   */
  async getConversation(userId: string, conversationId: string) {
    return this.chatPersistence.getConversationWithMessages(userId, conversationId);
  }

  /**
   * Deletes a conversation thread.
   */
  async deleteConversation(userId: string, conversationId: string) {
    return this.chatPersistence.deleteConversation(userId, conversationId);
  }
}
