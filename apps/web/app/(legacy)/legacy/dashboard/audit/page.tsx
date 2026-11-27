"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  X,
  Loader2,
  Copy,
  ChevronDown,
  ShieldCheck,
} from "lucide-react";

import {
  fetchAuditLogsApi,
  type AuditLog,
  type AuditLogsResponse,
  type AuditLogFilters,
  type AuditSeverity,
} from "@/lib/api/legacy/audit-api";
import { useAuthStore } from "@/lib/stores/auth-store";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

// TODO(2026-10-19): Replace with shared date-fns utils from @repo/utils once available
// Currently using native Date to avoid extra dependency. When @repo/utils is set up,
// replace formatDate/formatRelativeTime with shared formatting functions.
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()} ${date.toTimeString().slice(0, 8)}`;
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  // Fallback to formatDate for older dates
  return formatDate(dateString);
}

const SEVERITY_VARIANTS: Record<
  AuditSeverity,
  "destructive" | "warning" | "secondary" | "default"
> = {
  INFO: "secondary",
  WARN: "warning",
  ERROR: "destructive",
  CRITICAL: "destructive",
};

const SEVERITY_OPTIONS: { value: AuditSeverity; label: string }[] = [
  { value: "INFO", label: "Info" },
  { value: "WARN", label: "Warning" },
  { value: "ERROR", label: "Error" },
  { value: "CRITICAL", label: "Critical" },
];

const RESOURCE_TYPES = [
  { value: "", label: "All Resources" },
  { value: "note", label: "Note" },
  { value: "folder", label: "Folder" },
  { value: "memory", label: "Memory" },
];

const PAGE_SIZES = [25, 50, 100];

function JsonPretty({ data }: { data: unknown }) {
  return (
    <pre className="bg-muted/50 p-3 rounded-md text-xs font-mono overflow-auto max-h-64 whitespace-pre-wrap">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

interface AuditLogDetailModalProps {
  log: AuditLog | null;
  isOpen: boolean;
  onClose: () => void;
}

function AuditLogDetailModal({
  log,
  isOpen,
  onClose,
}: AuditLogDetailModalProps) {
  if (!isOpen || !log) return null;

  return (
    <Sheet open={isOpen} onOpenChange={() => onClose()}>
      <SheetContent
        side="right"
        className="w-[90%]! max-w-3xl! p-6 overflow-y-auto">
        <SheetHeader className="text-left space-y-2 pb-4 p-0">
          <div className="flex items-center gap-2 text-primary font-mono text-xs uppercase tracking-wider">
            <ShieldCheck className="size-4" />
            <span>Developer Audit</span>
          </div>
          <SheetTitle className="text-xl font-heading tracking-tight">
            Audit Log Details
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            View and monitor api key performance and logs from key operations
          </SheetDescription>
        </SheetHeader>
        <div className="bg-card rounded-xl border border-border shadow-xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <Badge
                variant={SEVERITY_VARIANTS[log.severity]}
                className="text-xs">
                {log.severity}
              </Badge>
              <span className="font-mono text-sm">{log.action}</span>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  ID
                </p>
                <div className="flex items-center gap-2 font-mono text-sm text-foreground">
                  <code>{log.id}</code>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => navigator.clipboard.writeText(log.id)}>
                    <Copy className="size-3.5" />
                  </Button>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Created
                </p>
                <p className="font-mono text-sm text-foreground">
                  {formatDate(log.createdAt)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  User
                </p>
                <p className="font-mono text-sm text-foreground">
                  {log.user
                    ? `${log.user.username || log.user.email || log.user.id}`
                    : "System"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  System
                </p>
                <p className="font-mono text-sm text-foreground">
                  {log.isSystem ? "Yes" : "No"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Resource
                </p>
                <p className="font-mono text-sm text-foreground">
                  {log.resourceType
                    ? `${log.resourceType}${log.resourceId ? ` (${log.resourceId})` : ""}`
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </p>
                <p className="font-mono text-sm text-foreground">
                  {log.success ? "Success" : "Failed"}
                </p>
              </div>
              {log.errorMessage && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Error
                  </p>
                  <p className="font-mono text-sm text-destructive">
                    {log.errorMessage}
                  </p>
                </div>
              )}
              {log.requestPath && (
                <div className="sm:col-span-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Request
                  </p>
                  <p className="font-mono text-sm text-foreground">
                    {log.requestMethod} {log.requestPath}
                  </p>
                </div>
              )}
              {log.ipAddress && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    IP Address
                  </p>
                  <p className="font-mono text-sm text-foreground">
                    {log.ipAddress}
                  </p>
                </div>
              )}
              {log.metadata && Boolean(log.metadata.apiKey) && (
                <div className="sm:col-span-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    API Key
                  </p>
                  <div className="flex flex-wrap items-center gap-2 font-mono text-sm text-foreground">
                    <span>
                      {(log.metadata.apiKey as { name?: string }).name ||
                        "Unnamed key"}
                    </span>
                    <span className="text-muted-foreground">·</span>
                    <span>
                      {(log.metadata.apiKey as { keyPrefix?: string })
                        .keyPrefix || ""}
                    </span>
                  </div>
                </div>
              )}
              {log.userAgent && (
                <div className="sm:col-span-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    User Agent
                  </p>
                  <p className="font-mono text-xs text-foreground truncate">
                    {log.userAgent}
                  </p>
                </div>
              )}
            </div>

            {log.details && (
              <div className="pt-2 border-t border-border">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  Details
                </p>
                <p className="text-sm text-foreground">{log.details}</p>
              </div>
            )}

            {log.metadata && Object.keys(log.metadata).length > 0 && (
              <div className="pt-2 border-t border-border">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  Metadata
                </p>
                <JsonPretty data={log.metadata} />
              </div>
            )}

            {log.changes && Object.keys(log.changes).length > 0 && (
              <div className="pt-2 border-t border-border">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  Changes
                </p>
                <JsonPretty data={log.changes} />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-border flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SeverityBadge({ severity }: { severity: AuditSeverity }) {
  return (
    <Badge
      variant={SEVERITY_VARIANTS[severity]}
      className="text-[10px] font-mono capitalize">
      {severity.toLowerCase()}
    </Badge>
  );
}

function ResourceBadge({
  type,
  id,
}: {
  type?: string | null;
  id?: string | null;
}) {
  if (!type) return null;
  return (
    <Badge variant="outline" className="text-[10px] font-mono">
      {type}
      {id ? `·${id.slice(0, 8)}` : ""}
    </Badge>
  );
}

function ActionCell({ log }: { log: AuditLog }) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-xs">{log.action}</span>
      {log.isSystem && (
        <Badge variant="ghost" className="text-[9px] font-mono h-4 px-1.5">
          System
        </Badge>
      )}
    </div>
  );
}

function UserCell({ log }: { log: AuditLog }) {
  if (!log.user) {
    return (
      <span className="text-muted-foreground font-mono text-xs">System</span>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">
        {log.user.firstName?.[0] ||
          log.user.username?.[0] ||
          log.user.email?.[0] ||
          "U"}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium truncate">
          {log.user.username || log.user.email}
        </p>
        {log.user.firstName && (
          <p className="text-[10px] text-muted-foreground font-mono">
            {log.user.firstName} {log.user.lastName || ""}
          </p>
        )}
      </div>
    </div>
  );
}

function DetailsCell({ log }: { log: AuditLog }) {
  return (
    <div className="max-w-xs">
      <p className="text-sm text-foreground line-clamp-1">
        {log.details || "—"}
      </p>
      {log.resourceType && (
        <p className="text-[10px] text-muted-foreground font-mono">
          {log.resourceType}
          {log.resourceId ? ` · ${log.resourceId}` : ""}
        </p>
      )}
    </div>
  );
}

function DateCell({ log }: { log: AuditLog }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <span className="font-mono text-xs text-muted-foreground cursor-help underline dotted">
            {formatRelativeTime(log.createdAt)}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" align="center" className="text-xs">
          {formatDate(log.createdAt)}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function ExportButton({ totalCount }: { totalCount: number }) {
  const [isExporting, setIsExporting] = React.useState(false);

  const handleExport = async (format: "csv" | "json") => {
    setIsExporting(true);
    try {
      // Fetch all logs for export (up to a reasonable limit)
      const response = await fetchAuditLogsApi({
        limit: Math.min(totalCount, 5000),
      });
      const logs = response.data;

      if (format === "json") {
        const blob = new Blob([JSON.stringify(logs, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        // Replace `format(new Date(), "yyyy-MM-dd")` with a simple date string for now
        const dateStr = new Date().toISOString().split("T")[0];
        a.download = `audit-logs-${dateStr}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        // CSV
        const headers = [
          "ID",
          "Timestamp",
          "Action",
          "Severity",
          "User",
          "Resource Type",
          "Resource ID",
          "Details",
          "Success",
          "Error Message",
          "IP Address",
          "Request Path",
          "Request Method",
        ];

        const rows = logs.map((log) => [
          log.id,
          formatDate(log.createdAt),
          log.action,
          log.severity,
          log.user?.username || log.user?.email || "System",
          log.resourceType || "",
          log.resourceId || "",
          log.details || "",
          log.success ? "Yes" : "No",
          log.errorMessage || "",
          log.ipAddress || "",
          log.requestPath || "",
          log.requestMethod || "",
        ]);

        const csv = [headers, ...rows]
          .map((r) =>
            r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","),
          )
          .join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `audit-logs-${new Date().toISOString().split("T")[0]}.csv`;

        a.click();
        URL.revokeObjectURL(url);
      }

      toast.success(`Exported ${logs.length} logs as ${format.toUpperCase()}`);
    } catch (error) {
      console.log("Failed to export logs: ", error);
      toast.error("Failed to export logs");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger disabled={isExporting}>
        <span className="gap-1.5 flex items-center">
          <Download className="size-3.5" />
          <span>Export</span>
          <ChevronDown className="size-3.5" />
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => handleExport("json")}
          disabled={isExporting}>
          <Download className="size-3.5 mr-2" />
          JSON
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleExport("csv")}
          disabled={isExporting}>
          <Download className="size-3.5 mr-2" />
          CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function FilterBar({
  filters,
  onFiltersChange,
  onClear,
  hasFilters,
}: {
  filters: AuditLogFilters;
  onFiltersChange: (filters: AuditLogFilters) => void;
  onClear: () => void;
  hasFilters: boolean;
}) {
  return (
    <Card className="border-border bg-card/60 sticky top-4 z-10">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search actions, details, resources..."
              value={filters.search || ""}
              onChange={(e) =>
                onFiltersChange({
                  ...filters,
                  search: e.target.value || undefined,
                  page: 1,
                })
              }
              className="pl-9"
            />
          </div>

          {/* Severity */}
          <Select<AuditSeverity>
            value={filters.severity || undefined}
            onValueChange={(value) =>
              onFiltersChange({
                ...filters,
                severity: value || undefined,
                page: 1,
              })
            }>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Severities</SelectItem>
              {SEVERITY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Resource Type */}
          <Select
            value={filters.resourceType || ""}
            onValueChange={(value) =>
              onFiltersChange({
                ...filters,
                resourceType: value || undefined,
                page: 1,
              })
            }>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Resource Type" />
            </SelectTrigger>
            <SelectContent>
              {RESOURCE_TYPES.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Clear Filters */}
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              className="gap-1.5">
              <X className="size-3.5" />
              <span>Clear</span>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Pagination({
  meta,
  onPageChange,
  onPageSizeChange,
}: {
  meta: AuditLogsResponse["meta"];
  onPageChange: (page: number) => void;
  onPageSizeChange: (limit: number) => void;
}) {
  const { total, page, limit, totalPages } = meta;

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between py-4 border-t border-border">
      <div className="text-sm text-muted-foreground">
        Showing{" "}
        <span className="font-mono font-medium">{(page - 1) * limit + 1}</span>{" "}
        to{" "}
        <span className="font-mono font-medium">
          {Math.min(page * limit, total)}
        </span>{" "}
        of <span className="font-mono font-medium">{total}</span> logs
      </div>

      <div className="flex items-center gap-2">
        <Select
          value={String(limit)}
          onValueChange={(v) => onPageSizeChange(parseInt(v || "1"))}>
          <SelectTrigger className="w-[100px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZES.map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size} per page
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}>
          <ChevronLeft className="size-3.5" />
        </Button>

        <span className="px-3 text-sm font-mono text-foreground">
          Page <span className="font-medium">{page}</span> of {totalPages}
        </span>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}>
          <ChevronRight className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

function EmptyState({ onClearFilters }: { onClearFilters?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="size-16 rounded-full bg-muted/30 flex items-center justify-center mb-4">
        <Search className="size-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium text-foreground mb-1">
        No audit logs found
      </h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-4">
        There are no audit logs matching your current filters.
      </p>
      {onClearFilters && (
        <Button
          variant="outline"
          size="sm"
          onClick={onClearFilters}
          className="gap-1.5">
          <X className="size-3.5" />
          Clear filters
        </Button>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Action</TableHead>
          <TableHead>Severity</TableHead>
          <TableHead>User</TableHead>
          <TableHead>Details</TableHead>
          <TableHead>Date</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 5 }).map((_, i) => (
          <TableRow key={i}>
            <TableCell>
              <Skeleton className="h-4 w-24" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-5 w-16" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-20" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-32" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-24" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default function AuditLogsPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const [filters, setFilters] = React.useState<AuditLogFilters>({
    page: 1,
    limit: 50,
  });

  const hasFilters = React.useMemo(
    () =>
      !!filters.search ||
      !!filters.severity ||
      !!filters.resourceType ||
      !!filters.userId,
    [filters],
  );

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["audit-logs", filters],
    queryFn: () => fetchAuditLogsApi(filters),
    enabled: user?.type === "admin",
  });

  const [detailLog, setDetailLog] = React.useState<AuditLog | null>(null);

  const handleFiltersChange = (newFilters: AuditLogFilters) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  const handleClearFilters = () => {
    setFilters({ page: 1, limit: filters.limit });
  };

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  const handlePageSizeChange = (limit: number) => {
    setFilters((prev) => ({ ...prev, limit, page: 1 }));
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
  };

  if (!user || user.type !== "admin") {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <Card className="border-border bg-card/60">
          <CardContent className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="size-12 rounded-full bg-muted/30 flex items-center justify-center mb-3">
              <Loader2 className="size-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-1">
              Admin Access Required
            </h3>
            <p className="text-sm text-muted-foreground">
              Audit logs are only accessible to administrators.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-medium tracking-tight text-foreground">
            Audit Logs
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            System activity and administrative actions
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ExportButton totalCount={data?.meta.total || 0} />
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="gap-1.5">
            <Loader2 className="size-3.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <FilterBar
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onClear={handleClearFilters}
        hasFilters={hasFilters}
      />

      {/* Table */}
      <Card className="border-border bg-card">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6">
              <LoadingSkeleton />
            </div>
          ) : isError ? (
            <div className="p-6 text-center">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="size-10 text-destructive" />
                <p className="text-foreground">Failed to load audit logs</p>
                <p className="text-sm text-muted-foreground">
                  {error?.message || "Unknown error"}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  className="gap-1.5">
                  <Loader2 className="size-3.5" />
                  Retry
                </Button>
              </div>
            </div>
          ) : !data?.data.length ? (
            <EmptyState
              onClearFilters={hasFilters ? handleClearFilters : undefined}
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">Action</TableHead>
                      <TableHead className="w-[80px]">Severity</TableHead>
                      <TableHead className="w-[180px]">User</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead className="w-[160px] text-right">
                        Date
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.data.map((log) => (
                      <TableRow
                        key={log.id}
                        onClick={() => setDetailLog(log)}
                        className="cursor-pointer hover:bg-muted/50">
                        <TableCell>
                          <ActionCell log={log} />
                        </TableCell>
                        <TableCell>
                          <SeverityBadge severity={log.severity} />
                        </TableCell>
                        <TableCell>
                          <UserCell log={log} />
                        </TableCell>
                        <TableCell>
                          <DetailsCell log={log} />
                        </TableCell>
                        <TableCell className="text-right">
                          <DateCell log={log} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <Pagination
                meta={data.meta}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <AuditLogDetailModal
        log={detailLog}
        isOpen={!!detailLog}
        onClose={() => setDetailLog(null)}
      />
    </div>
  );
}
