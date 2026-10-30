import { Module } from '@nestjs/common';
import { EnvModule } from '../../config/env.module.js';
import { MediaService } from './media.service.js';
import { MediaController } from './media.controller.js';

@Module({
  imports: [EnvModule],
  controllers: [MediaController],
  providers: [MediaService],
  exports: [MediaService],
})
export class MediaModule {}
