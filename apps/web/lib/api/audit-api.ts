import { apiClient } from './api-client';

export type AuditSeverity = 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';

export interface AuditLog {
  id: string;
  action: string;
  severity: AuditSeverity;
  isSystem: boolean;
  resourceType?: string | null;
  resourceId?: string | null;
  metadata?: Record<string, unknown> | null;
  changes?: Record<string, { old: unknown; new: unknown }> | null;
  details?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  requestPath?: string | null;
  requestMethod?: string | null;
  success: boolean;
  errorMessage?: string | null;
  createdAt: string;
  user?: {
    id: string;
    username?: string | null;
    email?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  } | null;
}

export interface AuditLogsMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AuditLogsResponse {
  data: AuditLog[];
  meta: AuditLogsMeta;
}

export interface AuditLogFilters {
  page?: number;
  limit?: number;
  action?: string;
  severity?: AuditSeverity;
  resourceType?: string;
  userId?: string;
  search?: string;
}

export async function fetchAuditLogsApi(
  filters: AuditLogFilters = {},
): Promise<AuditLogsResponse> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    params.set(key, String(value));
  });

  const response = await apiClient.get<AuditLogsResponse>(
    `/api/v1/audit-logs?${params.toString()}`,
  );
  return response.data;
}