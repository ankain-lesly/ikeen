import { describe, expect, it, vi } from 'vitest';
import { McpWellKnownController } from './mcp-well-known.controller.js';

describe('McpWellKnownController', () => {
  const mockEnv: any = {
    getMcpResourceUrl: vi.fn().mockReturnValue('https://api.ikeen.app/mcp'),
    getMcpDocsUrl: vi.fn().mockReturnValue('https://ikeen.app/docs/mcp'),
  };

  const controller = new McpWellKnownController(mockEnv);

  describe('getOAuthProtectedResource', () => {
    it('returns RFC 9728 protected resource metadata consuming URLs from EnvService', () => {
      const result = controller.getOAuthProtectedResource();

      expect(mockEnv.getMcpResourceUrl).toHaveBeenCalled();
      expect(mockEnv.getMcpDocsUrl).toHaveBeenCalled();

      expect(result).toEqual({
        resource: 'https://api.ikeen.app/mcp',
        authorization_servers: [],
        bearer_methods_supported: ['header'],
        scopes_supported: [
          'notes:read',
          'notes:write',
          'folders:read',
          'folders:write',
        ],
        resource_documentation: 'https://ikeen.app/docs/mcp',
      });
    });
  });

  describe('getOAuthProtectedResourceMcp', () => {
    it('returns identical RFC 9728 metadata for /oauth-protected-resource/mcp subpath', () => {
      const result = controller.getOAuthProtectedResourceMcp();

      expect(result.resource).toBe('https://api.ikeen.app/mcp');
      expect(result.resource_documentation).toBe('https://ikeen.app/docs/mcp');
      expect(result.scopes_supported).toEqual([
        'notes:read',
        'notes:write',
        'folders:read',
        'folders:write',
      ]);
    });
  });
});
