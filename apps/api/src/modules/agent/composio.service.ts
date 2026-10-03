import { Injectable, Logger } from '@nestjs/common';
import { Composio } from '@composio/core';
import { VercelProvider } from '@composio/vercel';
import type { ToolSet } from 'ai';

export type ComposioSessionTools = {
  tools: ToolSet;
  sessionId: string | null;
};

@Injectable()
export class ComposioService {
  private readonly logger = new Logger(ComposioService.name);
  private readonly client = new Composio({ provider: new VercelProvider() });

  constructor() {
    this.logger.log('Composio sessions enabled');
  }

  async getSessionTools(
    userId: string,
    existingSessionId?: string | null,
  ): Promise<ComposioSessionTools> {
    try {
      const session = existingSessionId
        ? await this.resumeOrCreate(userId, existingSessionId)
        : await this.client.create(userId);
      const tools = await session.tools();

      return {
        tools,
        sessionId: session.sessionId,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      this.logger.warn(
        `Composio session unavailable for user=${userId}: ${message}`,
      );
      return { tools: {}, sessionId: existingSessionId ?? null };
    }
  }

  private async resumeOrCreate(userId: string, sessionId: string) {
    try {
      return await this.client.use(sessionId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      this.logger.warn(
        `Composio session resume failed for user=${userId}: ${message}`,
      );
      return this.client.create(userId);
    }
  }
}
