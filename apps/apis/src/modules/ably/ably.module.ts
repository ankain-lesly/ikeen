import { Module, Global } from '@nestjs/common';
import { AblyService } from './ably.service';
import { RealtimeController } from './realtime.controller';

@Global()
@Module({
  controllers: [RealtimeController],
  providers: [AblyService],
  exports: [AblyService],
})
export class AblyModule {}
