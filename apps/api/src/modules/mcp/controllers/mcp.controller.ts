import {
  Controller,
  Delete,
  Get,
  Logger,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { McpAuthGuard, type AuthenticatedRequest } from '../guards/mcp-auth.guard.js';
import { NotesToolService } from '../../notes/notes-tool.service.js';
import { FoldersToolService } from '../../folders/folders-tool.service.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { EnvService } from '../../../config/env.service.js';
import { createIkeenMcpServer } from '../ikeen-mcp-server.js';

@Controller('mcp')
@UseGuards(McpAuthGuard)
export class McpController {
  private readonly logger = new Logger(McpController.name);

  constructor(
    private readonly notesToolService: NotesToolService,
    private readonly foldersToolService: FoldersToolService,
    private readonly prisma: PrismaService,
    private readonly env: EnvService,
  ) {}

  @Post()
  async handleMcp(
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
  ): Promise<void> {
    const server = createIkeenMcpServer({
      notesToolService: this.notesToolService,
      foldersToolService: this.foldersToolService,
      prisma: this.prisma,
      userId: req.user.id,
      clientId: req.mcpClient,
    });

    // Stateless mode with single-JSON response for serverless deployments
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
      allowedOrigins: this.env.mcpAllowedOrigins,
    });

    // Cleanup resources and close handles when connection finishes or is aborted
    const cleanup = () => {
      void transport.close().catch(() => {});
      void server.close().catch(() => {});
    };
    res.on('close', cleanup);

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (err) {
      this.logger.error(
        'MCP transport handling error:',
        err instanceof Error ? err.stack : err,
      );
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          id: null,
          error: {
            code: -32603,
            message: 'Internal server error in MCP transport handler',
          },
        });
      }
    }
  }

  @Get()
  @Delete()
  handleMethodNotAllowed(@Res() res: Response): void {
    res.setHeader('Allow', 'POST');
    res.status(405).json({
      jsonrpc: '2.0',
      id: null,
      error: {
        code: -32000,
        message: 'Method not allowed. Streamable HTTP MCP endpoint only accepts POST.',
      },
    });
  }
}
