import Link from "next/link";

const FOOTER_COLUMNS = [
  {
    heading: "Product",
    links: [
      { label: "Web Workspace", href: "/app" },
      { label: "Why iKeen", href: "/#why" },
      { label: "How it works", href: "/#how-it-works" },
      { label: "FAQ", href: "/#faq" },
    ],
  },
  {
    heading: "Platforms",
    links: [
      { label: "Download Apps", href: "/download" },
      { label: "Android & iOS", href: "/download#mobile" },
      { label: "Desktop", href: "/download#desktop" },
    ],
  },
  {
    heading: "Developers",
    links: [
      { label: "AI & MCP Server", href: "/#agents" },
      { label: "MCP Showcase", href: "/legacy/mcp" },
      { label: "Legacy Dashboard", href: "/legacy/dashboard" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Delete Account", href: "/delete-account" },
    ],
  },
] as const;

export function PublicFooter() {
  return (
    <footer className="mt-auto w-full px-6 pb-12 sm:px-10">
      <div className="mx-auto w-full max-w-[1120px] border-t border-border pt-12">
        <div className="grid grid-cols-2 gap-x-8 gap-y-10 md:grid-cols-4">
          {FOOTER_COLUMNS.map((col) => (
            <div key={col.heading} className="space-y-3.5">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                {col.heading}
              </h3>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm font-medium text-foreground/90 transition-colors hover:text-primary"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <span>© {new Date().getFullYear()} iKeen · Built by TechForge</span>
          <span>Write everything. Keep it yours.</span>
        </div>
      </div>
    </footer>
  );
}
