import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PushNotificationService } from './push-notification.service.js';
import {
  DeregisterPushTokenDto,
  RegisterPushTokenDto,
} from './dto/register-push-token.dto.js';
import { SendTestNotificationDto } from './dto/send-test-notification.dto.js';

interface AuthenticatedRequest {
  user: {
    id: string;
    email: string;
  };
}

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly pushService: PushNotificationService) {}

  @Post('push-token')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async registerPushToken(
    @Req() req: AuthenticatedRequest,
    @Body() dto: RegisterPushTokenDto,
  ) {
    return this.pushService.registerPushToken(req.user.id, dto);
  }

  @Delete('push-token')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async deregisterPushToken(
    @Req() req: AuthenticatedRequest,
    @Body() dto: DeregisterPushTokenDto,
  ) {
    return this.pushService.deregisterPushToken(req.user.id, dto.token);
  }

  /**
   * Dispatches a test push notification to a user using their userId (or the authenticated user).
   * Persists the notification record and delivers push payload to all registered user tokens.
   */
  @Post('test')
  // @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async sendTestNotification(
    @Req() req: AuthenticatedRequest,
    @Body() dto: SendTestNotificationDto,
  ) {
    const targetUserId = dto.userId;

    if(!targetUserId) throw new Error("User id test not found")
      
    const title = dto.title || 'Test Push Notification';
    const body = dto.body || 'This is a test notification from the iKeen server!';

    const result = await this.pushService.sendPushNotification({
      userId: targetUserId,
      title,
      body,
      channelId: 'reminders',
      data: {
        isTest: true,
        sentAt: new Date().toISOString(),
        ...dto.data,
      },
    });

    return {
      ok: result.ok,
      message: `Test notification sent to user ${targetUserId}`,
      targetUserId,
      notificationId: result.notificationId,
      tokensCount: result.tokensCount,
      ticketsCount: result.ticketsCount,
    };
  }
}
