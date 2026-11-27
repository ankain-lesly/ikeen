import type { Metadata } from "next";
import { WorkspaceAuthGate } from "@/components/workspace/workspace-auth-gate";

export const metadata: Metadata = {
  title: {
    default: "Workspace",
    template: "%s · iKeen Workspace",
  },
  description: "Your personal iKeen notes, folders, scratchpad, and developer dashboard.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function WorkspaceGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <WorkspaceAuthGate>{children}</WorkspaceAuthGate>;
}
