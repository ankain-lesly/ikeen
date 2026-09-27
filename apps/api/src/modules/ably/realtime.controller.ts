import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { AblyService } from './ably.service.js';

interface TriggerQuery {
  event?: string;
  entities?: string;
  message?: string;
}

interface TriggerBody {
  event?: string;
  entities?: string[];
  message?: string;
  data?: Record<string, unknown>;
}

@Controller('realtime')
export class RealtimeController {
  constructor(private readonly ablyService: AblyService) {}

  /**
   * Status check to see if real-time engine is active on the server.
   * GET /api/v1/realtime/status
   */
  @Get('status')
  getStatus() {
    return {
      enabled: this.ablyService.isEnabled(),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Triggers a real-time event via simple URL GET request.
   * No authentication required. Accepts userId as a URL parameter.
   *
   * Example:
   *   GET /api/v1/realtime/trigger/user_123
   *   GET /api/v1/realtime/trigger/user_123?entities=notes&event=sync:invalidate
   *   GET /api/v1/realtime/ping/user_123
   */
  @Get(['trigger/:userId', 'ping/:userId'])
  async triggerViaUrl(
    @Param('userId') userId: string,
    @Query() query: TriggerQuery,
  ) {
    const event = query.event || 'sync:invalidate';
    const rawEntities = query.entities
      ? query.entities.split(',').map((e) => e.trim()).filter(Boolean)
      : ['notes', 'folders'];

    const payload: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      entities: rawEntities,
      ...(query.message ? { message: query.message } : {}),
      source: 'url_trigger',
    };

    const result = await this.ablyService.publishEvent(userId, event, payload);

    return {
      ...result,
      userId,
      payload,
    };
  }

  /**
   * Triggers a real-time event via POST request for richer custom payloads.
   * POST /api/v1/realtime/trigger/:userId
   */
  @Post('trigger/:userId')
  @HttpCode(HttpStatus.OK)
  async triggerViaPost(
    @Param('userId') userId: string,
    @Body() body?: TriggerBody,
  ) {
    const event = body?.event || 'sync:invalidate';
    const entities = body?.entities && Array.isArray(body.entities)
      ? body.entities
      : ['notes', 'folders'];

    const payload: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      entities,
      ...(body?.message ? { message: body.message } : {}),
      ...(body?.data ? { data: body.data } : {}),
      source: 'post_trigger',
    };

    const result = await this.ablyService.publishEvent(userId, event, payload);

    return {
      ...result,
      userId,
      payload,
    };
  }
}
