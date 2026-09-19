import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SyncService } from './sync.service';
import { SyncPushDto } from './dto/sync-push.dto';
import { SyncPullDto } from './dto/sync-pull.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface AuthenticatedRequest {
  user: {
    id: string;
    email: string;
  };
}

@Controller('sync')
@UseGuards(JwtAuthGuard)
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post('push')
  @HttpCode(HttpStatus.OK)
  async push(
    @Req() req: AuthenticatedRequest,
    @Body() dto: SyncPushDto,
  ) {
    return this.syncService.push(req.user.id, dto);
  }

  @Get('pull')
  async pull(
    @Req() req: AuthenticatedRequest,
    @Query() query: SyncPullDto,
  ) {
    return this.syncService.pull(req.user.id, query.since);
  }

  @Get('realtime-auth')
  async getRealtimeAuth(@Req() req: AuthenticatedRequest) {
    return this.syncService.createRealtimeAuth(req.user.id);
  }
}
