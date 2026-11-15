import type { PrismaService } from '../../../prisma/prisma.service.js';
import type { AuditService } from '../../audit/audit.service.js';
import type { WebResearchClient } from '../web-research.js';
import type { NotesToolService } from '../../notes/notes-tool.service.js';
import type { FoldersToolService } from '../../folders/folders-tool.service.js';
import type { RemindersToolService } from '../../reminders/reminders-tool.service.js';
import type { MediaService } from '../../media/media.service.js';
import { createFolderTools } from './folders.tools.js';
import { createMemoryTools } from './memory.tools.js';
import { createNotesTools } from './notes.tools.js';
import { createReminderTools } from './reminders.tools.js';
import { createSummaryTools } from './summary.tools.js';
import { createWebTools } from './web.tools.js';
import { createImageTools } from './image.tools.js';

export function createIkeenTools({
  prisma,
  audit,
  webResearch,
  notesToolService,
  foldersToolService,
  remindersToolService,
  mediaService,
}: {
  prisma: PrismaService;
  audit: AuditService;
  webResearch?: WebResearchClient;
  notesToolService: NotesToolService;
  foldersToolService: FoldersToolService;
  remindersToolService?: RemindersToolService;
  mediaService?: MediaService;
}) {
  const notesTools = createNotesTools({ notesToolService });
  const folderTools = createFolderTools({ foldersToolService });
  const reminderTools = createReminderTools({ remindersToolService, prisma, audit });
  const memoryTools = createMemoryTools({ prisma, audit });
  const summaryTools = createSummaryTools({ prisma });
  const webTools =
    webResearch?.isEnabled() === true
      ? createWebTools({ webResearch })
      : {};
  const imageTools = mediaService
    ? createImageTools({ mediaService })
    : {};

  return {
    ...notesTools,
    ...folderTools,
    ...reminderTools,
    ...memoryTools,
    ...summaryTools,
    ...webTools,
    ...imageTools,
  };
}

export type IkeenTools = ReturnType<typeof createIkeenTools>;
