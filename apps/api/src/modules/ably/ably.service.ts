import { Injectable, Logger } from '@nestjs/common';
import * as Ably from 'ably';

@Injectable()
export class AblyService {
  private readonly logger = new Logger(AblyService.name);
  private ablyRest: Ably.Rest | null = null;

  constructor() {
    const ablyApiKey = process.env.ABLY_API_KEY;
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

      return {
        enabled: true,
        tokenRequest,
      };
    } catch (err: any) {
      this.logger.error(`Failed to create Ably token request: ${err.message}`);
      return {
        enabled: false,
        error: err.message,
      };
    }
  }

  /**
   * Broadcasts a sync invalidation ping over Ably to alert all active client devices for this user.
   */
  async publishInvalidation(userId: string, entities: string[]): Promise<void> {
    if (!this.ablyRest) return;

    try {
      const channel = this.ablyRest.channels.get(`user:${userId}`);
      await channel.publish('sync:invalidate', {
        timestamp: new Date().toISOString(),
        entities,
      });
      this.logger.debug(`Published sync invalidation for user ${userId}: ${entities.join(', ')}`);
    } catch (err: any) {
      this.logger.warn(`Failed to publish Ably sync invalidation: ${err.message}`);
    }
  }
}
