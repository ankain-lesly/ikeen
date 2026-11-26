import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import {
  PublicShareRateLimitGuard,
  ShareRateLimit,
} from './public-share-rate-limit.guard.js';
import { SharesService } from './shares.service.js';
import { CreateShareDto } from './dto/create-share.dto.js';
import { UpdateShareDto } from './dto/update-share.dto.js';
import { UnlockShareDto } from './dto/unlock-share.dto.js';

interface AuthenticatedRequest {
  user: {
    id: string;
    email: string;
  };
}

@Controller('notes')
@UseGuards(JwtAuthGuard)
export class NoteSharesController {
  constructor(private readonly sharesService: SharesService) {}

  @Get(':noteId/share')
  async getShare(
    @Req() req: AuthenticatedRequest,
    @Param('noteId') noteId: string,
  ) {
    return this.sharesService.getShare(req.user.id, noteId);
  }

  @Post(':noteId/share')
  @HttpCode(HttpStatus.CREATED)
  async upsertShare(
    @Req() req: AuthenticatedRequest,
    @Param('noteId') noteId: string,
    @Body() dto: CreateShareDto,
  ) {
    return this.sharesService.upsertShare(req.user.id, noteId, dto);
  }

  @Patch(':noteId/share')
  async updateShare(
    @Req() req: AuthenticatedRequest,
    @Param('noteId') noteId: string,
    @Body() dto: UpdateShareDto,
  ) {
    return this.sharesService.updateShare(req.user.id, noteId, dto);
  }

  @Delete(':noteId/share')
  @HttpCode(HttpStatus.OK)
  async revokeShare(
    @Req() req: AuthenticatedRequest,
    @Param('noteId') noteId: string,
  ) {
    return this.sharesService.revokeShare(req.user.id, noteId);
  }
}

@Controller('public/shares')
export class PublicSharesController {
  constructor(private readonly sharesService: SharesService) {}

  @Get(':slug')
  @UseGuards(PublicShareRateLimitGuard)
  @ShareRateLimit({ limit: 60, windowMs: 60_000, bucket: 'public-read' })
  async getPublicShare(
    @Param('slug') slug: string,
    @Headers('x-share-token') shareToken?: string,
  ) {
    return this.sharesService.getPublicShare(slug, shareToken);
  }

  @Post(':slug/unlock')
  @HttpCode(HttpStatus.OK)
  @UseGuards(PublicShareRateLimitGuard)
  @ShareRateLimit({ limit: 10, windowMs: 60_000, bucket: 'public-unlock' })
  async unlockShare(
    @Param('slug') slug: string,
    @Body() dto: UnlockShareDto,
  ) {
    return this.sharesService.unlockShare(slug, dto.password);
  }

  @Post(':slug/fork')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  async forkShare(
    @Req() req: AuthenticatedRequest,
    @Param('slug') slug: string,
    @Headers('x-share-token') shareToken?: string,
  ) {
    return this.sharesService.forkShare(req.user.id, slug, shareToken);
  }
}
