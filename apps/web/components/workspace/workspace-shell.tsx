"use client";

import * as React from "react";
import { WorkspaceHeader } from "./workspace-header";
import { WorkspaceMobileNav, WorkspaceSidebar } from "./workspace-sidebar";
import { QuickSwitcher } from "./quick-switcher";

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* Full-height sticky desktop sidebar */}
      <WorkspaceSidebar />

      {/* Right column: header + mobile nav + scrollable content */}
      <div className="flex-1 min-w-0 flex flex-col">
        <WorkspaceHeader />
        <WorkspaceMobileNav />
        <main className="flex-1 min-w-0">{children}</main>
      </div>

      <QuickSwitcher />
    </div>
  );
}
