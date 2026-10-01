import { Logger } from '@nestjs/common';
import { DEFAULT_AGENT_MAX_STEPS } from './agent-config.js';

type AgentToolsContext = {
  recordMemory?: { conversationId: string; userId: string };
  searchNotes?: { conversationId: string; userId: string };
};

export function isStepLimitFinish(
  finishReason: string | undefined,
  stepCount: number,
  maxSteps: number = DEFAULT_AGENT_MAX_STEPS,
) {
  if (stepCount < maxSteps) {
    return false;
  }

  if (!finishReason || finishReason === 'stop') {
    return finishReason !== 'stop';
  }

  return (
    finishReason === 'max-steps' ||
    finishReason === 'tool-calls' ||
    finishReason === 'length' ||
    /step[-_ ]?(count|limit)|max[-_]?steps/i.test(finishReason)
  );
}

export function createAgentLifecycle(
  logger: Logger,
  maxSteps: number = DEFAULT_AGENT_MAX_STEPS,
) {
  return {
    onStart({ toolsContext }: { toolsContext?: AgentToolsContext }) {
      const convId =
        toolsContext?.recordMemory?.conversationId ||
        toolsContext?.searchNotes?.conversationId ||
        'unknown';
      const userId =
        toolsContext?.recordMemory?.userId ||
        toolsContext?.searchNotes?.userId ||
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
      const stepCount = steps?.length ?? 0;

      logger.log(
        `[Agent:End] convId=${convId} steps=${stepCount} ` +
          `inTokens=${usage?.inputTokens ?? 0} outTokens=${usage?.outputTokens ?? 0} ` +
          `reason=${finishReason ?? 'stop'}`,
      );

      if (isStepLimitFinish(finishReason, stepCount, maxSteps)) {
        logger.warn(
          `[Agent:StepLimit] convId=${convId} steps=${stepCount} reason=${finishReason ?? 'unknown'}`,
        );
      }
    },
  };
}
