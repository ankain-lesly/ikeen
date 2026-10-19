import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuditService } from './audit.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { AdminGuard } from '../auth/guards/admin.guard.js';

@Controller(['audit-logs', 'api/v1/audit-logs'])
@UseGuards(JwtAuthGuard, AdminGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  async getLogs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('action') action?: string,
    @Query('severity') severity?: string,
    @Query('resourceType') resourceType?: string,
    @Query('userId') userId?: string,
    @Query('search') search?: string,
  ) {
    return this.auditService.getLogs({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      action,
      severity,
      resourceType,
      userId,
      search,
    });
  }
}
