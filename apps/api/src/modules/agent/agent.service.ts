import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  pipeAgentUIStreamToResponse,
  stepCountIs,
  ToolLoopAgent,
} from 'ai';
import type { ServerResponse } from 'node:http';
import { PrismaService } from '../../prisma/prisma.service';
import { AblyService } from '../ably/ably.service';
import { AgentProviderService } from './agent-provider.service';
import { createAgentLifecycle } from './agent-lifecycle';
import {
  ikeenAgentCallOptionsSchema,
  ikeenToolContext,
} from './call-options';
import { buildIkeenInstructions } from './prompts';
import { createIkeenTools, type IkeenTools } from './tools';

import { ChatPersistenceService } from './chat-persistence.service';
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
    const activeConversationId =
      conversationId?.trim() || `conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Fetch user details for contextual prompt personalization
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, username: true },
    });

    if (!user) {
      throw new NotFoundException('User workspace profile not found');
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
      },
      onEnd: async ({ messages: completedMessages }) => {
        try {
          await this.chatPersistence.persistChat({
            conversationId: activeConversationId,
            userId,
            messages: completedMessages as UIMessage[],
          });
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
