import { Module } from '@nestjs/common';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { FoldersModule } from '../folders/folders.module';
import { NotesModule } from '../notes/notes.module';

@Module({
  imports: [PrismaModule, FoldersModule, NotesModule],
  controllers: [SyncController],
  providers: [SyncService],
  exports: [SyncService],
})
export class SyncModule {}
