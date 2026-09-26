import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AblyModule } from '../ably/ably.module';
import { AgentController } from './agent.controller';
import { AgentService } from './agent.service';
import { AgentProviderService } from './agent-provider.service';
import { ChatPersistenceService } from './chat-persistence.service';

@Module({
  imports: [PrismaModule, AblyModule],
  controllers: [AgentController],
  providers: [AgentService, AgentProviderService, ChatPersistenceService],
  exports: [AgentService, ChatPersistenceService],
})
export class AgentModule {}
