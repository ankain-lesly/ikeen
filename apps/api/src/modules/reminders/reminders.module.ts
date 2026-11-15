import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { RemindersToolService } from './reminders-tool.service.js';

@Module({
  imports: [PrismaModule, AuditModule],
  providers: [RemindersToolService],
  exports: [RemindersToolService],
})
export class RemindersModule {}
