import { Global, Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller.js';
import { PushNotificationService } from './push-notification.service.js';

@Global()
@Module({
  controllers: [NotificationsController],
  providers: [PushNotificationService],
  exports: [PushNotificationService],
})
export class NotificationsModule {}
