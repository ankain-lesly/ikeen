import { Module } from '@nestjs/common';
import { NotesService } from './notes.service.js';
import { NotesController } from './notes.controller.js';
import { NotesToolService } from './notes-tool.service.js';

@Module({
  controllers: [NotesController],
  providers: [NotesService, NotesToolService],
  exports: [NotesService, NotesToolService],
})
export class NotesModule {}
