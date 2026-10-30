import { describe, expect, it, vi, beforeEach } from 'vitest';
import { McpAuthGuard } from './mcp-auth.guard.js';
import { UnauthorizedException } from '@nestjs/common';

describe('McpAuthGuard', () => {
  let guard: McpAuthGuard;
  let mockApiKeyService: any;
  let mockJwtService: any;
  let mockPrisma: any;
  let mockEnv: any;

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
    mockEnv = {
      API_URL: 'https://api.ikeen.app',
      MCP_ALLOW_APP_JWT: false,
      getMcpResourceUrl: vi.fn().mockReturnValue('https://api.ikeen.app/mcp'),
    };
    guard = new McpAuthGuard(mockApiKeyService, mockJwtService, mockPrisma, mockEnv);
  });

  function createMockContext(headers: Record<string, string>) {
    const req: any = { headers };
    const res: any = { setHeader: vi.fn() };
    return {
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => res,
      }),
      switchToRpc: () => ({
        getContext: () => ({
          getRawRequest: () => req,
        }),
      }),
      req,
      res,
    };
  }

  it('authenticates via x-api-key with ikn_ token', async () => {
    const user = { id: 'user-1', email: 'test@ikeen.app', username: 'tester', status: 'active' };
    mockApiKeyService.validateApiKey.mockResolvedValue({
      user,
      apiKey: { id: 'key-1', name: 'My Key', keyPrefix: 'ikn_live_abc' },
    });

    const context = createMockContext({ 'x-api-key': 'ikn_live_abcdef123456789' });
    const result = await guard.canActivate(context as any);

    expect(result).toBe(true);
    expect(context.req.user).toEqual(user);
    expect(context.req.apiKey).toEqual({ id: 'key-1', name: 'My Key', keyPrefix: 'ikn_live_abc' });
    expect(mockApiKeyService.validateApiKey).toHaveBeenCalledWith('ikn_live_abcdef123456789');
  });

  it('authenticates via Authorization Bearer ikn_ token', async () => {
    const user = { id: 'user-1', email: 'test@ikeen.app', username: 'tester', status: 'active' };
    mockApiKeyService.validateApiKey.mockResolvedValue({
      user,
      apiKey: { id: 'key-1', name: 'My Key', keyPrefix: 'ikn_live_abc' },
    });

    const context = createMockContext({ authorization: 'Bearer ikn_live_abcdef123456789' });
    const result = await guard.canActivate(context as any);

    expect(result).toBe(true);
    expect(context.req.user).toEqual(user);
    expect(context.req.apiKey).toEqual({ id: 'key-1', name: 'My Key', keyPrefix: 'ikn_live_abc' });
    expect(mockApiKeyService.validateApiKey).toHaveBeenCalledWith('ikn_live_abcdef123456789');
  });

  it('rejects app JWT token by default on MCP endpoint per RFC 8707 / PAT requirement', async () => {
    const context = createMockContext({ authorization: 'Bearer eyJhbGciOi...' });

    await expect(guard.canActivate(context as any)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(context.res.setHeader).toHaveBeenCalledWith(
      'WWW-Authenticate',
      expect.stringContaining('resource_metadata="https://api.ikeen.app/.well-known/oauth-protected-resource/mcp"'),
    );
    expect(context.res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store');
  });

  it('allows JWT token when MCP_ALLOW_APP_JWT is explicitly enabled in env', async () => {
    mockEnv.MCP_ALLOW_APP_JWT = true;
    const user = { id: 'user-jwt', email: 'jwt@ikeen.app', username: 'jwtuser', status: 'active' };
    mockJwtService.verifyAsync.mockResolvedValue({ sub: 'user-jwt' });
    mockPrisma.user.findUnique.mockResolvedValue(user);

    const context = createMockContext({ authorization: 'Bearer eyJhbGciOi...' });
    const result = await guard.canActivate(context as any);

    expect(result).toBe(true);
    expect(context.req.user).toEqual(user);
    expect(mockJwtService.verifyAsync).toHaveBeenCalledWith('eyJhbGciOi...');
  });

  it('throws UnauthorizedException and sets WWW-Authenticate header when no credentials are provided', async () => {
    const context = createMockContext({});
    await expect(guard.canActivate(context as any)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(context.res.setHeader).toHaveBeenCalledWith(
      'WWW-Authenticate',
      expect.stringContaining('resource_metadata="https://api.ikeen.app/.well-known/oauth-protected-resource/mcp"'),
    );
    expect(context.res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store');
  });

  it('sets WWW-Authenticate header when API key validation fails', async () => {
    mockApiKeyService.validateApiKey.mockRejectedValue(new UnauthorizedException('API key is invalid or revoked'));

    const context = createMockContext({ authorization: 'Bearer ikn_live_invalid' });
    await expect(guard.canActivate(context as any)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(context.res.setHeader).toHaveBeenCalledWith(
      'WWW-Authenticate',
      expect.stringContaining('resource_metadata='),
    );
  });
});
