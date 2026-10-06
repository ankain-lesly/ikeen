import { tool } from 'ai';
import { z } from 'zod';
import { FoldersToolService } from '../../folders/folders-tool.service.js';
import type { PrismaService } from '../../../prisma/prisma.service.js';
import type { AuditService } from '../../audit/audit.service.js';
import type { AblyService } from '../../ably/ably.service.js';
import {
  createFolderDef,
  listFoldersDef,
  organizeNoteDef,
  updateFolderDef,
} from '../../folders/folders.tool-definitions.js';

const baseContextSchema = z.object({
  userId: z.string(),
  conversationId: z.string(),
});

export function createFolderTools(params: {
  foldersToolService?: FoldersToolService;
  prisma?: PrismaService;
  audit?: AuditService;
  ably?: AblyService;
}) {
  const foldersToolService =
    params.foldersToolService ??
    new FoldersToolService(
      params.prisma!,
      params.audit!,
      params.ably ??
        ({
          publishInvalidation: async () => {},
        } as unknown as AblyService),
    );

  const listFolders = tool({
    description: listFoldersDef.description,
    contextSchema: baseContextSchema,
    inputSchema: listFoldersDef.inputSchema,
    execute: async (args, { context }) => {
      return foldersToolService.listFolders(context.userId, args);
    },
  });

  const createFolder = tool({
    description: createFolderDef.description,
    contextSchema: baseContextSchema,
    inputSchema: createFolderDef.inputSchema,
    execute: async (args, { context }) => {
      return foldersToolService.createFolder(context.userId, args, {
        conversationId: context.conversationId,
        source: 'agent',
      });
    },
  });

  const updateFolder = tool({
    description: updateFolderDef.description,
    contextSchema: baseContextSchema,
    inputSchema: updateFolderDef.inputSchema,
    execute: async (args, { context }) => {
      return foldersToolService.updateFolder(context.userId, args, {
        conversationId: context.conversationId,
        source: 'agent',
      });
    },
  });

  const organizeNote = tool({
    description: organizeNoteDef.description,
    contextSchema: baseContextSchema,
    inputSchema: organizeNoteDef.inputSchema,
    execute: async (args, { context }) => {
      return foldersToolService.organizeNote(context.userId, args, {
        conversationId: context.conversationId,
        source: 'agent',
      });
    },
  });

  return {
    listFolders,
    createFolder,
    updateFolder,
    organizeNote,
  };
}
