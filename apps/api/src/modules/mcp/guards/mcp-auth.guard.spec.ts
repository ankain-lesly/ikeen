import { describe, expect, it, vi, beforeEach } from 'vitest';
import { McpAuthGuard } from './mcp-auth.guard.js';
import { UnauthorizedException } from '@nestjs/common';

describe('McpAuthGuard', () => {
  let guard: McpAuthGuard;
  let mockApiKeyService: any;
  let mockJwtService: any;
  let mockPrisma: any;

  beforeEach(() => {
    mockApiKeyService = {
      validateApiKey: vi.fn(),
    };
    mockJwtService = {
      verifyAsync: vi.fn(),
    };
    mockPrisma = {
      user: {
        findUnique: vi.fn(),
      },
    };
    guard = new McpAuthGuard(mockApiKeyService, mockJwtService, mockPrisma);
  });

  function createMockContext(headers: Record<string, string>) {
    const req: any = { headers };
    return {
      switchToHttp: () => ({
        getRequest: () => req,
      }),
      switchToRpc: () => ({
        getContext: () => ({
          getRawRequest: () => req,
        }),
      }),
      req,
    };
  }

  it('authenticates via x-api-key with ikn_ token', async () => {
    const user = { id: 'user-1', email: 'test@ikeen.app', username: 'tester', status: 'active' };
    mockApiKeyService.validateApiKey.mockResolvedValue(user);

    const context = createMockContext({ 'x-api-key': 'ikn_live_abcdef123456789' });
    const result = await guard.canActivate(context as any);

    expect(result).toBe(true);
    expect(context.req.user).toEqual(user);
    expect(mockApiKeyService.validateApiKey).toHaveBeenCalledWith('ikn_live_abcdef123456789');
  });

  it('authenticates via Authorization Bearer ikn_ token', async () => {
    const user = { id: 'user-1', email: 'test@ikeen.app', username: 'tester', status: 'active' };
    mockApiKeyService.validateApiKey.mockResolvedValue(user);

    const context = createMockContext({ authorization: 'Bearer ikn_live_abcdef123456789' });
    const result = await guard.canActivate(context as any);

    expect(result).toBe(true);
    expect(context.req.user).toEqual(user);
    expect(mockApiKeyService.validateApiKey).toHaveBeenCalledWith('ikn_live_abcdef123456789');
  });

  it('authenticates via Authorization Bearer JWT token', async () => {
    const user = { id: 'user-jwt', email: 'jwt@ikeen.app', username: 'jwtuser', status: 'active' };
    mockJwtService.verifyAsync.mockResolvedValue({ sub: 'user-jwt' });
    mockPrisma.user.findUnique.mockResolvedValue(user);

    const context = createMockContext({ authorization: 'Bearer eyJhbGciOi...' });
    const result = await guard.canActivate(context as any);

    expect(result).toBe(true);
    expect(context.req.user).toEqual(user);
    expect(mockJwtService.verifyAsync).toHaveBeenCalledWith('eyJhbGciOi...');
  });

  it('throws UnauthorizedException when no credentials are provided', async () => {
    const context = createMockContext({});
    await expect(guard.canActivate(context as any)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
