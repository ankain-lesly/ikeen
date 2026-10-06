"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Key, Sparkles, LogIn } from "lucide-react";

import { useAuthStore, useAuthHydration } from "@/lib/stores/auth-store";
import { useKeysStore } from "@/lib/stores/keys-store";

import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { ResearchTools } from "@/components/dashboard/research-tools";
import { McpGuides } from "@/components/dashboard/mcp-guides";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function PublicMcpShowcasePage() {
  const isHydrated = useAuthHydration();
  const { isAuthenticated } = useAuthStore();
  const { openAuth } = useKeysStore();

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 sm:px-6 py-8 sm:py-12 space-y-10">
      {/* 1. Hero Header & Live Ingestion Endpoint */}
      <DashboardHeader />

      {/* 2. Interactive Call-To-Action Banner */}
      <Card className="border-border bg-gradient-to-r from-card via-card/80 to-primary/5 shadow-xs">
        <CardContent className="p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-primary/30 text-primary text-[10px] font-mono">
                MCP Protocol Integration
              </Badge>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Sparkles className="size-3 text-primary" />
                Autonomous Research
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-heading font-medium tracking-tight text-foreground">
              Connect external AI agents to your knowledge base
            </h2>

            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Provision secret tokens to allow Claude Desktop, Cursor, Cline, or custom AI agents to query your local-first notes, search the live web, and synthesize structured research documents.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            {isHydrated && isAuthenticated ? (
              <Button
                size="default"
                render={
                  <Link href="/dashboard" className="flex items-center gap-2 font-medium">
                    <Key className="size-4" />
                    <span>Go to Dashboard</span>
                    <ArrowRight className="size-4" />
                  </Link>
                }
              />
            ) : (
              <Button
                size="default"
                onClick={() => openAuth("login")}
                className="gap-2 font-medium"
              >
                <LogIn className="size-4" />
                <span>Sign In to Generate API Key</span>
              </Button>
            )}

            {isHydrated && isAuthenticated && (
              <Button
                variant="outline"
                size="default"
                render={
                  <Link href="/dashboard/keys" className="flex items-center gap-1.5 text-xs">
                    <span>Manage Keys</span>
                  </Link>
                }
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* 3. Research Capabilities Directory */}
      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-heading font-medium text-foreground tracking-tight">
            Research Capabilities Directory
          </h2>
          <p className="text-xs text-muted-foreground">
            Explore the 5 specialized tool definitions exposed via iKeen MCP Streamable HTTP.
          </p>
        </div>
        <ResearchTools />
      </section>

      {/* 4. Client Setup Guides */}
      <section className="space-y-4" id="mcp-client-guides">
        <div className="space-y-1">
          <h2 className="text-lg font-heading font-medium text-foreground tracking-tight">
            Client Integration Guides
          </h2>
          <p className="text-xs text-muted-foreground">
            Copy plug-and-play configuration snippets for your preferred AI editor or environment.
          </p>
        </div>
        <McpGuides />
      </section>
    </div>
  );
}
