import { tool } from 'ai';
import { FoldersToolService } from '../../folders/folders-tool.service.js';
import type { PrismaService } from '../../../prisma/prisma.service.js';
import type { AuditService } from '../../audit/audit.service.js';
import { ikeenAgentCallOptionsSchema as contextSchema } from '../call-options.js';
import {
  createFolderDef,
  listFoldersDef,
  organizeNoteDef,
  updateFolderDef,
} from '../../folders/folders.tool-definitions.js';

const agentOpts = (conversationId: string) => ({ conversationId, source: 'agent' as const });

export function createFolderTools(params: {
  foldersToolService?: FoldersToolService;
  prisma?: PrismaService;
  audit?: AuditService;
}) {
  const svc = params.foldersToolService ?? new FoldersToolService(params.prisma!, params.audit!);

  return {
    listFolders: tool({
      ...listFoldersDef,
      contextSchema,
      execute: (args, { context }) => svc.listFolders(context.userId, args),
    }),
    createFolder: tool({
      ...createFolderDef,
      contextSchema,
      execute: (args, { context }) =>
        svc.createFolder(context.userId, args, agentOpts(context.conversationId)),
    }),
    updateFolder: tool({
      ...updateFolderDef,
      contextSchema,
      execute: (args, { context }) =>
        svc.updateFolder(context.userId, args, agentOpts(context.conversationId)),
    }),
    organizeNote: tool({
      ...organizeNoteDef,
      contextSchema,
      execute: (args, { context }) =>
        svc.organizeNote(context.userId, args, agentOpts(context.conversationId)),
    }),
  };
}
