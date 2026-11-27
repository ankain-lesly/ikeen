"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  Key,
  Plus,
  ArrowRight,
  Terminal,
  Copy,
  Check,
  ShieldCheck,
  Clock,
  Sparkles,
  Cpu,
  Radio,
} from "lucide-react";

import { useAuthStore } from "@/lib/stores/auth-store";
import { useKeysStore } from "@/lib/stores/keys-store";
import { fetchKeysApi } from "@/lib/api/keys.api";
import { fetchMcpToolsApi } from "@/lib/api/mcp.api";
import { xenv } from "@/lib/env.client";

import { MetricsOverview } from "@/components/dashboard/metrics-overview";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

export default function DashboardOverviewPage() {
  const { user } = useAuthStore();
  const { openCreate } = useKeysStore();
  const [copiedEndpoint, setCopiedEndpoint] = React.useState(false);
  const [copiedPrefixId, setCopiedPrefixId] = React.useState<string | null>(null);

  const endpointUrl = `${xenv.NEXT_PUBLIC_API_URL}/mcp`;

  const { data: keys = [], isLoading } = useQuery({
    queryKey: ["api-keys"],
    queryFn: fetchKeysApi,
  });

  const { data: tools = [] } = useQuery({
    queryKey: ["mcp-tools"],
    queryFn: fetchMcpToolsApi,
  });

  function copyEndpoint() {
    navigator.clipboard.writeText(endpointUrl);
    setCopiedEndpoint(true);
    toast.success("MCP endpoint copied!");
    setTimeout(() => setCopiedEndpoint(false), 2000);
  }

  function copyPrefix(id: string, prefix: string) {
    navigator.clipboard.writeText(prefix);
    setCopiedPrefixId(id);
    toast.success("Key prefix copied");
    setTimeout(() => setCopiedPrefixId(null), 1500);
  }

  const displayName = user?.firstName || user?.email?.split("@")[0] || "Developer";
  const recentKeys = keys.slice(0, 3);

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
      {/* 1. Welcome Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Radio className="size-3 animate-pulse text-primary" />
              <span className="font-mono">MCP Protocol v2026-07-28 · Operational</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-heading font-medium tracking-tight text-foreground">
              Welcome back, {displayName}
            </h1>

            <p className="text-xs sm:text-sm leading-relaxed text-muted-foreground">
              Manage your private research tokens, inspect available MCP tools, and connect AI agents like Claude Desktop and Cursor to your iKeen workspace.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
            <Button onClick={openCreate} size="sm" className="gap-1.5 font-medium shadow-xs">
              <Plus className="size-4" />
              <span>Create New Key</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              render={
                <Link href="/dashboard/keys" className="flex items-center gap-1.5 text-xs">
                  <span>Manage Keys</span>
                  <ArrowRight className="size-3.5 text-muted-foreground" />
                </Link>
              }
            />
          </div>
        </div>
      </div>

      {/* 2. Real-time Telemetry Metrics */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
            Telemetry Overview
          </h2>
          <span className="text-[11px] text-muted-foreground">Updated live</span>
        </div>
        <MetricsOverview />
      </section>

      {/* 3. Operational Grid (Recent Keys & Quick MCP Connection) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Keys Card */}
        <Card className="border-border bg-card flex flex-col justify-between">
          <CardHeader className="flex flex-row items-center justify-between border-b border-border/40 pb-4">
            <div>
              <CardTitle className="text-base font-heading flex items-center gap-2">
                <Key className="size-4 text-primary" />
                <span>Recent API Keys</span>
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Active credentials provisioned for external agents.
              </p>
            </div>
            <Link
              href="/dashboard/keys"
              className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
            >
              <span>View all</span>
              <ArrowRight className="size-3" />
            </Link>
          </CardHeader>

          <CardContent className="p-0 flex-1 flex flex-col justify-between">
            {isLoading ? (
              <div className="flex items-center justify-center py-12 gap-2 text-xs text-muted-foreground">
                <Spinner />
                <span>Loading active keys...</span>
              </div>
            ) : recentKeys.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center space-y-3">
                <div className="size-10 rounded-full bg-muted/30 flex items-center justify-center text-muted-foreground">
                  <Key className="size-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-foreground">No active keys provisioned</p>
                  <p className="text-[11px] text-muted-foreground max-w-xs">
                    Generate an API key to allow external tools to query your research notes.
                  </p>
                </div>
                <Button onClick={openCreate} size="sm" variant="outline" className="gap-1.5 text-xs">
                  <Plus className="size-3.5" />
                  <span>Generate Key</span>
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {recentKeys.map((k) => (
                  <div
                    key={k.id}
                    className="flex items-center justify-between p-4 px-6 hover:bg-muted/10 transition-colors"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-foreground truncate">{k.name}</span>
                        <Badge variant="outline" className="font-mono text-[10px] bg-surface">
                          {k.keyPrefix}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <Clock className="size-3" />
                        <span>
                          {k.lastUsedAt
                            ? `Used ${new Date(k.lastUsedAt).toLocaleDateString()}`
                            : "Never used"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => copyPrefix(k.id, k.keyPrefix)}
                        className="text-muted-foreground hover:text-foreground"
                        title="Copy prefix"
                      >
                        {copiedPrefixId === k.id ? (
                          <Check className="size-3.5 text-primary" />
                        ) : (
                          <Copy className="size-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="p-4 border-t border-border/40 bg-muted/10 flex items-center justify-between text-xs text-muted-foreground">
              <span>Total provisioned keys: <strong className="text-foreground">{keys.length}</strong></span>
              <Button
                variant="ghost"
                size="sm"
                onClick={openCreate}
                className="text-xs text-primary hover:text-primary gap-1"
              >
                <Plus className="size-3" />
                <span>Add Key</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick MCP Connection Card */}
        <Card className="border-border bg-card flex flex-col justify-between">
          <CardHeader className="flex flex-row items-center justify-between border-b border-border/40 pb-4">
            <div>
              <CardTitle className="text-base font-heading flex items-center gap-2">
                <Cpu className="size-4 text-primary" />
                <span>MCP Workbench & Endpoint</span>
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Streamable HTTP ingestion endpoint for AI agent connections.
              </p>
            </div>
            <Link
              href="/dashboard/mcps"
              className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
            >
              <span>Workbench</span>
              <ArrowRight className="size-3" />
            </Link>
          </CardHeader>

          <CardContent className="p-6 space-y-4 flex-1">
            <div className="space-y-1.5">
              <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">
                Ingestion Endpoint
              </span>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-raised px-3 py-2 text-xs font-mono">
                <Terminal className="size-3.5 text-primary shrink-0" />
                <span className="truncate flex-1 text-foreground/90">{endpointUrl}</span>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={copyEndpoint}
                  className="hover:text-primary shrink-0"
                  title="Copy endpoint"
                >
                  {copiedEndpoint ? <Check className="size-3.5 text-primary" /> : <Copy className="size-3.5" />}
                </Button>
              </div>
            </div>

            <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 font-medium text-foreground">
                <Sparkles className="size-3.5 text-primary" />
                <span>
                  {tools.length > 0 ? `${tools.length} Production Tools Available` : "11 Production Tools Available"}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Full-fidelity MCP operations across Notes (search, inspect, create, update, pin, archive) and Folders (list, create, update, organize).
              </p>
            </div>

            <div className="pt-2">
              <Button
                variant="outline"
                size="sm"
                render={
                  <Link href="/dashboard/mcps" className="w-full flex items-center justify-center gap-1.5 text-xs">
                    <span>Configure Claude & Cursor Clients</span>
                    <ArrowRight className="size-3.5 text-primary" />
                  </Link>
                }
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 4. Security & Best Practices */}
      <Card className="border-border bg-card/60">
        <CardContent className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="size-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 mt-0.5">
              <ShieldCheck className="size-4" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-semibold text-foreground">Token Security & Quota Advisory</h3>
              <p className="text-[11px] text-muted-foreground leading-relaxed max-w-2xl">
                Raw API secret keys are shown only once upon generation. Always store them securely in environment variables (e.g. <code className="font-mono text-foreground bg-muted px-1 py-0.5 rounded">.env.local</code>) and never commit secrets to source control.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary">
              Limit: 60 req/min
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
