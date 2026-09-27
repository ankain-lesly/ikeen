import { Module } from '@nestjs/common';
import { SyncController } from './sync.controller.js';
import { SyncService } from './sync.service.js';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { FoldersModule } from '../folders/folders.module.js';
import { NotesModule } from '../notes/notes.module.js';

@Module({
  imports: [PrismaModule, FoldersModule, NotesModule],
  controllers: [SyncController],
  providers: [SyncService],
  exports: [SyncService],
})
export class SyncModule {}
