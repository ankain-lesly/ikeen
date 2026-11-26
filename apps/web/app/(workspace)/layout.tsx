import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Workspace",
    template: "%s · iKeen Workspace",
  },
  description: "Your personal iKeen notes, folders, and scratchpad workspace.",
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
  return children;
}
