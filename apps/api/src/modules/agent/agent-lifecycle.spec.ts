import { Logger } from '@nestjs/common';
import { createAgentLifecycle, isStepLimitFinish } from './agent-lifecycle.js';

describe('isStepLimitFinish', () => {
  it('does not warn below the injected step budget', () => {
    expect(isStepLimitFinish('tool-calls', 9, 10)).toBe(false);
    expect(isStepLimitFinish('max-steps', 3, 10)).toBe(false);
  });

  it('does not warn when the budget is used and the model stopped with a reply', () => {
    expect(isStepLimitFinish('stop', 10, 10)).toBe(false);
  });

  it('warns when the loop hits the step cap without a final stop', () => {
    expect(isStepLimitFinish('tool-calls', 10, 10)).toBe(true);
    expect(isStepLimitFinish('max-steps', 10, 10)).toBe(true);
    expect(isStepLimitFinish('length', 10, 10)).toBe(true);
    expect(isStepLimitFinish(undefined, 10, 10)).toBe(true);
  });
});

describe('createAgentLifecycle', () => {
  it('logs a step-limit warning when finishReason indicates the cap', () => {
    const logger = {
      log: vi.fn(),
      warn: vi.fn(),
    } as unknown as Logger;
    const lifecycle = createAgentLifecycle(logger, 10);

    lifecycle.onEnd({
      steps: Array.from({ length: 10 }),
      finishReason: 'tool-calls',
      toolsContext: { searchNotes: { userId: 'user-1', conversationId: 'conv-1' } },
    });

    expect(logger.warn).toHaveBeenCalledWith(
      '[Agent:StepLimit] convId=conv-1 steps=10 reason=tool-calls',
    );
  });
});
