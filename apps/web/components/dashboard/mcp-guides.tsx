"use client";

import * as React from "react";
import toast from "react-hot-toast";
import { useQuery } from "@tanstack/react-query";
import { Copy, Check, Terminal, Laptop, Code2, Sparkles } from "lucide-react";
import { xenv } from "@/lib/env.client";
import { useKeysStore, type ClientGuideTab } from "@/lib/stores/keys-store";
import { fetchKeysApi } from "@/lib/api/keys.api";
import { useAuthStore } from "@/lib/stores/auth-store";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

export function McpGuides() {
  const {
    activeGuideTab,
    setActiveGuideTab,
    selectedKeyPrefix,
    setSelectedKeyPrefix,
    activeSnippetKey,
  } = useKeysStore();

  const { isAuthenticated } = useAuthStore();
  const [copied, setCopied] = React.useState(false);

  const { data: keys = [] } = useQuery({
    queryKey: ["api-keys"],
    queryFn: fetchKeysApi,
    enabled: isAuthenticated,
  });

  const endpointUrl = `${xenv.NEXT_PUBLIC_API_URL}/mcp`;

  // Compute key to display: prioritized full secret > prefix > placeholder
  const keyDisplay = activeSnippetKey
    ? activeSnippetKey
    : selectedKeyPrefix
    ? `${selectedKeyPrefix}...`
    : "ikn_live_YOUR_SECRET_KEY";

  const configs: Record<
    ClientGuideTab,
    { title: string; filename: string; snippet: string; description: string }
  > = {
    claude: {
      title: "Claude Desktop",
      filename: "claude_desktop_config.json",
      description:
        "Add this server configuration to enable iKeen tools directly within your Claude Desktop chat sessions.",
      snippet: JSON.stringify(
        {
          mcpServers: {
            ikeen: {
              url: endpointUrl,
              headers: {
                "x-api-key": keyDisplay,
              },
            },
          },
        },
        null,
        2
      ),
    },
    cursor: {
      title: "Cursor IDE",
      filename: ".cursor/mcp.json",
      description:
        "Enable iKeen MCP tools inside Cursor Composer and Agent mode for contextual coding and research.",
      snippet: JSON.stringify(
        {
          mcpServers: {
            ikeen: {
              url: endpointUrl,
              headers: {
                "x-api-key": keyDisplay,
              },
            },
          },
        },
        null,
        2
      ),
    },
    cline: {
      title: "Cline & Windsurf",
      filename: "mcp_settings.json",
      description:
        "Paste into your VS Code extension settings (Cline, Continue, Roo Code) or Windsurf MCP config.",
      snippet: JSON.stringify(
        {
          mcpServers: {
            ikeen: {
              url: endpointUrl,
              headers: {
                "x-api-key": keyDisplay,
              },
            },
          },
        },
        null,
        2
      ),
    },
    curl: {
      title: "HTTP / cURL",
      filename: "Terminal probe",
      description:
        "Directly test your connection and list available tools via Streamable HTTP (stateless POST).",
      snippet: `curl -X POST ${endpointUrl} \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${keyDisplay}" \\
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'`,
    },
  };

  const current = configs[activeGuideTab];

  function handleCopy() {
    navigator.clipboard.writeText(current.snippet);
    setCopied(true);
    toast.success(`${current.title} configuration copied!`);
    setTimeout(() => setCopied(false), 2000);
  }

  const tabs: { id: ClientGuideTab; label: string; icon: React.ElementType }[] = [
    { id: "claude", label: "Claude Desktop", icon: Laptop },
    { id: "cursor", label: "Cursor IDE", icon: Code2 },
    { id: "cline", label: "Cline & Windsurf", icon: Sparkles },
    { id: "curl", label: "HTTP / cURL", icon: Terminal },
  ];

  return (
    <Card id="mcp-client-guides" className="border-border bg-card scroll-mt-8">
      <CardHeader className="border-b border-border/40 pb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base font-heading">Interactive Client Setup Guides</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Copy-paste configuration blocks pre-populated with your server endpoint and API key.
            </p>
          </div>

          {/* Key switcher dropdown if user has provisioned keys */}
          {keys.length > 0 && (
            <div className="flex items-center gap-2 self-start md:self-auto">
              <span className="text-xs text-muted-foreground whitespace-nowrap">Inject Key:</span>
              <Select
                value={selectedKeyPrefix || keys[0]?.keyPrefix || ""}
                onValueChange={(prefix) => setSelectedKeyPrefix(prefix)}
              >
                <SelectTrigger size="sm" className="min-w-44 font-mono text-xs">
                  <SelectValue placeholder="Select Key" />
                </SelectTrigger>
                <SelectContent>
                  {keys.map((k) => (
                    <SelectItem key={k.id} value={k.keyPrefix}>
                      <span className="font-sans mr-1">{k.name}</span>
                      <span className="text-muted-foreground font-mono">({k.keyPrefix})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Tab Selector */}
        <div className="flex flex-wrap gap-1.5 pt-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeGuideTab === tab.id;
            return (
              <Button
                key={tab.id}
                variant={isActive ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveGuideTab(tab.id)}
                className={`text-xs gap-1.5 ${
                  isActive
                    ? "bg-primary text-primary-foreground font-medium"
                    : "text-muted-foreground"
                }`}
              >
                <Icon className="size-3.5" />
                <span>{tab.label}</span>
              </Button>
            );
          })}
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <p className="text-muted-foreground">{current.description}</p>
          <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5 shrink-0">
            {copied ? <Check className="size-3.5 text-primary" /> : <Copy className="size-3.5" />}
            <span>{copied ? "Copied" : "Copy Snippet"}</span>
          </Button>
        </div>

        <div className="relative rounded-lg border border-border bg-surface-raised overflow-hidden">
          <div className="flex items-center justify-between px-3 py-1.5 bg-muted/20 border-b border-border text-[11px] font-mono text-muted-foreground">
            <span>{current.filename}</span>
            <span>JSON-RPC 2.0</span>
          </div>
          <ScrollArea className="max-h-72 p-4">
            <pre className="font-mono text-xs text-foreground/90 leading-relaxed overflow-x-auto">
              {current.snippet}
            </pre>
          </ScrollArea>
        </div>

        {activeGuideTab === "claude" && (
          <div className="rounded-lg border border-border/50 bg-muted/10 p-3 text-[11px] text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">File Location Reference:</p>
            <p>
              • macOS:{" "}
              <code className="font-mono text-[10px] text-primary">
                ~/Library/Application Support/Claude/claude_desktop_config.json
              </code>
            </p>
            <p>
              • Windows:{" "}
              <code className="font-mono text-[10px] text-primary">
                %APPDATA%\Claude\claude_desktop_config.json
              </code>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
