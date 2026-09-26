import { Logger } from '@nestjs/common';

type AgentToolsContext = {
  recordMemory?: { conversationId: string; userId: string };
  searchNotes?: { conversationId: string; userId: string };
};

export function createAgentLifecycle(logger: Logger) {
  return {
    onStart({ toolsContext }: { toolsContext: AgentToolsContext }) {
      const convId =
        toolsContext.recordMemory?.conversationId ||
        toolsContext.searchNotes?.conversationId ||
        'unknown';
      const userId =
        toolsContext.recordMemory?.userId ||
        toolsContext.searchNotes?.userId ||
        'unknown';
      logger.log(`[Agent:Start] convId=${convId} userId=${userId}`);
    },

    onToolExecutionEnd({
      toolCall,
      toolOutput,
      toolExecutionMs,
    }: {
      toolCall: { toolName: string };
      toolOutput: { type: string };
      toolExecutionMs: number;
    }) {
      const isOk = toolOutput.type === 'tool-result';
      logger.log(
        `[Agent:Tool] tool=${toolCall.toolName} ok=${isOk} ms=${toolExecutionMs}`,
      );
    },

    onEnd({
      usage,
      steps,
      finishReason,
      toolsContext,
    }: {
      usage?: {
        totalTokens?: number;
        inputTokens?: number;
        outputTokens?: number;
        outputTokenDetails?: { reasoningTokens?: number };
      };
      steps?: unknown[];
      finishReason?: string;
      toolsContext?: AgentToolsContext;
    }) {
      const convId =
        toolsContext?.recordMemory?.conversationId ||
        toolsContext?.searchNotes?.conversationId ||
        'unknown';
      logger.log(
        `[Agent:End] convId=${convId} steps=${steps?.length ?? 0} ` +
          `inTokens=${usage?.inputTokens ?? 0} outTokens=${usage?.outputTokens ?? 0} ` +
          `reason=${finishReason ?? 'stop'}`,
      );
    },
  };
}
