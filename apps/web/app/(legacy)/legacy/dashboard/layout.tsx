"use client";

import * as React from "react";
import Link from "next/link";
import { LogIn, BookOpen, Key } from "lucide-react";

import { useAuthStore, useAuthHydration } from "@/lib/stores/auth-store";
import { useAuthUiStore } from "@/lib/stores/auth-ui-store";
import { DashboardSidebar, DashboardMobileNav } from "@/components/legacy/dashboard/dashboard-sidebar";
import { CreateKeySheet } from "@/components/legacy/dashboard/create-key-sheet";
import { KeyRevealDialog } from "@/components/legacy/dashboard/key-reveal-dialog";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isHydrated = useAuthHydration();
  const { isAuthenticated } = useAuthStore();
  const { openAuth } = useAuthUiStore();

  // 1. Loading / Hydration state
  if (!isHydrated) {
    return (
      <div className="flex-1 flex min-h-[calc(100vh-53px)]">
        {/* Desktop Sidebar Skeleton */}
        <aside className="w-64 border-r border-border bg-card/30 p-5 hidden md:flex flex-col justify-between shrink-0">
          <div className="space-y-4">
            <Skeleton className="h-8 w-36" />
            <Skeleton className="h-9 w-full" />
            <div className="space-y-2 pt-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          </div>
          <Skeleton className="h-12 w-full" />
        </aside>

        {/* Content Skeleton */}
        <main className="flex-1 p-6 sm:p-8 space-y-6 max-w-6xl">
          <Skeleton className="h-28 w-full rounded-xl" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
          <Skeleton className="h-64 w-full rounded-xl" />
        </main>
      </div>
    );
  }

  // 2. Unauthenticated Gate View
  if (!isAuthenticated) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 bg-gradient-to-b from-background to-card/30">
        <Card className="max-w-md w-full border-border bg-card/80 backdrop-blur-md shadow-lg">
          <CardContent className="pt-8 pb-8 px-6 text-center space-y-5">
            <div className="size-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mx-auto">
              <Key className="size-7" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-heading font-semibold text-foreground tracking-tight">
                Authentication Required
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                The iKeen Developer Dashboard and secret API key management require an active account session. Sign in to provision keys, view telemetry, and connect external AI agents.
              </p>
            </div>

            <div className="flex flex-col gap-2.5 pt-2">
              <Button
                onClick={() => openAuth("login")}
                size="default"
                className="w-full gap-2 font-medium"
              >
                <LogIn className="size-4" />
                <span>Sign In / Create Account</span>
              </Button>

              <Button
                variant="outline"
                size="default"
                render={
                  <Link href="/legacy/mcp" className="w-full flex items-center justify-center gap-2 text-xs">
                    <BookOpen className="size-3.5 text-primary" />
                    <span>Explore Public MCP Documentation</span>
                  </Link>
                }
              />
            </div>

            <div className="pt-2 border-t border-border/50 text-[11px] text-muted-foreground font-mono">
              MCP Protocol v2026-07-28 · Streamable HTTP
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 3. Authenticated Responsive Dashboard Shell
  return (
    <div className="flex-1 flex flex-col md:flex-row min-h-[calc(100vh-53px)] bg-background">
      {/* Desktop Left Sidebar */}
      <DashboardSidebar />

      {/* Mobile Top Navigation */}
      <DashboardMobileNav />

      {/* Main Content Viewport */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        {children}
      </main>

      {/* Global Dashboard Dialogs & Sheets */}
      <CreateKeySheet />
      <KeyRevealDialog />
    </div>
  );
}
