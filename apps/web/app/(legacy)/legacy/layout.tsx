import type { Metadata } from "next";
import Link from "next/link";
import { UserMenu } from "@/components/auth/user-menu";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export const metadata: Metadata = {
  title: {
    default: "Legacy Developer Portal",
    template: "%s · iKeen Legacy",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function LegacyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="border-b border-border bg-card/60 backdrop-blur-md sticky top-0 z-40">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 sm:px-6 py-3">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-sm font-heading font-medium tracking-tight flex items-center gap-2"
            >
              <span className="size-2 rounded-full bg-primary" />
              <span>iKeen</span>
            </Link>
            <span className="text-[11px] font-mono text-muted-foreground border-l border-border pl-3">
              Legacy Developer Portal
            </span>
          </div>
          <nav className="flex items-center gap-4 text-xs">
            <Link
              href="/legacy/dashboard"
              className="font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href="/legacy/mcp"
              className="font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              MCP Showcase
            </Link>
            <Link
              href="/app"
              className="font-medium text-primary hover:text-primary/80 transition-colors"
            >
              Workspace
            </Link>
            <div className="h-4 w-px bg-border/60" />
            <ThemeToggle />
            <UserMenu />
          </nav>
        </div>
      </header>
      <div className="flex-1 flex flex-col">{children}</div>
    </div>
  );
}
