import { tool } from 'ai';
import { NotesToolService } from '../../notes/notes-tool.service.js';
import type { PrismaService } from '../../../prisma/prisma.service.js';
import type { AuditService } from '../../audit/audit.service.js';
import { ikeenAgentCallOptionsSchema as contextSchema } from '../call-options.js';
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

const agentOpts = (conversationId: string) => ({ conversationId, source: 'agent' as const });

export function createNotesTools(params: {
  notesToolService?: NotesToolService;
  prisma?: PrismaService;
  audit?: AuditService;
}) {
  const svc = params.notesToolService ?? new NotesToolService(params.prisma!, params.audit!);

  return {
    searchNotes: tool({
      ...searchNotesDef,
      contextSchema,
      execute: (args, { context }) => svc.searchNotes(context.userId, args),
    }),
    getNoteDetails: tool({
      ...getNoteDetailsDef,
      contextSchema,
      execute: (args, { context }) => svc.getNoteDetails(context.userId, args),
    }),
    listRecentNotes: tool({
      ...listRecentNotesDef,
      contextSchema,
      execute: (args, { context }) => svc.listRecentNotes(context.userId, args),
    }),
    createNote: tool({
      ...createNoteDef,
      contextSchema,
      execute: (args, { context }) =>
        svc.createNote(context.userId, args, agentOpts(context.conversationId)),
    }),
    addBlock: tool({
      ...addBlockDef,
      contextSchema,
      execute: (args, { context }) =>
        svc.addBlock(context.userId, args, agentOpts(context.conversationId)),
    }),
    updateBlock: tool({
      ...updateBlockDef,
      contextSchema,
      execute: (args, { context }) =>
        svc.updateBlock(context.userId, args, agentOpts(context.conversationId)),
    }),
    deleteBlock: tool({
      ...deleteBlockDef,
      contextSchema,
      execute: (args, { context }) =>
        svc.deleteBlock(context.userId, args, agentOpts(context.conversationId)),
    }),
    attachImage: tool({
      ...attachImageDef,
      contextSchema,
      execute: (args, { context }) =>
        svc.attachImage(context.userId, args, agentOpts(context.conversationId)),
    }),
    updateNote: tool({
      ...updateNoteDef,
      contextSchema,
      execute: (args, { context }) =>
        svc.updateNote(context.userId, args, agentOpts(context.conversationId)),
    }),
    pinNote: tool({
      ...pinNoteDef,
      contextSchema,
      execute: (args, { context }) =>
        svc.pinNote(context.userId, args, agentOpts(context.conversationId)),
    }),
    archiveNote: tool({
      ...archiveNoteDef,
      contextSchema,
      execute: (args, { context }) =>
        svc.archiveNote(context.userId, args, agentOpts(context.conversationId)),
    }),
  };
}
