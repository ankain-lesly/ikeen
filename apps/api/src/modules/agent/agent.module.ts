import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { AblyModule } from '../ably/ably.module.js';
import { AgentController } from './agent.controller.js';
import { AgentService } from './agent.service.js';
import { AgentProviderService } from './agent-provider.service.js';
import { ChatPersistenceService } from './chat-persistence.service.js';
import { WebResearchService } from './web-research.service.js';

@Module({
  imports: [PrismaModule, AblyModule],
  controllers: [AgentController],
  providers: [
    AgentService,
    AgentProviderService,
    ChatPersistenceService,
    WebResearchService,
  ],
  exports: [AgentService, ChatPersistenceService],
})
export class AgentModule {}
