import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiKeyService } from './api-key.service.js';
import { CreateApiKeyDto } from './dto/create-api-key.dto.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';

@Controller('auth/api-keys')
@UseGuards(JwtAuthGuard)
export class ApiKeyController {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createApiKey(
    @Req() req: { user: { id: string } },
    @Body() dto: CreateApiKeyDto,
  ) {
    return this.apiKeyService.createApiKey(req.user.id, dto);
  }

  @Get()
  async listApiKeys(@Req() req: { user: { id: string } }) {
    return this.apiKeyService.listApiKeys(req.user.id);
  }

  @Delete(':id')
  async revokeApiKey(
    @Req() req: { user: { id: string } },
    @Param('id') id: string,
  ) {
    return this.apiKeyService.revokeApiKey(req.user.id, id);
  }
}
