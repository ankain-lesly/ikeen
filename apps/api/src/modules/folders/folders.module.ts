import { Module } from '@nestjs/common';
import { FoldersService } from './folders.service.js';
import { FoldersController } from './folders.controller.js';
import { FoldersToolService } from './folders-tool.service.js';

@Module({
  controllers: [FoldersController],
  providers: [FoldersService, FoldersToolService],
  exports: [FoldersService, FoldersToolService],
})
export class FoldersModule {}
