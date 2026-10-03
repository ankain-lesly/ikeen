import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const create = vi.fn();
const use = vi.fn();

vi.mock('@composio/core', () => ({
  Composio: class {
    create = create;
    use = use;
  },
}));

vi.mock('@composio/vercel', () => ({
  VercelProvider: class {},
}));

import { ComposioService } from './composio.service.js';

describe('ComposioService', () => {
  beforeEach(() => {
    create.mockReset();
    use.mockReset();
  });

  it('creates a session and returns its tools', async () => {
    const tools = { COMPOSIO_SEARCH_TOOLS: { execute: vi.fn() } };
    create.mockResolvedValue({
      sessionId: 'session-1',
      tools: vi.fn().mockResolvedValue(tools),
    });

    const module = await Test.createTestingModule({
      providers: [ComposioService],
    }).compile();
    const service = module.get(ComposioService);

    await expect(service.getSessionTools('user-1')).resolves.toEqual({
      tools,
      sessionId: 'session-1',
    });
    expect(create).toHaveBeenCalledWith('user-1');
    expect(use).not.toHaveBeenCalled();
  });

  it('resumes a stored session id', async () => {
    const tools = { COMPOSIO_MANAGE_CONNECTIONS: { execute: vi.fn() } };
    use.mockResolvedValue({
      sessionId: 'session-existing',
      tools: vi.fn().mockResolvedValue(tools),
    });

    const module = await Test.createTestingModule({
      providers: [ComposioService],
    }).compile();
    const service = module.get(ComposioService);

    await expect(
      service.getSessionTools('user-1', 'session-existing'),
    ).resolves.toEqual({
      tools,
      sessionId: 'session-existing',
    });
    expect(use).toHaveBeenCalledWith('session-existing');
    expect(create).not.toHaveBeenCalled();
  });

  it('creates a new session when resume fails', async () => {
    const tools = { COMPOSIO_SEARCH_TOOLS: { execute: vi.fn() } };
    use.mockRejectedValue(new Error('session gone'));
    create.mockResolvedValue({
      sessionId: 'session-2',
      tools: vi.fn().mockResolvedValue(tools),
    });

    const module = await Test.createTestingModule({
      providers: [ComposioService],
    }).compile();
    const service = module.get(ComposioService);

    await expect(
      service.getSessionTools('user-1', 'session-stale'),
    ).resolves.toEqual({
      tools,
      sessionId: 'session-2',
    });
    expect(use).toHaveBeenCalledWith('session-stale');
    expect(create).toHaveBeenCalledWith('user-1');
  });
});
