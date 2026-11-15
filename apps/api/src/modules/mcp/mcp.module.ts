import { Module } from '@nestjs/common';
import { NotesModule } from '../notes/notes.module.js';
import { FoldersModule } from '../folders/folders.module.js';
import { RemindersModule } from '../reminders/reminders.module.js';
import { MediaModule } from '../media/media.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { AblyModule } from '../ably/ably.module.js';
import { McpController } from './controllers/mcp.controller.js';
import { McpInfoController } from './controllers/mcp-info.controller.js';
import { McpWellKnownController } from './controllers/mcp-well-known.controller.js';
import { McpAuthGuard } from './guards/mcp-auth.guard.js';

@Module({
  imports: [NotesModule, FoldersModule, RemindersModule, MediaModule, AuthModule, PrismaModule, AblyModule],
  controllers: [
    McpWellKnownController,
    McpInfoController,
    McpController,
  ],
  providers: [McpAuthGuard],
  exports: [McpAuthGuard],
})
export class McpModule {}
