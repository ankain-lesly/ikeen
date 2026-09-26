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
import { CheckUpdatesQueryDto } from './dto/check-updates.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface AuthenticatedRequest {
  user: {
    id: string;
    email: string;
  };
}

@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Get('updates')
  getUpdates(@Query() query: CheckUpdatesQueryDto) {
    return this.syncService.getAppUpdates(query);
  }

  @Post('push')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async push(@Req() req: AuthenticatedRequest, @Body() dto: SyncPushDto) {
    return this.syncService.push(req.user.id, dto);
  }

  @Get('pull')
  @UseGuards(JwtAuthGuard)
  async pull(@Req() req: AuthenticatedRequest, @Query() query: SyncPullDto) {
    return this.syncService.pull(req.user.id, query.since);
  }

  @Get('realtime-auth')
  @UseGuards(JwtAuthGuard)
  async getRealtimeAuth(@Req() req: AuthenticatedRequest) {
    return this.syncService.createRealtimeAuth(req.user.id);
  }
}
