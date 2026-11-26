"use client";

import * as React from "react";
import Link from "next/link";
import { LogIn, ArrowLeft, FileText } from "lucide-react";

import { useAuthStore, useAuthHydration } from "@/lib/stores/auth-store";
import { useAuthUiStore } from "@/lib/stores/auth-ui-store";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isHydrated = useAuthHydration();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const openAuth = useAuthUiStore((s) => s.openAuth);

  if (!isHydrated) {
    return (
      <div className="min-h-screen flex bg-background">
        <aside className="w-60 border-r border-border p-4 hidden md:flex flex-col gap-3">
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </aside>
        <main className="flex-1 p-6 space-y-4">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </main>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="max-w-sm w-full rounded-xl border border-border bg-card p-6 text-center space-y-5">
          <div className="size-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mx-auto">
            <FileText className="size-6" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-lg font-heading font-semibold tracking-tight text-foreground">
              Sign in to iKeen Workspace
            </h1>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Access your synced notes, folders, and scratchpad from the web.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Button
              onClick={() => openAuth("login")}
              className="w-full gap-2 font-medium"
            >
              <LogIn className="size-4" />
              <span>Sign In / Create Account</span>
            </Button>
            <Button
              variant="ghost"
              render={
                <Link
                  href="/"
                  className="w-full flex items-center justify-center gap-1.5 text-xs text-muted-foreground"
                >
                  <ArrowLeft className="size-3.5" />
                  <span>Back to Home</span>
                </Link>
              }
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {children}
    </div>
  );
}
