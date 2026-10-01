import { Injectable, Logger } from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service.js';
import type {
  AgentAuditParams,
  AuditChange,
  AuditLogParams,
} from './audit.types.js';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(params: AuditLogParams): Promise<void> {
    try {
      const { ipAddress, userAgent, requestPath, requestMethod } =
        extractRequestContext(params.req);

      await this.prisma.auditLog.create({
        data: {
          userId: params.userId,
          action: params.action,
          severity: params.severity || 'INFO',
          resourceType: params.resourceType,
          resourceId: params.resourceId,
          details: params.details,
          metadata: (params.metadata ?? undefined) as never,
          changes: (params.changes ?? undefined) as never,
          success: params.success ?? true,
          errorMessage: params.errorMessage,
          ipAddress,
          userAgent,
          requestPath,
          requestMethod,
          isSystem: params.isSystem ?? false,
        },
      });
    } catch (error) {
      this.logger.error('[Audit Log Error]', error);
    }
  }

  async logSuccess(params: Omit<AuditLogParams, 'success'>): Promise<void> {
    await this.log({ ...params, success: true });
  }

  async logFailure(
    params: Omit<AuditLogParams, 'success' | 'severity'>,
    error: Error,
  ): Promise<void> {
    await this.log({
      ...params,
      success: false,
      severity: 'ERROR',
      errorMessage: error.message,
    });
  }

  /**
   * Agent mutations: system-originated, conversation-scoped, fire-and-forget.
   */
  logAgent(params: AgentAuditParams): void {
    void this.log({
      userId: params.userId,
      action: params.action,
      details: params.details,
      severity: params.severity ?? 'INFO',
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      isSystem: true,
      success: params.success ?? true,
      errorMessage: params.errorMessage,
      changes: params.changes,
      metadata: {
        source: 'ikeen-agent',
        conversationId: params.conversationId,
        ...params.metadata,
      },
    });
  }

  trackChanges<T extends Record<string, unknown>>(
    oldData: Partial<T>,
    newData: Partial<T>,
    fields: (keyof T)[],
  ): Record<string, AuditChange> {
    const changes: Record<string, AuditChange> = {};

    for (const field of fields) {
      if (oldData[field] !== newData[field]) {
        changes[field as string] = {
          old: oldData[field],
          new: newData[field],
        };
      }
    }

    return changes;
  }
}

function extractRequestContext(req?: Request): {
  ipAddress?: string;
  userAgent?: string;
  requestPath?: string;
  requestMethod?: string;
} {
  if (!req) {
    return {};
  }

  const forwarded = req.headers?.['x-forwarded-for'];
  const realIp = req.headers?.['x-real-ip'];
  const rawIp = forwarded || realIp || req.ip;
  const ipAddress =
    typeof rawIp === 'string'
      ? rawIp
      : Array.isArray(rawIp)
        ? rawIp[0]
        : undefined;
  const userAgentHeader = req.headers?.['user-agent'];

  return {
    ipAddress,
    userAgent: Array.isArray(userAgentHeader)
      ? userAgentHeader[0]
      : userAgentHeader,
    requestPath: req.path || req.url,
    requestMethod: req.method,
  };
}
