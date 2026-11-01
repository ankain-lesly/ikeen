import { getToolMutatedEntities } from '../sync/sync-events.constants.js';
import { Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import {
  pipeAgentUIStreamToResponse,
  pruneMessages,
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
import { ComposioService } from './composio.service.js';
import { WebResearchService } from './web-research.service.js';
import {
  latestUserTextMessage,
  normalizeUiMessages,
  textFromMessage,
} from './chat-messages.js';
import type { UIMessage } from 'ai';
import { AuditService } from '../audit/audit.service.js';
import { EnvService } from '../../config/env.service.js';
import { DEFAULT_AGENT_MAX_STEPS } from './agent-config.js';
import { NotesToolService } from '../notes/notes-tool.service.js';
import { FoldersToolService } from '../folders/folders-tool.service.js';
import { MediaService } from '../media/media.service.js';

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);
  private readonly tools: IkeenTools;

  constructor(
    private readonly prisma: PrismaService,
    private readonly ably: AblyService,
    private readonly providerService: AgentProviderService,
    private readonly chatPersistence: ChatPersistenceService,
    private readonly audit: AuditService,
    private readonly env: EnvService,
    private readonly webResearch: WebResearchService,
    private readonly composio: ComposioService,
    private readonly notesToolService: NotesToolService,
    private readonly foldersToolService: FoldersToolService,
    @Optional() private readonly mediaService?: MediaService,
  ) {
    this.tools = createIkeenTools({
      prisma: this.prisma,
      audit: this.audit,
      webResearch: this.webResearch,
      notesToolService: this.notesToolService,
      foldersToolService: this.foldersToolService,
      mediaService: this.mediaService,
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
    const lastUserMessage = latestUserTextMessage(messages);

    if (lastUserMessage) {
      await this.chatPersistence.saveMessages({
        conversationId: activeConversationId,
        messages: [lastUserMessage],
      });

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

    const memories = await this.chatPersistence.listMemoriesForUser(userId);
    const maxSteps = this.env.AGENT_MAX_STEPS ?? DEFAULT_AGENT_MAX_STEPS;
    const webResearch = this.webResearch.isEnabled();
    const session = await this.composio.getSessionTools(
      userId,
      chat.composioSessionId,
    );
    if (session.sessionId && session.sessionId !== chat.composioSessionId) {
      try {
        await this.chatPersistence.updateComposioSessionId({
          conversationId: activeConversationId,
          sessionId: session.sessionId,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'unknown error';
        this.logger.warn(
          `Failed to persist Composio session for convId=${activeConversationId}: ${message}`,
        );
      }
    }
    const instructions = buildIkeenInstructions({
      firstName: user.firstName,
      username: user.username,
      memories,
      maxSteps,
      webResearch,
      today: webResearch ? new Date().toISOString().slice(0, 10) : undefined,
    });

    const agent = new ToolLoopAgent({
      id: 'ikeen-agent',
      model: this.providerService.getChatModel(),
      instructions,
      tools: {
        ...this.tools,
        ...session.tools,
      },
      maxOutputTokens: 8192,
      toolsContext: ikeenToolContext(userId, activeConversationId),
      // stopWhen: [stepCountIs(maxSteps)],
      callOptionsSchema: ikeenAgentCallOptionsSchema,
      prepareCall: ({ options, prompt, ...settings }) => ({
        ...settings,
        instructions,
        prompt: Array.isArray(prompt)
          ? pruneMessages({
              messages: prompt,
              reasoning: 'before-last-message',
              toolCalls: 'before-last-2-messages',
              emptyMessages: 'remove',
            })
          : prompt,
        toolsContext: ikeenToolContext(options.userId, options.conversationId),
      }),

      ...createAgentLifecycle(this.logger, maxSteps),
    });

    const stored = await this.chatPersistence.getConversationWithMessages(
      userId,
      activeConversationId,
    );

    await pipeAgentUIStreamToResponse({
      response,
      agent,
      uiMessages: normalizeUiMessages(stored.uiMessages),
      options: {
        userId,
        conversationId: activeConversationId,
      },
      headers: {
        'X-Agent-Conversation-Id': activeConversationId,
        'X-Agent-Conversation-Title': encodeURIComponent(initialTitle),
      },
      onEnd: async ({ messages: completedMessages, responseMessage }) => {
        try {
          if (titlePromise) {
            try {
              const resolvedTitle = await titlePromise;
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

          await this.chatPersistence.persistChat({
            conversationId: activeConversationId,
            initialMessages: stored.uiMessages,
            messages: completedMessages,
          });

          // Consolidated real-time sync invalidation ping scoped to current turn
          const turnMessages = responseMessage
            ? [responseMessage]
            : completedMessages.slice(-1);
          const mutatedEntities = this.extractMutatedEntities(turnMessages);
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
      if (
        !result ||
        typeof result !== 'object' ||
        (result as { ok?: boolean }).ok !== true
      ) {
        return;
      }

      const entities = getToolMutatedEntities(toolName);
      for (const e of entities) {
        mutated.add(e);
      }
    };

    for (const msg of messages) {
      if (Array.isArray(msg.parts)) {
        for (const part of msg.parts) {
          const p = part as Record<string, unknown>;
          if (typeof p.type === 'string' && p.type.startsWith('tool-')) {
            const toolName = p.type.replace(/^tool-/, '');
            const result = p.output ?? p.result;
            if (p.state !== 'error' && p.state !== 'output-error') {
              recordMutation(toolName, result);
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
