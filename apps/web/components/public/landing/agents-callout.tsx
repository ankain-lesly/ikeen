"use client";

import * as React from "react";
import Link from "next/link";
import { Check, Copy, Terminal } from "lucide-react";
import { xenv } from "@/lib/env.client";

const MCP_ENDPOINT = `${xenv.NEXT_PUBLIC_API_URL.replace(/\/$/, "")}/mcp`;

const MCP_SNIPPET = `{
  "mcpServers": {
    "ikeen": {
      "url": "${MCP_ENDPOINT}",
      "headers": {
        "Authorization": "Bearer YOUR_IKEEN_API_KEY"
      }
    }
  }
}`;

export function AgentsCallout() {
  const [copied, setCopied] = React.useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(MCP_SNIPPET);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section
      id="agents"
      className="mx-auto w-full max-w-[1120px] px-6 pb-24 sm:px-10 sm:pb-28"
    >
      <div className="grid grid-cols-1 gap-10 border-2 border-border bg-card p-8 sm:p-12 lg:grid-cols-2 lg:items-center">
        {/* Left column: retro-monospace narrative */}
        <div className="space-y-5">
          <div className="inline-flex items-center gap-2 border border-primary/40 bg-background px-3 py-1 font-mono text-xs text-primary">
            <Terminal className="size-3.5" />
            <span>MCP_SERVER :: STREAMABLE_HTTP</span>
          </div>

          <h2 className="font-mono text-[clamp(1.75rem,3.5vw,2.6rem)] font-bold leading-tight tracking-tight text-foreground">
            iKeen for agents.
          </h2>

          <p className="font-mono text-sm leading-relaxed text-muted-foreground">
            Give Claude Desktop, Cursor, or your own CLI agents structured read
            and write access to your notes and folders over the Model Context
            Protocol—secured with revocable API keys.
          </p>

          <div className="pt-1">
            <Link
              href="/mcp"
              className="font-mono text-sm font-semibold text-primary underline underline-offset-4 hover:opacity-80"
            >
              Explore MCP Showcase →
            </Link>
          </div>
        </div>

        {/* Right column: sharp neo-brutalist console box */}
        <div className="border-2 border-primary/50 bg-background shadow-[6px_6px_0_rgba(57,255,20,0.22)]">
          <div className="flex items-center justify-between border-b border-border bg-card px-4 py-2.5 font-mono text-xs text-muted-foreground">
            <span>iKeen &gt; your-agent.json</span>
            <span>MCP</span>
          </div>

          <div className="p-5 space-y-4">
            <p className="font-mono text-xs text-foreground">
              Drop this into your MCP client config to connect your workspace:
            </p>

            <details open className="group">
              <summary className="cursor-pointer font-mono text-xs text-primary hover:underline">
                View config snippet
              </summary>
              <pre className="mt-3 overflow-x-auto border border-border bg-card p-3.5 font-mono text-xs leading-relaxed text-foreground/90">
                <code>{MCP_SNIPPET}</code>
              </pre>
            </details>

            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-2 border-2 border-primary bg-primary px-4 py-2 font-mono text-xs font-bold text-primary-foreground shadow-[3px_3px_0_rgba(255,255,255,0.2)] transition-transform active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="size-3.5" />
                  <span>Copied config</span>
                </>
              ) : (
                <>
                  <Copy className="size-3.5" />
                  <span>Copy config</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
