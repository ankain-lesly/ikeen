"use client";

import * as React from "react";
import toast from "react-hot-toast";
import { Copy, Check, Radio, Terminal } from "lucide-react";
import { xenv } from "@/lib/env.client";
import { Button } from "@/components/ui/button";

export function DashboardHeader() {
  const [copied, setCopied] = React.useState(false);
  const endpointUrl = `${xenv.NEXT_PUBLIC_API_URL}/mcp`;

  function copyEndpoint() {
    navigator.clipboard.writeText(endpointUrl);
    setCopied(true);
    toast.success("MCP endpoint copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card p-6 sm:p-8">
      {/* Background glow accent */}
      <div className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full bg-primary/10 blur-3xl" />

      <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Radio className="size-3 animate-pulse text-primary" />
            <span className="font-mono">Streamable HTTP (2026-07-28) · Ready</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-heading font-medium tracking-tight text-foreground">
            iKeen Research MCP & API Keys
          </h1>

          <p className="text-sm leading-relaxed text-muted-foreground">
            Connect external AI agents (such as Claude Desktop, Cursor, and Cline) directly to your
            iKeen second brain and web research engine.
          </p>
        </div>

        {/* Endpoint Chip */}
        <div className="flex flex-col gap-1.5 self-start md:self-auto min-w-[280px]">
          <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">
            Server Ingestion Endpoint
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
  );
}
