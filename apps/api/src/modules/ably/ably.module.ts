import { Module, Global } from '@nestjs/common';
import { AblyService } from './ably.service.js';
import { RealtimeController } from './realtime.controller.js';

@Global()
@Module({
  controllers: [RealtimeController],
  providers: [AblyService],
  exports: [AblyService],
})
export class AblyModule {}
