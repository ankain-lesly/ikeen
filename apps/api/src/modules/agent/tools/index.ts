import type { PrismaService } from '../../../prisma/prisma.service.js';
import type { AblyService } from '../../ably/ably.service.js';
import type { AuditService } from '../../audit/audit.service.js';
import { createFolderTools } from './folders.tools.js';
import { createMemoryTools } from './memory.tools.js';
import { createNotesTools } from './notes.tools.js';
import { createSummaryTools } from './summary.tools.js';

export function createIkeenTools({
  prisma,
  ably,
  audit,
}: {
  prisma: PrismaService;
  ably: AblyService;
  audit: AuditService;
}) {
  const notesTools = createNotesTools({ prisma, ably, audit });
  const folderTools = createFolderTools({ prisma, ably, audit });
  const memoryTools = createMemoryTools({ prisma, audit });
  const summaryTools = createSummaryTools({ prisma });

  return {
    ...notesTools,
    ...folderTools,
    ...memoryTools,
    ...summaryTools,
  };
}

export type IkeenTools = ReturnType<typeof createIkeenTools>;
