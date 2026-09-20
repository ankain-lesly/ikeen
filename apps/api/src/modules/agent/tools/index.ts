import type { PrismaService } from '../../../prisma/prisma.service';
import type { AblyService } from '../../ably/ably.service';
import { createFolderTools } from './folders.tools';
import { createMemoryTools } from './memory.tools';
import { createNotesTools } from './notes.tools';
import { createSummaryTools } from './summary.tools';

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
