import { describe, expect, it, vi, beforeEach } from 'vitest';
import { McpController } from './mcp.controller.js';

describe('McpController', () => {
  let controller: McpController;
  let mockNotesToolService: any;
  let mockFoldersToolService: any;
  let mockPrisma: any;
  let mockEnv: any;

  beforeEach(() => {
    mockNotesToolService = {};
    mockFoldersToolService = {};
    mockPrisma = {};
    mockEnv = {
      mcpAllowedOrigins: ['https://ikeen.app'],
    };

    controller = new McpController(
      mockNotesToolService,
      mockFoldersToolService,
      mockPrisma,
      mockEnv,
    );
  });

  describe('handleMethodNotAllowed', () => {
    it('returns 405 Method Not Allowed with Allow header and JSON-RPC error format', () => {
      const res: any = {
        setHeader: vi.fn(),
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };

      controller.handleMethodNotAllowed(res);

      expect(res.setHeader).toHaveBeenCalledWith('Allow', 'POST');
      expect(res.status).toHaveBeenCalledWith(405);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          jsonrpc: '2.0',
          error: expect.objectContaining({
            code: -32000,
            message: expect.stringContaining('only accepts POST'),
          }),
        }),
      );
    });
  });

  describe('handleMcp', () => {
    it('registers on close listener for resource cleanup', async () => {
      const closeListeners: Array<() => void> = [];
      const req: any = {
        user: { id: 'user-test' },
        mcpClient: 'test-client',
        body: {
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/list',
          params: {},
        },
      };
      const res: any = {
        on: vi.fn((event: string, cb: () => void) => {
          if (event === 'close') closeListeners.push(cb);
        }),
        writeHead: vi.fn().mockReturnThis(),
        write: vi.fn().mockReturnThis(),
        end: vi.fn().mockReturnThis(),
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
        headersSent: false,
      };

      // We test that handler sets up the close listener
      await controller.handleMcp(req, res);

      expect(res.on).toHaveBeenCalledWith('close', expect.any(Function));
      expect(closeListeners.length).toBeGreaterThan(0);
      // Trigger cleanup safely
      for (const listener of closeListeners) {
        expect(() => listener()).not.toThrow();
      }
    });
  });
});
