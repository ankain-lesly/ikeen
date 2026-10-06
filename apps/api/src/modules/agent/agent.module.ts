import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { AblyModule } from '../ably/ably.module.js';
import { AgentController } from './agent.controller.js';
import { AgentService } from './agent.service.js';
import { AgentProviderService } from './agent-provider.service.js';
import { ChatPersistenceService } from './chat-persistence.service.js';
import { ComposioService } from './composio.service.js';
import { WebResearchService } from './web-research.service.js';

import { NotesModule } from '../notes/notes.module.js';
import { FoldersModule } from '../folders/folders.module.js';

@Module({
  imports: [PrismaModule, AblyModule, NotesModule, FoldersModule],
  controllers: [AgentController],
  providers: [
    AgentService,
    AgentProviderService,
    ChatPersistenceService,
    ComposioService,
    WebResearchService,
  ],
  exports: [AgentService, ChatPersistenceService],
})
export class AgentModule {}
