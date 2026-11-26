"use client";

import * as React from "react";
import { WorkspaceHeader } from "./workspace-header";
import { WorkspaceMobileNav, WorkspaceSidebar } from "./workspace-sidebar";
import { QuickSwitcher } from "./quick-switcher";

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <WorkspaceHeader />
      <div className="flex-1 flex flex-col md:flex-row min-h-[calc(100vh-53px)]">
        <WorkspaceSidebar />
        <WorkspaceMobileNav />
        <main className="flex-1 min-w-0">{children}</main>
      </div>
      <QuickSwitcher />
    </div>
  );
}
