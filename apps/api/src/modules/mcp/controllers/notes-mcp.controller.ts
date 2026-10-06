import { UseGuards } from '@nestjs/common';
import { Payload } from '@nestjs/microservices';
import { McpController, McpRawRequest, Tool } from '@rekog/mcp-nest';
import type { z } from 'zod';
import { NotesToolService } from '../../notes/notes-tool.service.js';
import {
  archiveNoteDef,
  createNoteDef,
  getNoteDetailsDef,
  listRecentNotesDef,
  pinNoteDef,
  searchNotesDef,
  updateNoteDef,
} from '../../notes/notes.tool-definitions.js';
import { McpAuthGuard, type AuthenticatedRequest } from '../guards/mcp-auth.guard.js';

@McpController()
@UseGuards(McpAuthGuard)
export class NotesMcpController {
  constructor(private readonly notesToolService: NotesToolService) {}

  @Tool({
    name: searchNotesDef.name,
    description: searchNotesDef.description,
    parameters: searchNotesDef.inputSchema,
  })
  async searchNotes(
    @Payload() args: z.infer<typeof searchNotesDef.inputSchema>,
    @McpRawRequest() req: AuthenticatedRequest,
  ) {
    return this.notesToolService.searchNotes(req.user.id, args);
  }

  @Tool({
    name: getNoteDetailsDef.name,
    description: getNoteDetailsDef.description,
    parameters: getNoteDetailsDef.inputSchema,
  })
  async getNoteDetails(
    @Payload() args: z.infer<typeof getNoteDetailsDef.inputSchema>,
    @McpRawRequest() req: AuthenticatedRequest,
  ) {
    return this.notesToolService.getNoteDetails(req.user.id, args);
  }

  @Tool({
    name: listRecentNotesDef.name,
    description: listRecentNotesDef.description,
    parameters: listRecentNotesDef.inputSchema,
  })
  async listRecentNotes(
    @Payload() args: z.infer<typeof listRecentNotesDef.inputSchema>,
    @McpRawRequest() req: AuthenticatedRequest,
  ) {
    return this.notesToolService.listRecentNotes(req.user.id, args);
  }

  @Tool({
    name: createNoteDef.name,
    description: createNoteDef.description,
    parameters: createNoteDef.inputSchema,
  })
  async createNote(
    @Payload() args: z.infer<typeof createNoteDef.inputSchema>,
    @McpRawRequest() req: AuthenticatedRequest,
  ) {
    return this.notesToolService.createNote(req.user.id, args, {
      source: 'mcp',
      clientId: req.mcpClient,
    });
  }

  @Tool({
    name: updateNoteDef.name,
    description: updateNoteDef.description,
    parameters: updateNoteDef.inputSchema,
  })
  async updateNote(
    @Payload() args: z.infer<typeof updateNoteDef.inputSchema>,
    @McpRawRequest() req: AuthenticatedRequest,
  ) {
    return this.notesToolService.updateNote(req.user.id, args, {
      source: 'mcp',
      clientId: req.mcpClient,
    });
  }

  @Tool({
    name: pinNoteDef.name,
    description: pinNoteDef.description,
    parameters: pinNoteDef.inputSchema,
  })
  async pinNote(
    @Payload() args: z.infer<typeof pinNoteDef.inputSchema>,
    @McpRawRequest() req: AuthenticatedRequest,
  ) {
    return this.notesToolService.pinNote(req.user.id, args, {
      source: 'mcp',
      clientId: req.mcpClient,
    });
  }

  @Tool({
    name: archiveNoteDef.name,
    description: archiveNoteDef.description,
    parameters: archiveNoteDef.inputSchema,
  })
  async archiveNote(
    @Payload() args: z.infer<typeof archiveNoteDef.inputSchema>,
    @McpRawRequest() req: AuthenticatedRequest,
  ) {
    return this.notesToolService.archiveNote(req.user.id, args, {
      source: 'mcp',
      clientId: req.mcpClient,
    });
  }
}
