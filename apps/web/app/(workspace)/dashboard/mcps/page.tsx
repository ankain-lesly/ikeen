"use client";

import * as React from "react";
import toast from "react-hot-toast";
import { Copy, Check, Radio, Terminal, Cpu } from "lucide-react";

import { xenv } from "@/lib/env.client";
import { McpGuides } from "@/components/dashboard/mcp-guides";
import { ResearchTools } from "@/components/dashboard/research-tools";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function McpWorkbenchPage() {
  const [copied, setCopied] = React.useState(false);
  const endpointUrl = `${xenv.NEXT_PUBLIC_API_URL}/mcp`;

  function copyEndpoint() {
    navigator.clipboard.writeText(endpointUrl);
    setCopied(true);
    toast.success("MCP endpoint copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Page Header */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Radio className="size-3 animate-pulse text-primary" />
              <span className="font-mono">Streamable HTTP (2026-07-28) · Operational</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-heading font-medium tracking-tight text-foreground flex items-center gap-2.5">
              <Cpu className="size-7 text-primary" />
              <span>MCP Workbench & Configurations</span>
            </h1>

            <p className="text-xs sm:text-sm leading-relaxed text-muted-foreground">
              Select an active API key to auto-generate personalized configurations for Claude Desktop, Cursor, Cline, Windsurf, or custom HTTP agents.
            </p>
          </div>

          {/* Ingestion Endpoint Chip */}
          <div className="flex flex-col gap-1.5 self-start md:self-auto min-w-[280px]">
            <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">
              Server Endpoint
            </span>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-raised px-3 py-2 text-xs font-mono">
              <Terminal className="size-3.5 text-primary shrink-0" />
              <span className="truncate flex-1 text-foreground/90">{endpointUrl}</span>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={copyEndpoint}
                className="hover:text-primary shrink-0"
                title="Copy endpoint URL"
              >
                {copied ? <Check className="size-3.5 text-primary" /> : <Copy className="size-3.5" />}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 1. Interactive Client Configuration Generator (with active key dropdown) */}
      <section className="space-y-3" id="mcp-client-guides">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
            Client Integration Generator
          </h2>
          <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary">
            Key Reactive
          </Badge>
        </div>
        <McpGuides />
      </section>

      {/* 2. Research Tools Directory & Schema Inspector */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
            Available Research Tools (5)
          </h2>
          <span className="text-[11px] text-muted-foreground">JSON-RPC 2.0 schemas</span>
        </div>
        <ResearchTools />
      </section>
    </div>
  );
}
