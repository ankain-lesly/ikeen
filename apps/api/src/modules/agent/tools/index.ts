import type { PrismaService } from '../../../prisma/prisma.service.js';
import type { AblyService } from '../../ably/ably.service.js';
import type { AuditService } from '../../audit/audit.service.js';
import type { WebResearchClient } from '../web-research.js';
import type { NotesToolService } from '../../notes/notes-tool.service.js';
import type { FoldersToolService } from '../../folders/folders-tool.service.js';
import { createFolderTools } from './folders.tools.js';
import { createMemoryTools } from './memory.tools.js';
import { createNotesTools } from './notes.tools.js';
import { createSummaryTools } from './summary.tools.js';
import { createWebTools } from './web.tools.js';

export function createIkeenTools({
  prisma,
  audit,
  webResearch,
  notesToolService,
  foldersToolService,
}: {
  prisma: PrismaService;
  ably?: AblyService;
  audit: AuditService;
  webResearch?: WebResearchClient;
  notesToolService: NotesToolService;
  foldersToolService: FoldersToolService;
}) {
  const notesTools = createNotesTools({ notesToolService });
  const folderTools = createFolderTools({ foldersToolService });
  const memoryTools = createMemoryTools({ prisma, audit });
  const summaryTools = createSummaryTools({ prisma });
  const webTools =
    webResearch?.isEnabled() === true
      ? createWebTools({ webResearch })
      : {};

  return {
    ...notesTools,
    ...folderTools,
    ...memoryTools,
    ...summaryTools,
    ...webTools,
  };
}

export type IkeenTools = ReturnType<typeof createIkeenTools>;
