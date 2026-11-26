import { Module } from '@nestjs/common';
import {
  NoteSharesController,
  PublicSharesController,
} from './shares.controller.js';
import { SharesService } from './shares.service.js';
import { PublicShareRateLimitGuard } from './public-share-rate-limit.guard.js';

@Module({
  controllers: [NoteSharesController, PublicSharesController],
  providers: [SharesService, PublicShareRateLimitGuard],
  exports: [SharesService],
})
export class SharesModule {}
