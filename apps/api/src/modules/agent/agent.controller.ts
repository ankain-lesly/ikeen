import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { AgentService } from './agent.service.js';
import { ChatAgentDto } from './dto/chat-agent.dto.js';

interface AuthenticatedRequest {
  user: {
    id: string;
    email: string;
  };
}

@Controller('agent')
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  /**
   * Health and capability status check for the agent module.
   */
  @Get('status')
  getStatus() {
    const tools = this.agentService.getTools();
    return {
      status: 'active',
      agent: 'ikeen-agent',
      tools: Object.keys(tools),
    };
  }

  /**
   * Alias endpoint mounted at POST /agent/chat.
   */
  @Post('chat')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async chatAlias(
    @Req() req: AuthenticatedRequest,
    @Body() dto: ChatAgentDto,
    @Res() res: Response,
  ) {
    await this.agentService.streamChatToResponse({
      userId: req.user.id,
      conversationId: dto.conversationId,
      messages: dto.messages,
      response: res,
    });
  }

  /**
   * Lists conversations for the authenticated user.
   */
  @Get('conversations')
  @UseGuards(JwtAuthGuard)
  async listConversations(
    @Req() req: AuthenticatedRequest,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.agentService.listConversations(
      req.user.id,
      limit ? parseInt(limit, 10) : undefined,
      offset ? parseInt(offset, 10) : undefined,
    );
  }

  /**
   * Retrieves a single conversation thread with full message history.
   */
  @Get('conversations/:id')
  @UseGuards(JwtAuthGuard)
  async getConversation(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.agentService.getConversation(req.user.id, id);
  }

  /**
   * Deletes a conversation thread.
   */
  @Delete('conversations/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async deleteConversation(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.agentService.deleteConversation(req.user.id, id);
  }
}
