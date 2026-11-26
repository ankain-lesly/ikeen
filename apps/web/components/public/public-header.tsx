import Link from "next/link";
import { UserMenu } from "@/components/auth/user-menu";

const NAV_LINKS = [
  { label: "Why iKeen", href: "/#why" },
  { label: "Platforms", href: "/#platforms" },
  { label: "How it works", href: "/#how-it-works" },
  { label: "FAQ", href: "/#faq" },
  { label: "Download", href: "/download" },
] as const;

export function PublicHeader() {
  return (
    <header className="w-full">
      <div className="mx-auto flex w-full max-w-[1120px] items-center justify-between gap-6 px-6 py-6 sm:px-10">
        <Link
          href="/"
          className="flex items-center gap-2.5 font-heading text-lg font-bold tracking-tight text-foreground"
        >
          <span className="flex size-8 items-center justify-center rounded-[10px] bg-primary text-sm font-bold text-primary-foreground">
            iK
          </span>
          <span>iKeen</span>
        </Link>

        <nav
          aria-label="Primary"
          className="hidden items-center gap-7 md:flex"
        >
          {NAV_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden sm:block">
            <UserMenu />
          </div>
          <Link
            href="/app"
            className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Open Workspace
          </Link>
        </div>
      </div>
    </header>
  );
}
