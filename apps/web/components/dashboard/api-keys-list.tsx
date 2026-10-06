"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  Key,
  Plus,
  Trash2,
  Copy,
  Clock,
  Check,
  MoreVertical,
  SlidersHorizontal,
  ShieldAlert,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

import { useKeysStore } from "@/lib/stores/keys-store";
import { useAuthStore, useAuthHydration } from "@/lib/stores/auth-store";
import { useRouter } from "next/navigation";
import { fetchKeysApi, revokeKeyApi, type ApiKeyItem } from "@/lib/api/keys-api";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Spinner } from "@/components/ui/spinner";

export function ApiKeysList() {
  const queryClient = useQueryClient();
  const isHydrated = useAuthHydration();
  const router = useRouter();
  const { openCreate, openAuth, setSelectedKeyPrefix } = useKeysStore();
  const { isAuthenticated } = useAuthStore();

  const [copiedPrefixId, setCopiedPrefixId] = React.useState<string | null>(null);
  const [confirmingRevokeId, setConfirmingRevokeId] = React.useState<string | null>(null);

  const {
    data: keys = [],
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["api-keys"],
    queryFn: fetchKeysApi,
    enabled: isHydrated && isAuthenticated,
  });

  const revokeMutation = useMutation({
    mutationFn: revokeKeyApi,
    onSuccess: (_, keyId) => {
      queryClient.setQueryData<ApiKeyItem[]>(["api-keys"], (prev = []) =>
        prev.filter((k) => k.id !== keyId)
      );
      setConfirmingRevokeId(null);
      toast.success("API key revoked successfully");
    },
    onError: (err: unknown) => {
      const axiosErr = err as { response?: { data?: { message?: string } }; message?: string };
      const msg = axiosErr.response?.data?.message || axiosErr.message || "Failed to revoke key";
      toast.error(msg);
      setConfirmingRevokeId(null);
    },
  });

  function handleCopyPrefix(id: string, prefix: string) {
    navigator.clipboard.writeText(prefix);
    setCopiedPrefixId(id);
    toast.success("Prefix copied to clipboard");
    setTimeout(() => setCopiedPrefixId(null), 1500);
  }

  function handleConfigure(prefix: string) {
    setSelectedKeyPrefix(prefix);
    const el = document.getElementById("mcp-client-guides");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    } else {
      router.push("/dashboard/mcps#mcp-client-guides");
    }
  }

  function handleRevokeClick(key: ApiKeyItem, e: React.MouseEvent) {
    e.stopPropagation();
    if (confirmingRevokeId === key.id) {
      // Second click: perform revocation
      revokeMutation.mutate(key.id);
    } else {
      // First click: arm confirmation state with 4s timeout
      setConfirmingRevokeId(key.id);
      setTimeout(() => {
        setConfirmingRevokeId((curr) => (curr === key.id ? null : curr));
      }, 4000);
    }
  }

  function formatRelativeTime(dateStr: string | null) {
    if (!dateStr) return "Never";
    const date = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 60) return "Just now";
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return `${Math.floor(diffSec / 86400)}d ago`;
  }

  function formatExpiration(expiresAt: string | null) {
    if (!expiresAt) {
      return (
        <Badge variant="secondary" className="text-[10px]">
          Never
        </Badge>
      );
    }
    const expDate = new Date(expiresAt);
    const now = new Date();
    if (expDate <= now) {
      return (
        <Badge variant="destructive" className="text-[10px]">
          Expired
        </Badge>
      );
    }
    const daysLeft = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
    return (
      <Badge variant="outline" className="text-[10px] text-primary border-primary/30">
        In {daysLeft}d
      </Badge>
    );
  }

  // Hydration fallback
  if (!isHydrated) {
    return (
      <Card className="border-border bg-card/50">
        <CardContent className="flex items-center justify-center py-16 gap-3 text-muted-foreground text-xs">
          <Spinner />
          <span>Initializing workspace session...</span>
        </CardContent>
      </Card>
    );
  }

  if (!isAuthenticated) {
    return (
      <Card className="border-dashed border-border bg-card/40">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center space-y-4">
          <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Key className="size-6" />
          </div>
          <div className="space-y-1 max-w-sm">
            <h3 className="text-base font-medium text-foreground">Sign in to manage API keys</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Create an account or sign in to provision secret keys and connect external agents to
              your research workspace.
            </p>
          </div>
          <Button onClick={() => openAuth("login")} size="sm" className="gap-2">
            <span>Sign In / Register</span>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader className="flex flex-row items-center justify-between border-b border-border/40 pb-4">
        <div>
          <CardTitle className="text-base font-heading">Provisioned Keys</CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Cryptographically hashed secret keys authorized to connect to iKeen MCP.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="text-muted-foreground hover:text-foreground"
            title="Refresh keys"
          >
            <RefreshCw className={`size-3.5 ${isRefetching ? "animate-spin text-primary" : ""}`} />
          </Button>
          <Button onClick={openCreate} size="sm" className="gap-1.5 font-medium">
            <Plus className="size-4" />
            <span>Create New Key</span>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground text-xs">
            <Spinner />
            <span>Loading active keys...</span>
          </div>
        ) : isError ? (
          <div className="p-8 text-center space-y-3">
            <div className="inline-flex size-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <ShieldAlert className="size-5" />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <p className="text-xs font-medium text-destructive">
                {error instanceof Error ? error.message : "Failed to load API keys"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Ensure the backend service is running and accessible at your configured API URL.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="gap-1.5 text-xs"
            >
              <RefreshCw className="size-3" />
              <span>Retry Request</span>
            </Button>
          </div>
        ) : keys.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-3 px-4">
            <div className="size-10 rounded-full bg-muted/30 flex items-center justify-center text-muted-foreground">
              <Key className="size-5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">No API keys yet</p>
              <p className="text-xs text-muted-foreground max-w-sm">
                Generate your first secret API key to connect Claude Desktop, Cursor, or your custom
                AI agents.
              </p>
            </div>
            <Button onClick={openCreate} size="sm" variant="outline" className="gap-1.5 mt-2">
              <Plus className="size-4" />
              <span>Create Your First Key</span>
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {keys.map((key) => {
              const isConfirming = confirmingRevokeId === key.id;
              const isRevokingThis = revokeMutation.isPending && revokeMutation.variables === key.id;

              return (
                <div
                  key={key.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:px-6 gap-3 hover:bg-muted/10 transition-colors"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-foreground">{key.name}</span>
                      <Badge variant="outline" className="font-mono text-[10px] bg-surface">
                        {key.keyPrefix}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                      <Tooltip>
                        <TooltipTrigger className="flex items-center gap-1 cursor-default">
                          <Clock className="size-3" />
                          <span>Created: {formatRelativeTime(key.createdAt)}</span>
                        </TooltipTrigger>
                        <TooltipContent>
                          {new Date(key.createdAt).toLocaleString()}
                        </TooltipContent>
                      </Tooltip>

                      <span>•</span>

                      <span>Last used: {formatRelativeTime(key.lastUsedAt)}</span>

                      <span>•</span>

                      <span className="flex items-center gap-1">
                        Expires: {formatExpiration(key.expiresAt)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button variant="ghost" size="icon-sm" className="text-muted-foreground">
                            <MoreVertical className="size-4" />
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="end" className="w-48 p-1">
                        <DropdownMenuGroup>
                          <DropdownMenuItem
                            onClick={() => handleCopyPrefix(key.id, key.keyPrefix)}
                            className="text-xs gap-2"
                          >
                            {copiedPrefixId === key.id ? (
                              <Check className="size-3.5 text-primary" />
                            ) : (
                              <Copy className="size-3.5" />
                            )}
                            <span>Copy Prefix</span>
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={() => handleConfigure(key.keyPrefix)}
                            className="text-xs gap-2"
                          >
                            <SlidersHorizontal className="size-3.5" />
                            <span>Configure Client</span>
                          </DropdownMenuItem>
                        </DropdownMenuGroup>

                        <DropdownMenuSeparator />

                        <DropdownMenuGroup>
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={(e) => handleRevokeClick(key, e)}
                            disabled={isRevokingThis}
                            className="text-xs gap-2 cursor-pointer font-medium"
                          >
                            {isRevokingThis ? (
                              <>
                                <Spinner className="size-3.5" />
                                <span>Revoking...</span>
                              </>
                            ) : isConfirming ? (
                              <>
                                <AlertCircle className="size-3.5 text-destructive animate-pulse" />
                                <span className="font-semibold text-destructive">Confirm Revoke?</span>
                              </>
                            ) : (
                              <>
                                <Trash2 className="size-3.5" />
                                <span>Revoke Key</span>
                              </>
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
