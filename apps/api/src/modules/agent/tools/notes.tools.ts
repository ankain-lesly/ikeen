import { tool } from 'ai';
import { z } from 'zod';
import { NotesToolService } from '../../notes/notes-tool.service.js';
import type { PrismaService } from '../../../prisma/prisma.service.js';
import type { AuditService } from '../../audit/audit.service.js';
import type { AblyService } from '../../ably/ably.service.js';
import {
  addBlockDef,
  archiveNoteDef,
  attachImageDef,
  createNoteDef,
  deleteBlockDef,
  getNoteDetailsDef,
  listRecentNotesDef,
  pinNoteDef,
  searchNotesDef,
  updateBlockDef,
  updateNoteDef,
} from '../../notes/notes.tool-definitions.js';

const baseContextSchema = z.object({
  userId: z.string(),
  conversationId: z.string(),
});

export function createNotesTools(params: {
  notesToolService?: NotesToolService;
  prisma?: PrismaService;
  audit?: AuditService;
  ably?: AblyService;
}) {
  const notesToolService =
    params.notesToolService ??
    new NotesToolService(
      params.prisma!,
      params.audit!,
      params.ably ??
        ({
          publishInvalidation: async () => {},
        } as unknown as AblyService),
    );

  const searchNotes = tool({
    description: searchNotesDef.description,
    contextSchema: baseContextSchema,
    inputSchema: searchNotesDef.inputSchema,
    execute: async (args, { context }) => {
      return notesToolService.searchNotes(context.userId, args);
    },
  });

  const getNoteDetails = tool({
    description: getNoteDetailsDef.description,
    contextSchema: baseContextSchema,
    inputSchema: getNoteDetailsDef.inputSchema,
    execute: async (args, { context }) => {
      return notesToolService.getNoteDetails(context.userId, args);
    },
  });

  const listRecentNotes = tool({
    description: listRecentNotesDef.description,
    contextSchema: baseContextSchema,
    inputSchema: listRecentNotesDef.inputSchema,
    execute: async (args, { context }) => {
      return notesToolService.listRecentNotes(context.userId, args);
    },
  });

  const createNote = tool({
    description: createNoteDef.description,
    contextSchema: baseContextSchema,
    inputSchema: createNoteDef.inputSchema,
    execute: async (args, { context }) => {
      return notesToolService.createNote(context.userId, args, {
        conversationId: context.conversationId,
        source: 'agent',
      });
    },
  });

  const addBlock = tool({
    description: addBlockDef.description,
    contextSchema: baseContextSchema,
    inputSchema: addBlockDef.inputSchema,
    execute: async (args, { context }) => {
      return notesToolService.addBlock(context.userId, args, {
        conversationId: context.conversationId,
        source: 'agent',
      });
    },
  });

  const updateBlock = tool({
    description: updateBlockDef.description,
    contextSchema: baseContextSchema,
    inputSchema: updateBlockDef.inputSchema,
    execute: async (args, { context }) => {
      return notesToolService.updateBlock(context.userId, args, {
        conversationId: context.conversationId,
        source: 'agent',
      });
    },
  });

  const deleteBlock = tool({
    description: deleteBlockDef.description,
    contextSchema: baseContextSchema,
    inputSchema: deleteBlockDef.inputSchema,
    execute: async (args, { context }) => {
      return notesToolService.deleteBlock(context.userId, args, {
        conversationId: context.conversationId,
        source: 'agent',
      });
    },
  });

  const attachImage = tool({
    description: attachImageDef.description,
    contextSchema: baseContextSchema,
    inputSchema: attachImageDef.inputSchema,
    execute: async (args, { context }) => {
      return notesToolService.attachImage(context.userId, args, {
        conversationId: context.conversationId,
        source: 'agent',
      });
    },
  });

  const updateNote = tool({
    description: updateNoteDef.description,
    contextSchema: baseContextSchema,
    inputSchema: updateNoteDef.inputSchema,
    execute: async (args, { context }) => {
      return notesToolService.updateNote(context.userId, args, {
        conversationId: context.conversationId,
        source: 'agent',
      });
    },
  });

  const pinNote = tool({
    description: pinNoteDef.description,
    contextSchema: baseContextSchema,
    inputSchema: pinNoteDef.inputSchema,
    execute: async (args, { context }) => {
      return notesToolService.pinNote(context.userId, args, {
        conversationId: context.conversationId,
        source: 'agent',
      });
    },
  });

  const archiveNote = tool({
    description: archiveNoteDef.description,
    contextSchema: baseContextSchema,
    inputSchema: archiveNoteDef.inputSchema,
    execute: async (args, { context }) => {
      return notesToolService.archiveNote(context.userId, args, {
        conversationId: context.conversationId,
        source: 'agent',
      });
    },
  });

  return {
    searchNotes,
    getNoteDetails,
    listRecentNotes,
    createNote,
    addBlock,
    updateBlock,
    deleteBlock,
    attachImage,
    updateNote,
    pinNote,
    archiveNote,
  };
}
