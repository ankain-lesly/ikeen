import type { Request } from 'express';

export type AuditSeverity = 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';

export interface AuditChange {
  old: unknown;
  new: unknown;
}

export interface AuditLogParams {
  action: string;
  details: string;
  severity?: AuditSeverity;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  changes?: Record<string, AuditChange>;
  isSystem?: boolean;
  success?: boolean;
  errorMessage?: string;
  userId?: string;
  req?: Request;
}

export interface AgentAuditParams {
  action: string;
  details: string;
  userId: string;
  conversationId: string;
  severity?: AuditSeverity;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  changes?: Record<string, AuditChange>;
  success?: boolean;
  errorMessage?: string;
}
