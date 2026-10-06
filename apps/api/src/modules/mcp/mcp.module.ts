import { Module } from '@nestjs/common';
import {
  MCP_STRATEGY,
  McpStrategy,
  StreamableHttpTransport,
} from '@rekog/mcp-nest';
import { NotesModule } from '../notes/notes.module.js';
import { FoldersModule } from '../folders/folders.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { NotesMcpController } from './controllers/notes-mcp.controller.js';
import { FoldersMcpController } from './controllers/folders-mcp.controller.js';
import { NotesMcpResource } from './resources/notes-mcp.resource.js';
import { NotesMcpPrompt } from './prompts/notes-mcp.prompt.js';
import { McpInfoController } from './controllers/mcp-info.controller.js';
import { McpWellKnownController } from './controllers/mcp-well-known.controller.js';
import { McpAuthGuard } from './guards/mcp-auth.guard.js';

export const mcpStrategy = new McpStrategy({
  name: 'ikeen-mcp-server',
  version: '1.0.0',
  description: 'Production MCP server for iKeen personal knowledge workspace',
  transports: [
    new StreamableHttpTransport({
      endpoint: '/mcp',
      statefulMode: false, // Stateless mode for serverless deployment on Vercel
      responseMode: 'json',
    }),
  ],
});

@Module({
  imports: [NotesModule, FoldersModule, AuthModule, PrismaModule],
  controllers: [
    McpWellKnownController,
    McpInfoController,
    NotesMcpController,
    FoldersMcpController,
    NotesMcpResource,
    NotesMcpPrompt,
  ],
  providers: [
    McpAuthGuard,
    {
      provide: MCP_STRATEGY,
      useValue: mcpStrategy,
    },
  ],
  exports: [MCP_STRATEGY, McpAuthGuard],
})
export class McpModule {}
