import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import {
  Expo,
  type ExpoPushMessage,
  type ExpoPushTicket,
} from 'expo-server-sdk';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { Prisma, UserType } from '../../generated/prisma/client.js';
import type { RegisterPushTokenDto } from './dto/register-push-token.dto.js';

export interface SendPushNotificationProps {
  userId: string;
  title: string;
  body: string;
  data?: Prisma.InputJsonObject;
  sound?:
    | string
    | null
    | { critical?: boolean; name?: string | null; volume?: number };
  priority?: 'default' | 'normal' | 'high';
  channelId?: string;
  userType?: UserType;
  notificationType?: 'general';
  saveToDatabase?: boolean; // defaults to true
}

export interface SendPushNotificationResult {
  ok: boolean;
  notificationId?: string;
  tokensCount: number;
  ticketsCount: number;
  error?: string;
}

export interface AgentEntityNotificationOptions {
  entity: 'note' | 'folder' | 'reminder';
  entityId: string;
  title: string;
  body: string;
  source: 'agent' | 'mcp';
  data?: Prisma.InputJsonObject;
}

@Injectable()
export class PushNotificationService {
  private readonly logger = new Logger(PushNotificationService.name);
  private readonly expo: Expo;

  constructor(private readonly prisma: PrismaService) {
    const accessToken = process.env.EXPO_ACCESS_TOKEN;
    this.expo = new Expo(accessToken ? { accessToken } : undefined);
  }

  /**
   * Registers or refreshes a push notification token for a user and device.
   * Multiple tokens per device/user are supported: token is uniquely keyed.
   */
  async registerPushToken(userId: string, dto: RegisterPushTokenDto) {
    if (!Expo.isExpoPushToken(dto.token)) {
      throw new BadRequestException(`Invalid Expo push token: ${dto.token}`);
    }

    const platform = dto.platform;
    const now = new Date();

    const pushToken = await this.prisma.pushToken.upsert({
      where: { token: dto.token },
      update: {
        userId,
        platform,
        deviceId: dto.deviceId,
        deviceName: dto.deviceName,
        osVersion: dto.osVersion,
        appVersion: dto.appVersion,
        manufacturer: dto.manufacturer,
        model: dto.model,
        updatedAt: now,
      },
      create: {
        userId,
        token: dto.token,
        platform,
        deviceId: dto.deviceId,
        deviceName: dto.deviceName,
        osVersion: dto.osVersion,
        appVersion: dto.appVersion,
        manufacturer: dto.manufacturer,
        model: dto.model,
        createdAt: now,
        updatedAt: now,
      },
    });

    this.logger.log(
      `Registered push token for user ${userId} on device ${dto.deviceId || 'unknown'}`,
    );
    return { ok: true, id: pushToken.id };
  }

  /**
   * Removes a push token (e.g., on logout or when notifications are disabled).
   */
  async deregisterPushToken(userId: string, token: string) {
    await this.prisma.pushToken.deleteMany({
      where: { userId, token },
    });
    this.logger.log(`Deregistered push token for user ${userId}`);
    return { ok: true };
  }

  /**
   * Core method to send a push notification: persists the notification record to the database
   * and delivers the push payload to all registered user devices via Expo Server SDK.
   */
  async sendPushNotification(
    props: SendPushNotificationProps,
  ): Promise<SendPushNotificationResult> {
    try {
      let notificationId: string | undefined;

      if (props.saveToDatabase !== false) {
        try {
          const saved = await this.prisma.notification.create({
            data: {
              userId: props.userId,
              userType: props.userType ?? 'user',
              title: props.title,
              message: props.body,
              type: props.notificationType ?? 'general',
              channel: 'push',
              priority: props.priority ?? 'default',
              sentAt: new Date(),
              data: props.data ?? undefined,
            },
          });
          notificationId = saved.id;
        } catch (dbErr) {
          this.logger.warn(
            `Failed to persist in-app notification for user ${props.userId}:`,
            dbErr,
          );
        }
      }

      // 2. Fetch all push tokens associated with the user
      const userTokens = await this.prisma.pushToken.findMany({
        where: { userId: props.userId },
        select: { token: true, deviceId: true },
      });

      if (!userTokens || userTokens.length === 0) {
        this.logger.debug(
          `No push tokens found for user ${props.userId}. Skipped push dispatch.`,
        );
        return {
          ok: true,
          notificationId,
          tokensCount: 0,
          ticketsCount: 0,
        };
      }

      // 3. Filter valid Expo push tokens
      const validTokens: string[] = [];
      for (const entry of userTokens) {
        if (Expo.isExpoPushToken(entry.token)) {
          validTokens.push(entry.token);
        } else {
          this.logger.warn(
            `Skipping invalid Expo push token ${entry.token} for user ${props.userId}`,
          );
        }
      }

      if (validTokens.length === 0) {
        return {
          ok: true,
          notificationId,
          tokensCount: 0,
          ticketsCount: 0,
        };
      }

      // 4. Construct messages
      const messages: ExpoPushMessage[] = validTokens.map((token) => ({
        to: token,
        sound: (props.sound ?? 'notification.wav'),
        title: props.title,
        body: props.body,
        priority: props.priority ?? 'default',
        channelId: props.channelId ?? 'reminders',
        data: props.data,
      }));

      // 5. Chunk messages per Expo guidelines
      const chunks = this.expo.chunkPushNotifications(messages);
      let ticketsCount = 0;

      // 6. Send push chunks and process tickets for dead token cleanup
      for (const chunk of chunks) {
        try {
          const ticketChunk: ExpoPushTicket[] =
            await this.expo.sendPushNotificationsAsync(chunk);
          ticketsCount += ticketChunk.length;

          for (let i = 0; i < ticketChunk.length; i++) {
            const ticket = ticketChunk[i];
            if (ticket && ticket.status === 'error') {
              const deadToken = chunk[i]?.to;
              const errorCode = ticket.details?.error;

              if (errorCode === 'DeviceNotRegistered') {
                if (typeof deadToken === 'string') {
                  this.logger.warn(
                    `Token no longer registered on Expo: ${deadToken}. Pruning from database.`,
                  );
                  await this.prisma.pushToken
                    .deleteMany({ where: { token: deadToken } })
                    .catch(() => null);
                }
              } else {
                this.logger.warn(
                  `Expo push ticket error for token ${deadToken}: ${ticket.message} (${errorCode})`,
                );
              }
            }
          }
        } catch (sendErr) {
          this.logger.error(
            `Error sending push notification chunk via Expo:`,
            sendErr,
          );
        }
      }

      this.logger.log(
        `Dispatched push notification to ${validTokens.length} token(s) for user ${props.userId}`,
      );

      return {
        ok: true,
        notificationId,
        tokensCount: validTokens.length,
        ticketsCount,
      };
    } catch (err: unknown) {
      this.logger.error(
        `Failed to send push notification for user ${props.userId}:`,
        err,
      );
      return {
        ok: false,
        tokensCount: 0,
        ticketsCount: 0,
        error:
          err instanceof Error
            ? err.message
            : typeof err === 'string'
              ? err
              : 'Unknown push notification failure',
      };
    }
  }

  /**
   * Dispatches push notification when an Agent or MCP creates a Note, Folder, or Reminder.
   */
  async sendAgentEntityCreatedPush(
    userId: string,
    options: AgentEntityNotificationOptions,
  ): Promise<void> {
    try {
      await this.sendPushNotification({
        userId,
        title: options.title,
        body: options.body,
        channelId: 'reminders',
        data: {
          entity: options.entity,
          entityId: options.entityId,
          source: options.source,
          ...options.data,
        },
      });
    } catch (err) {
      // Push notifications are best-effort; don't break the agent/tool operation
      this.logger.error(
        `Failed to send agent creation push notification for user ${userId}:`,
        err,
      );
    }
  }
}
