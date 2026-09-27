import { Injectable, Logger } from '@nestjs/common';
import * as Ably from 'ably';
import { EnvService } from '../../config/env.service.js';
@Injectable()
export class AblyService {
  private readonly logger = new Logger(AblyService.name);
  private ablyRest: Ably.Rest | null = null;

  constructor(private readonly env: EnvService) {
    const ablyApiKey = this.env.ABLY_API_KEY;
    if (ablyApiKey) {
      this.ablyRest = new Ably.Rest({ key: ablyApiKey });
      this.logger.log('Ably Realtime initialized successfully');
    } else {
      this.logger.warn(
        'ABLY_API_KEY is not configured. Real-time WebSocket invalidations will be skipped.',
      );
    }
  }

  /**
   * Returns whether Ably is enabled and configured.
   */
  isEnabled(): boolean {
    return !!this.ablyRest;
  }

  /**
   * Generates an Ably token request for client-side WebSocket authorization.
   */
  async createRealtimeAuth(userId: string) {
    if (!this.ablyRest) {
      this.logger.warn('Ably is not configured on this server.');
      return {
        enabled: false,
        message: 'Ably is not configured on this server.',
      };
    }

    try {
      const tokenRequest = await this.ablyRest.auth.createTokenRequest({
        clientId: userId,
        capability: {
          [`user:${userId}`]: ['subscribe'],
        },
      });

      this.logger.debug(`[Ably:Auth:TokenCreated] userId=${userId}`);

      return {
        enabled: true,
        tokenRequest: tokenRequest as unknown as Record<string, unknown>,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to create Ably token request for ${userId}: ${message}`, err);
      return {
        enabled: false,
        error: message,
      };
    }
  }

  /**
   * Publishes an arbitrary real-time event to a user's private channel.
   */
  async publishEvent(
    userId: string,
    eventName: string,
    payload: Record<string, unknown>,
  ): Promise<{ success: boolean; channel: string; event: string; error?: string }> {
    const channelName = `user:${userId}`;
    if (!this.ablyRest) {
      return {
        success: false,
        channel: channelName,
        event: eventName,
        error: 'Realtime provider is not configured on this server.',
      };
    }

    try {
      const channel = this.ablyRest.channels.get(channelName);
      await channel.publish(eventName, payload);
      this.logger.debug(
        `Published realtime event "${eventName}" on channel "${channelName}" for user "${userId}"`,
      );
      return {
        success: true,
        channel: channelName,
        event: eventName,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Failed to publish realtime event "${eventName}" for ${userId}: ${message}`);
      return {
        success: false,
        channel: channelName,
        event: eventName,
        error: message,
      };
    }
  }

  /**
   * Broadcasts a sync invalidation ping over Ably to alert all active client devices for this user.
   */
  async publishInvalidation(userId: string, entities: string[]): Promise<void> {
    await this.publishEvent(userId, 'sync:invalidate', {
      timestamp: new Date().toISOString(),
      entities,
    });
  }
}
