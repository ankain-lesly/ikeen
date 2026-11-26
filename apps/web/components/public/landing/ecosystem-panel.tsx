import Link from "next/link";
import { ArrowRight } from "lucide-react";

const SURFACES = [
  { name: "Web Workspace", detail: "Direct browser editing at /app" },
  { name: "Android App", detail: "Offline-first with share target" },
  { name: "iOS App", detail: "Native feel & background sync" },
  { name: "Windows Desktop", detail: "Keyboard-first native companion" },
  { name: "Scratchpad", detail: "Canonical cross-device inbox" },
  { name: "MCP Protocol", detail: "Connect Claude, Cursor & agents" },
] as const;

export function EcosystemPanel() {
  return (
    <section className="mx-auto w-full max-w-[1120px] px-6 pb-24 sm:px-10 sm:pb-28">
      <div className="rounded-[2.5rem] border border-border bg-card p-8 sm:p-14">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <h2 className="max-w-xl font-heading text-[clamp(2rem,4.8vw,3.25rem)] font-bold leading-[1.03] tracking-[-0.03em] text-foreground">
            <span className="block">Write once.</span>
            <span className="block text-muted-foreground">
              Reach it everywhere.
            </span>
          </h2>
          <p className="max-w-md text-base leading-relaxed text-muted-foreground">
            Every surface talks to the same clean data model—whether you are
            typing in a browser, tapping on mobile, or querying notes from an AI
            agent.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {SURFACES.map((surface) => (
            <div
              key={surface.name}
              className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/70 px-5 py-4"
            >
              <div>
                <p className="font-heading text-sm font-bold text-foreground">
                  {surface.name}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {surface.detail}
                </p>
              </div>
              <span className="size-2 shrink-0 rounded-full bg-primary/80" />
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-border/60 pt-6">
          <Link
            href="/download"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
          >
            <span>Explore all downloads</span>
            <ArrowRight className="size-4" />
          </Link>
          <span className="text-xs text-muted-foreground">
            Same account across Web, Mobile, and Desktop.
          </span>
        </div>
      </div>
    </section>
  );
}
