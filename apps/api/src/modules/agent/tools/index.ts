import type { PrismaService } from '../../../prisma/prisma.service.js';
import type { AblyService } from '../../ably/ably.service.js';
import type { AuditService } from '../../audit/audit.service.js';
import type { WebResearchClient } from '../web-research.js';
import { createFolderTools } from './folders.tools.js';
import { createMemoryTools } from './memory.tools.js';
import { createNotesTools } from './notes.tools.js';
import { createSummaryTools } from './summary.tools.js';
import { createWebTools } from './web.tools.js';

export function createIkeenTools({
  prisma,
  ably,
  audit,
  webResearch,
}: {
  prisma: PrismaService;
  ably: AblyService;
  audit: AuditService;
  webResearch?: WebResearchClient;
}) {
  const notesTools = createNotesTools({ prisma, ably, audit });
  const folderTools = createFolderTools({ prisma, ably, audit });
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
