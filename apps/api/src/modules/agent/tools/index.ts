import type { PrismaService } from '../../../prisma/prisma.service.js';
import type { AblyService } from '../../ably/ably.service.js';
import { createFolderTools } from './folders.tools.js';
import { createMemoryTools } from './memory.tools.js';
import { createNotesTools } from './notes.tools.js';
import { createSummaryTools } from './summary.tools.js';

export function createIkeenTools({
  prisma,
  ably,
}: {
  prisma: PrismaService;
  ably: AblyService;
}) {
  const notesTools = createNotesTools({ prisma, ably });
  const folderTools = createFolderTools({ prisma, ably });
  const memoryTools = createMemoryTools({ prisma });
  const summaryTools = createSummaryTools({ prisma });

  return {
    ...notesTools,
    ...folderTools,
    ...memoryTools,
    ...summaryTools,
  };
}

export type IkeenTools = ReturnType<typeof createIkeenTools>;
