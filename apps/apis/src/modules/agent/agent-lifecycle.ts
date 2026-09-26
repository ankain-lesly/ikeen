import { Logger } from '@nestjs/common';

export function createAgentLifecycle(logger: Logger) {
  return {
    onStart(event: {
      toolsContext?: Record<string, { conversationId?: string; userId?: string }>;
    }) {
      const convId =
        event.toolsContext?.recordMemory?.conversationId ||
        event.toolsContext?.searchNotes?.conversationId ||
        'unknown';
      const userId =
        event.toolsContext?.recordMemory?.userId ||
        event.toolsContext?.searchNotes?.userId ||
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

    onEnd(event: {
      usage?: {
        totalTokens?: number;
        inputTokens?: number;
        outputTokens?: number;
        outputTokenDetails?: { reasoningTokens?: number };
      };
      steps?: unknown[];
      finishReason?: string;
      toolsContext?: Record<string, { conversationId?: string; userId?: string }>;
    }) {
      const convId =
        event.toolsContext?.recordMemory?.conversationId ||
        event.toolsContext?.searchNotes?.conversationId ||
        'unknown';
      logger.log(
        `[Agent:End] convId=${convId} steps=${event.steps?.length ?? 0} ` +
          `inTokens=${event.usage?.inputTokens ?? 0} outTokens=${event.usage?.outputTokens ?? 0} ` +
          `reason=${event.finishReason ?? 'stop'}`,
      );
    },
  };
}
