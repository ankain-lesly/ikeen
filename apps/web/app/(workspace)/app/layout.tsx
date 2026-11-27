"use client";

import * as React from "react";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";

export default function WorkspaceAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <WorkspaceShell>{children}</WorkspaceShell>;
}
