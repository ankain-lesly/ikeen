import { UseGuards } from '@nestjs/common';
import { Payload } from '@nestjs/microservices';
import { McpController, McpRawRequest, Tool } from '@rekog/mcp-nest';
import type { z } from 'zod';
import { FoldersToolService } from '../../folders/folders-tool.service.js';
import {
  createFolderDef,
  listFoldersDef,
  organizeNoteDef,
  updateFolderDef,
} from '../../folders/folders.tool-definitions.js';
import { McpAuthGuard, type AuthenticatedRequest } from '../guards/mcp-auth.guard.js';

@McpController()
@UseGuards(McpAuthGuard)
export class FoldersMcpController {
  constructor(private readonly foldersToolService: FoldersToolService) {}

  @Tool({
    name: listFoldersDef.name,
    description: listFoldersDef.description,
    parameters: listFoldersDef.inputSchema,
  })
  async listFolders(
    @Payload() args: z.infer<typeof listFoldersDef.inputSchema>,
    @McpRawRequest() req: AuthenticatedRequest,
  ) {
    return this.foldersToolService.listFolders(req.user.id, args);
  }

  @Tool({
    name: createFolderDef.name,
    description: createFolderDef.description,
    parameters: createFolderDef.inputSchema,
  })
  async createFolder(
    @Payload() args: z.infer<typeof createFolderDef.inputSchema>,
    @McpRawRequest() req: AuthenticatedRequest,
  ) {
    return this.foldersToolService.createFolder(req.user.id, args, {
      source: 'mcp',
      clientId: req.mcpClient,
    });
  }

  @Tool({
    name: updateFolderDef.name,
    description: updateFolderDef.description,
    parameters: updateFolderDef.inputSchema,
  })
  async updateFolder(
    @Payload() args: z.infer<typeof updateFolderDef.inputSchema>,
    @McpRawRequest() req: AuthenticatedRequest,
  ) {
    return this.foldersToolService.updateFolder(req.user.id, args, {
      source: 'mcp',
      clientId: req.mcpClient,
    });
  }

  @Tool({
    name: organizeNoteDef.name,
    description: organizeNoteDef.description,
    parameters: organizeNoteDef.inputSchema,
  })
  async organizeNote(
    @Payload() args: z.infer<typeof organizeNoteDef.inputSchema>,
    @McpRawRequest() req: AuthenticatedRequest,
  ) {
    return this.foldersToolService.organizeNote(req.user.id, args, {
      source: 'mcp',
      clientId: req.mcpClient,
    });
  }
}
