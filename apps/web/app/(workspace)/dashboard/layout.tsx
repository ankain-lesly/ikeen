"use client";

import * as React from "react";

import { DashboardSidebar, DashboardMobileNav } from "@/components/dashboard/dashboard-sidebar";
import { CreateKeySheet } from "@/components/dashboard/create-key-sheet";
import { KeyRevealDialog } from "@/components/dashboard/key-reveal-dialog";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background text-foreground">
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
