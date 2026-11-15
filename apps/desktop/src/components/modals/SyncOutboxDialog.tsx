import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogOverlay,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import type { SyncOutboxItem } from "@/db/schema";
import {
  getAllOutbox,
  clearSuccessfulOutbox,
  retryFailedOutbox,
} from "@/lib/sync/outbox";
import { syncManager, onSyncComplete } from "@/lib/sync/sync-manager";
import { useSyncStore } from "@/lib/sync/use-sync";
import { useAuthStore } from "@/stores/use-auth-store";
import {
  Trash2,
  RefreshCw,
  Send,
  CheckCircle2,
  Layers,
  AlertCircle,
  LogIn,
  Eye,
  Copy,
  Check,
  Search,
  Code2,
} from "lucide-react";

interface SyncOutboxDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenAuth?: () => void;
}

type StatusFilter = "all" | "pending" | "in_flight" | "failed" | "success";

export function SyncOutboxDialog({
  open,
  onOpenChange,
  onOpenAuth,
}: SyncOutboxDialogProps) {
  const [items, setItems] = useState<SyncOutboxItem[]>([]);
  const [inspectedItem, setInspectedItem] = useState<SyncOutboxItem | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [syncFeedback, setSyncFeedback] = useState<{ type: "error" | "success"; message: string } | null>(null);

  const syncStatus = useSyncStore((s) => s.status);
  const { isAuthenticated } = useAuthStore();

  const loadData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const rows = await getAllOutbox();
      setItems(rows);
    } catch (err: unknown) {
      console.error("[Ledger:LoadError]", err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Load once when sheet opens
  useEffect(() => {
    if (open) {
      void loadData();
      setSyncFeedback(null);
    }
  }, [open, loadData]);

  // Subscribe to sync completion event
  useEffect(() => {
    if (!open) return;
    const unsubscribe = onSyncComplete(() => {
      void loadData();
    });
    return () => unsubscribe();
  }, [open, loadData]);

  // Keep inspected item fresh if items update
  useEffect(() => {
    if (inspectedItem) {
      const updated = items.find((i) => i.id === inspectedItem.id);
      if (updated) {
        setInspectedItem(updated);
      }
    }
  }, [items, inspectedItem]);

  // Computed metrics
  const metrics = useMemo(() => {
    const counts = { pending: 0, in_flight: 0, failed: 0, success: 0 };
    for (const item of items) {
      if (item.status in counts) {
        counts[item.status as keyof typeof counts]++;
      }
    }
    return counts;
  }, [items]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesEntity = item.entity.toLowerCase().includes(q);
        const matchesAction = item.action.toLowerCase().includes(q);
        const matchesEntityId = item.entityId.toLowerCase().includes(q);
        const matchesMutationId = item.mutationId.toLowerCase().includes(q);
        if (!matchesEntity && !matchesAction && !matchesEntityId && !matchesMutationId) {
          return false;
        }
      }
      return true;
    });
  }, [items, statusFilter, searchQuery]);

  const handleClearSuccessful = async () => {
    await clearSuccessfulOutbox();
    await loadData();
    if (inspectedItem?.status === "success") {
      setInspectedItem(null);
    }
  };

  const handleRetryFailed = async () => {
    await retryFailedOutbox();
    await loadData();
    const res = await syncManager.sync();
    if (!res.success && res.error) {
      setSyncFeedback({ type: "error", message: res.error });
    }
  };

  const handleTriggerSync = async () => {
    setSyncFeedback(null);
    if (!isAuthenticated) {
      setSyncFeedback({
        type: "error",
        message: "Authentication required. Please sign in to sync your notes with the server.",
      });
      return;
    }

    const res = await syncManager.sync();
    if (!res.success && res.error) {
      setSyncFeedback({ type: "error", message: res.error });
    } else {
      setSyncFeedback({ type: "success", message: "Sync finished successfully." });
      await loadData();
    }
  };

  const copyToClipboard = async (text: string, fieldId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldId);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error("Failed to copy", err);
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          data-className="w-full sm:max-w-4xl md:max-w-5xl lg:max-w-6xl data-[side=right]:w-[85vw] data-[side=right]:max-w-5xl lg:data-[side=right]:max-w-6xl p-6 bg-card border-border flex flex-col justify-between h-full overflow-hidden"
          className="w-full sm:max-w-2xl! md:max-w-3xl! p-6 bg-card border-border flex flex-col justify-between h-full overflow-hidden"
        >
          <div className="flex flex-col h-full space-y-4 min-h-0">
            {/* Header */}
            <SheetHeader className="shrink-0 p-0 pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-[#39ff14]" />
                  <SheetTitle className="text-base font-semibold">
                    Sync Outbox
                  </SheetTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => void loadData()}
                    disabled={isRefreshing}
                    className="h-6 w-6 text-muted-foreground hover:text-foreground"
                    title="Refresh delivery ledger"
                  >
                    <RefreshCw className={`h-3 w-3 ${isRefreshing ? "animate-spin" : ""}`} />
                  </Button>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {items.length} total records
                  </Badge>
                </div>
              </div>
              <SheetDescription className="text-xs text-muted-foreground">
                Monitor queued offline mutations, background delivery attempts, and inspect mutation payloads in detail.
              </SheetDescription>
            </SheetHeader>

            {/* Feedback banner if sync action fails or needs auth */}
            {syncFeedback && (
              <div
                className={`p-3 rounded border text-xs flex items-center justify-between gap-2 shrink-0 ${
                  syncFeedback.type === "error"
                    ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
                    : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span className="text-[11px] leading-tight truncate">{syncFeedback.message}</span>
                </div>
                {!isAuthenticated && onOpenAuth && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onOpenChange(false);
                      onOpenAuth();
                    }}
                    className="h-6 text-[10px] gap-1 shrink-0 bg-background"
                  >
                    <LogIn className="h-3 w-3" />
                    Sign In
                  </Button>
                )}
              </div>
            )}

            {/* 1. Metrics Bar */}
            <div className="grid grid-cols-4 gap-3 shrink-0">
              <div
                onClick={() => setStatusFilter(statusFilter === "pending" ? "all" : "pending")}
                className={`rounded border p-2.5 text-center cursor-pointer transition-colors ${
                  statusFilter === "pending"
                    ? "border-amber-400 bg-amber-500/20 shadow-xs"
                    : "border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/15"
                }`}
              >
                <span className="text-[10px] font-medium text-amber-400 uppercase tracking-wider block">
                  Pending
                </span>
                <span className="text-xl font-bold font-mono text-amber-300">
                  {metrics.pending}
                </span>
              </div>

              <div
                onClick={() => setStatusFilter(statusFilter === "in_flight" ? "all" : "in_flight")}
                className={`rounded border p-2.5 text-center cursor-pointer transition-colors ${
                  statusFilter === "in_flight"
                    ? "border-sky-400 bg-sky-500/20 shadow-xs"
                    : "border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/15"
                }`}
              >
                <span className="text-[10px] font-medium text-sky-400 uppercase tracking-wider block">
                  In Flight
                </span>
                <span className="text-xl font-bold font-mono text-sky-300">
                  {metrics.in_flight}
                </span>
              </div>

              <div
                onClick={() => setStatusFilter(statusFilter === "failed" ? "all" : "failed")}
                className={`rounded border p-2.5 text-center cursor-pointer transition-colors ${
                  statusFilter === "failed"
                    ? "border-rose-400 bg-rose-500/20 shadow-xs"
                    : "border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/15"
                }`}
              >
                <span className="text-[10px] font-medium text-rose-400 uppercase tracking-wider block">
                  Failed
                </span>
                <span className="text-xl font-bold font-mono text-rose-300">
                  {metrics.failed}
                </span>
              </div>

              <div
                onClick={() => setStatusFilter(statusFilter === "success" ? "all" : "success")}
                className={`rounded border p-2.5 text-center cursor-pointer transition-colors ${
                  statusFilter === "success"
                    ? "border-emerald-400 bg-emerald-500/20 shadow-xs"
                    : "border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/15"
                }`}
              >
                <span className="text-[10px] font-medium text-emerald-400 uppercase tracking-wider block">
                  Success
                </span>
                <span className="text-xl font-bold font-mono text-emerald-300">
                  {metrics.success}
                </span>
              </div>
            </div>

            {/* 2. Action Toolbar & Filter */}
            <div className="flex flex-wrap items-center justify-between gap-2 py-1 text-xs shrink-0">
              <div className="flex items-center gap-2">
                {/* Search input */}
                <div className="relative w-56">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search entity, ID..."
                    className="w-full pl-7 pr-2 py-1 text-xs bg-muted/30 border border-border rounded focus:outline-none focus:border-[#39ff14] placeholder:text-muted-foreground/60"
                  />
                </div>

                {statusFilter !== "all" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setStatusFilter("all")}
                    className="h-7 text-xs text-primary hover:text-foreground"
                  >
                    Clear ({statusFilter})
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2 ml-auto">
                {metrics.failed > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void handleRetryFailed()}
                    className="h-7 text-xs gap-1.5 border-rose-500/40 text-rose-400 hover:bg-rose-500/10"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Retry Failed ({metrics.failed})
                  </Button>
                )}

                {metrics.success > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void handleClearSuccessful()}
                    className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                  >
                    <Trash2 className="h-3 w-3" />
                    Clear Successful ({metrics.success})
                  </Button>
                )}

                <Button
                  size="sm"
                  onClick={() => void handleTriggerSync()}
                  disabled={syncStatus === "syncing"}
                  className="h-7 text-xs gap-1.5 bg-[#39ff14] text-black hover:bg-[#32e012] font-medium"
                >
                  <Send className={`h-3 w-3 ${syncStatus === "syncing" ? "animate-spin" : ""}`} />
                  {syncStatus === "syncing" ? "Syncing..." : "Trigger Sync"}
                </Button>
              </div>
            </div>

            <Separator className="shrink-0" />

            {/* 3. Spacious Full-Width Ledger Queue Table */}
            <div className="flex-1 rounded border border-border bg-muted/10 min-h-0 flex flex-col overflow-hidden">
              {/* Table Column Headers */}
              <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-muted/40 border-b border-border text-[11px] font-semibold text-muted-foreground uppercase tracking-wider shrink-0">
                <div className="col-span-2">Status</div>
                <div className="col-span-2">Entity & Action</div>
                <div className="col-span-3">Entity ID</div>
                <div className="col-span-2">Timestamp</div>
                <div className="col-span-2">Diagnostics</div>
                <div className="col-span-1 text-right">Inspect</div>
              </div>

              {/* Table Body */}
              <ScrollArea className="flex-1">
                {filteredItems.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
                    <CheckCircle2 className="h-8 w-8 text-[#39ff14]/70 mb-2" />
                    <p className="text-xs font-medium text-foreground">
                      {items.length === 0 ? "Delivery Ledger Empty" : "No matching mutations"}
                    </p>
                    <p className="text-[11px] mt-0.5">
                      {items.length === 0
                        ? "No offline mutations waiting to be pushed."
                        : "Try adjusting your search query or status filter."}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/50">
                    {filteredItems.map((item) => {
                      let statusBadgeColor = "border-muted-foreground/30 text-muted-foreground";
                      if (item.status === "pending") statusBadgeColor = "border-amber-400/40 text-amber-400 bg-amber-400/10";
                      if (item.status === "in_flight") statusBadgeColor = "border-sky-400/40 text-sky-400 bg-sky-400/10";
                      if (item.status === "failed") statusBadgeColor = "border-rose-400/40 text-rose-400 bg-rose-400/10";
                      if (item.status === "success") statusBadgeColor = "border-emerald-400/40 text-emerald-400 bg-emerald-400/10";

                      return (
                        <div
                          key={item.id}
                          onClick={() => setInspectedItem(item)}
                          className="grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-muted/30 cursor-pointer transition-colors group text-xs"
                        >
                          {/* Status */}
                          <div className="col-span-2 flex items-center">
                            <Badge variant="outline" className={`text-[9px] px-1.5 py-0 capitalize ${statusBadgeColor}`}>
                              {item.status.replace("_", " ")}
                            </Badge>
                          </div>

                          {/* Entity & Action */}
                          <div className="col-span-2 flex items-center gap-1.5 min-w-0">
                            <span className="font-mono text-[11px] font-semibold text-foreground uppercase">
                              {item.entity}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              ({item.action})
                            </span>
                          </div>

                          {/* Entity ID */}
                          <div className="col-span-3 min-w-0 pr-2">
                            <span className="font-mono text-[11px] text-muted-foreground truncate block group-hover:text-foreground transition-colors">
                              {item.entityId}
                            </span>
                          </div>

                          {/* Timestamp */}
                          <div className="col-span-2 text-[11px] font-mono text-muted-foreground">
                            {new Date(item.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })}
                          </div>

                          {/* Diagnostics / Error / Retries */}
                          <div className="col-span-2 min-w-0">
                            {item.lastError ? (
                              <span className="text-[10px] text-rose-400 font-mono truncate block" title={item.lastError}>
                                {item.lastError}
                              </span>
                            ) : item.retryCount > 0 ? (
                              <span className="text-[10px] text-amber-400 font-mono">
                                Retried {item.retryCount}x
                              </span>
                            ) : (
                              <span className="text-[10px] text-muted-foreground/60 font-mono">
                                Clean
                              </span>
                            )}
                          </div>

                          {/* Inspect Action */}
                          <div className="col-span-1 text-right">
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                setInspectedItem(item);
                              }}
                              className="h-6 w-6 text-muted-foreground group-hover:text-foreground"
                              title="Inspect payload"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-border flex items-center justify-between shrink-0">
            <span className="text-[11px] text-muted-foreground">
              Showing {filteredItems.length} of {items.length} records
            </span>
            <Button
              variant="default"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              Done
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Dedicated Mutation Payload Inspector Modal */}
      {inspectedItem && (
        <Dialog
          open={!!inspectedItem}
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              setInspectedItem(null);
            }
          }}
        >
          <DialogOverlay className="z-[60] bg-black/60 backdrop-blur-xs" />
          <DialogContent className="z-[60] sm:max-w-2xl md:max-w-3xl bg-card border-border p-6 flex flex-col max-h-[85vh] overflow-hidden gap-4">
            <DialogHeader className="shrink-0">
              <div className="flex items-center gap-2">
                <Code2 className="h-4 w-4 text-[#39ff14]" />
                <DialogTitle className="text-sm font-semibold">
                  Mutation Payload Inspector
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-muted-foreground">
                Inspection view for offline mutation parameters, target entity, and delivery state.
              </DialogDescription>
            </DialogHeader>

            {/* Overview Metadata Strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 p-3 rounded border border-border/70 bg-muted/20 shrink-0 text-xs">
              <div>
                <span className="text-[10px] text-muted-foreground uppercase block font-medium">Status</span>
                <Badge
                  variant="outline"
                  className={`mt-0.5 text-[10px] capitalize ${
                    inspectedItem.status === "pending"
                      ? "border-amber-400/40 text-amber-400 bg-amber-400/10"
                      : inspectedItem.status === "in_flight"
                      ? "border-sky-400/40 text-sky-400 bg-sky-400/10"
                      : inspectedItem.status === "failed"
                      ? "border-rose-400/40 text-rose-400 bg-rose-400/10"
                      : "border-emerald-400/40 text-emerald-400 bg-emerald-400/10"
                  }`}
                >
                  {inspectedItem.status.replace("_", " ")}
                </Badge>
              </div>

              <div>
                <span className="text-[10px] text-muted-foreground uppercase block font-medium">Target</span>
                <span className="font-mono text-xs font-semibold text-foreground uppercase">
                  {inspectedItem.entity} • {inspectedItem.action}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-muted-foreground uppercase block font-medium">Retries</span>
                <span className="font-mono text-xs text-foreground">
                  {inspectedItem.retryCount} attempts
                </span>
              </div>

              <div>
                <span className="text-[10px] text-muted-foreground uppercase block font-medium">Created At</span>
                <span className="font-mono text-xs text-muted-foreground">
                  {new Date(inspectedItem.createdAt).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Identifiers */}
            <div className="space-y-2 p-3 rounded border border-border/60 bg-muted/10 shrink-0 text-xs font-mono">
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground shrink-0 font-medium">Entity ID:</span>
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="truncate text-foreground">{inspectedItem.entityId}</span>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => void copyToClipboard(inspectedItem.entityId, "entityId")}
                    className="h-5 w-5 text-muted-foreground hover:text-foreground shrink-0"
                    title="Copy entity ID"
                  >
                    {copiedField === "entityId" ? (
                      <Check className="h-3 w-3 text-[#39ff14]" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground shrink-0 font-medium">Mutation ID:</span>
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="truncate text-foreground">{inspectedItem.mutationId}</span>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => void copyToClipboard(inspectedItem.mutationId, "mutationId")}
                    className="h-5 w-5 text-muted-foreground hover:text-foreground shrink-0"
                    title="Copy mutation ID"
                  >
                    {copiedField === "mutationId" ? (
                      <Check className="h-3 w-3 text-[#39ff14]" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Failure reason if any */}
            {inspectedItem.lastError && (
              <div className="p-3 rounded bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs shrink-0 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-rose-400">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>Delivery Failure Error</span>
                </div>
                <p className="font-mono text-[11px] break-words">{inspectedItem.lastError}</p>
              </div>
            )}

            {/* Payload JSON Inspector */}
            <div className="flex-1 min-h-0 flex flex-col space-y-1.5">
              <div className="flex items-center justify-between shrink-0">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Raw Payload JSON
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void copyToClipboard(inspectedItem.payload, "payload")}
                  className="h-6 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
                >
                  {copiedField === "payload" ? (
                    <>
                      <Check className="h-3 w-3 text-[#39ff14]" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      <span>Copy JSON</span>
                    </>
                  )}
                </Button>
              </div>

              <ScrollArea className="flex-1 rounded border border-border/80 bg-black/60 p-3 font-mono text-[11px] text-muted-foreground">
                <pre className="whitespace-pre-wrap leading-relaxed text-foreground/90 selection:bg-[#39ff14]/30 selection:text-foreground">
                  {(() => {
                    try {
                      return JSON.stringify(JSON.parse(inspectedItem.payload), null, 2);
                    } catch {
                      return inspectedItem.payload;
                    }
                  })()}
                </pre>
              </ScrollArea>
            </div>

            <DialogFooter className="shrink-0 pt-2 border-t border-border flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => void copyToClipboard(inspectedItem.payload, "payload")}
                className="text-xs gap-1.5"
              >
                <Copy className="h-3 w-3" />
                Copy Payload
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => setInspectedItem(null)}
                className="text-xs"
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
