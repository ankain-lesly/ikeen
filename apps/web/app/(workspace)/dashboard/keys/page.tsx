"use client";

import * as React from "react";
import { Plus, Key, Shield, Zap } from "lucide-react";

import { useKeysStore } from "@/lib/stores/keys-store";
import { ApiKeysList } from "@/components/dashboard/api-keys-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function ApiKeysPage() {
  const { openCreate } = useKeysStore();

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border/40">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-heading font-medium tracking-tight text-foreground">
              API Keys Management
            </h1>
            <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary">
              SHA-256
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Generate and revoke secret API keys authorized to connect external agents to iKeen MCP.
          </p>
        </div>

        <Button onClick={openCreate} size="sm" className="gap-1.5 font-medium shadow-xs self-start sm:self-auto">
          <Plus className="size-4" />
          <span>Create New Key</span>
        </Button>
      </div>

      {/* Security & Quota Snapshot Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border bg-card/60">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="size-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <Shield className="size-4" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block">
                Security Standard
              </span>
              <span className="text-xs font-semibold text-foreground">
                One-Way Hashed (SHA-256)
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/60">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="size-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <Zap className="size-4" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block">
                Rate Limit Quota
              </span>
              <span className="text-xs font-semibold text-foreground">
                60 Requests / min
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/60">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="size-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <Key className="size-4" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block">
                Key Prefix Standard
              </span>
              <span className="text-xs font-mono font-semibold text-foreground">
                ikn_live_*
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Keys List Table / Cards */}
      <ApiKeysList />
    </div>
  );
}
