import Link from "next/link";
import { UserMenu } from "@/components/auth/user-menu";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="border-b border-border bg-card/60 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 sm:px-6 py-3.5">
          <Link
            href="/"
            className="text-base font-heading font-medium tracking-tight flex items-center gap-2"
          >
            <span className="size-2 rounded-full bg-primary" />
            <span>iKeen</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link
              href="/app"
              className="text-xs font-medium text-foreground hover:text-primary transition-colors"
            >
              Workspace
            </Link>
            <Link
              href="/download"
              className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
            >
              Download
            </Link>
            <Link
              href="/privacy"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors hidden sm:inline"
            >
              Privacy
            </Link>
            <div className="h-4 w-px bg-border/60" />
            <UserMenu />
          </nav>
        </div>
      </header>
      <div className="flex-1 flex flex-col">{children}</div>
      <footer className="mt-auto border-t border-border bg-card/40">
        <div className="mx-auto flex w-full max-w-6xl justify-between items-center px-4 sm:px-6 py-4 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} iKeen</span>
          <div className="flex items-center gap-4">
            <Link href="/app" className="hover:text-foreground">
              Workspace
            </Link>
            <Link href="/download" className="hover:text-foreground">
              Download App
            </Link>
            <Link href="/privacy" className="hover:text-foreground">
              Privacy Policy
            </Link>
            <Link href="/legacy/mcp" className="hover:text-foreground">
              Legacy MCP
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
