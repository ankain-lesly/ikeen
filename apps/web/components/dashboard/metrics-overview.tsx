"use client";

import * as React from "react";
import { Key, Wrench, Activity, ShieldCheck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { fetchKeysApi } from "@/lib/api/keys.api";
import { fetchMcpToolsApi } from "@/lib/api/mcp.api";
import { useAuthStore } from "@/lib/stores/auth-store";

interface MetricsOverviewProps {
  activeKeysCount?: number;
}

export function MetricsOverview({ activeKeysCount }: MetricsOverviewProps) {
  const { isAuthenticated } = useAuthStore();

  const { data: keys = [] } = useQuery({
    queryKey: ["api-keys"],
    queryFn: fetchKeysApi,
    enabled: isAuthenticated,
  });

  const { data: tools = [] } = useQuery({
    queryKey: ["mcp-tools"],
    queryFn: fetchMcpToolsApi,
  });

  const count = typeof activeKeysCount === "number" ? activeKeysCount : keys.length;
  const toolsCount = tools.length > 0 ? tools.length.toString() : "11";

  const metrics = [
    {
      title: "Active Secret Keys",
      value: count.toString(),
      description: "Provisioned for external agents",
      icon: Key,
    },
    {
      title: "Available Tools",
      value: toolsCount,
      description: "Notes & folder operations",
      icon: Wrench,
    },
    {
      title: "Protocol Standard",
      value: "2026-07-28",
      description: "Stateless Streamable HTTP",
      icon: Activity,
    },
    {
      title: "Key Protection",
      value: "SHA-256",
      description: "Zero plaintext database storage",
      icon: ShieldCheck,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((item) => {
        const Icon = item.icon;
        return (
          <Card key={item.title} size="sm" className="bg-card/70 border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                {item.title}
              </CardTitle>
              <Icon className="size-4 text-primary" />
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="text-2xl font-bold font-mono text-foreground">{item.value}</div>
              <p className="text-[11px] text-muted-foreground">{item.description}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
