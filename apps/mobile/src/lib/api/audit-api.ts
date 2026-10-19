import { useInfiniteQuery } from '@tanstack/react-query';
import { apiClient } from './api-client';
import { useAuthStore } from '@/lib/auth/auth-store';

export type AuditSeverity = 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';

export interface ApiKeyMetadata {
  id: string;
  name: string;
  keyPrefix: string;
}

export interface AuditLog {
  id: string;
  action: string;
  severity: AuditSeverity;
  isSystem: boolean;
  resourceType?: string | null;
  resourceId?: string | null;
  metadata?: Record<string, unknown> & { apiKey?: ApiKeyMetadata } | null;
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

const SEVERITY_COLORS: Record<AuditSeverity, string> = {
  INFO: "#3b82f6",
  WARN: "#f59e0b",
  ERROR: "#ef4444",
  CRITICAL: "#991b1b",
};

const SEVERITY_LABELS: Record<AuditSeverity, string> = {
  INFO: "Info",
  WARN: "Warning",
  ERROR: "Error",
  CRITICAL: "Critical",
};

const RESOURCE_TYPES = [
  { value: "", label: "All Resources" },
  { value: "note", label: "Note" },
  { value: "folder", label: "Folder" },
  { value: "memory", label: "Memory" },
];

export const PAGE_SIZE = 50;

export const AUDIT_QUERY_KEYS = {
  all: ['audit-logs'] as const,
  list: (filters: Omit<AuditLogFilters, 'page'>) =>
    [...AUDIT_QUERY_KEYS.all, filters] as const,
};

export async function fetchAuditLogsApi(
  filters: AuditLogFilters = {},
  token?: string | null,
): Promise<AuditLogsResponse> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    params.set(key, String(value));
  });

  const response = await apiClient.get<AuditLogsResponse>(
    `/audit-logs?${params.toString()}`,
    { token },
  );
  return response;
}

/**
 * Infinite-scroll audit log query.
 *
 * Mirrors the web app's `useQuery` pattern in
 * `apps/web/app/dashboard/audit/page.tsx`, but uses `useInfiniteQuery` so the
 * mobile list can page forward with a scroll-to-end trigger instead of a
 * manual "Load more" button. Gated by admin role + auth token.
 */
export function useAuditLogsQuery(
  filters: Omit<AuditLogFilters, 'page'> = {},
  enabled = true,
) {
  const { token, user } = useAuthStore();

  return useInfiniteQuery({
    queryKey: AUDIT_QUERY_KEYS.list(filters),
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      fetchAuditLogsApi({ ...filters, page: pageParam, limit: PAGE_SIZE }, token),
    getNextPageParam: (lastPage) =>
      lastPage.meta.page < lastPage.meta.totalPages
        ? lastPage.meta.page + 1
        : undefined,
    enabled: enabled && Boolean(token) && user?.type === 'admin',
    staleTime: 1000 * 60 * 2,
  });
}

export { SEVERITY_COLORS, SEVERITY_LABELS, RESOURCE_TYPES };