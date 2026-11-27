import Link from "next/link";
import { ArrowRight, CheckSquare, Folder, Pin, StickyNote } from "lucide-react";

export function HeroSection() {
  return (
    <section className="mx-auto w-full max-w-[1120px] px-6 pt-12 pb-6 sm:px-10 sm:pt-16">
      <div className="flex flex-col items-center text-center">
        {/* Announcement pill */}
        <Link
          href="/app"
          className="group inline-flex items-center gap-2.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/40"
        >
          <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold text-primary-foreground">
            New
          </span>
          <span>iKeen Web Workspace is live</span>
          <ArrowRight className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
        </Link>

        {/* Two-tone stacked display H1 */}
        <h1 className="mt-7 font-heading text-[clamp(3rem,8.5vw,6.25rem)] font-bold leading-[0.95] tracking-[-0.035em] text-foreground">
          <span className="block">Write everything.</span>
          <span className="block text-muted-foreground">Keep it yours.</span>
        </h1>

        {/* Sub-headline & body */}
        <p className="mt-7 max-w-2xl font-heading text-[clamp(1.35rem,3vw,2rem)] font-bold leading-snug tracking-tight text-foreground">
          <span className="text-primary">One workspace</span> to capture
          thoughts, structure blocks, and stay synced everywhere.
        </p>

        <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          iKeen brings together fast note-taking, structured lists, folders, and
          an always-ready scratchpad across Web, Mobile, and Desktop—without
          visual clutter.
        </p>

        {/* Dual Pill CTAs */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
          <Link
            href="/app"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
          >
            <span>Open Web Workspace</span>
            <ArrowRight className="size-4" />
          </Link>
          <Link
            href="/download"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-7 py-3.5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
          >
            Download Mobile & Desktop
          </Link>
        </div>

        {/* Composite 3-surface workspace preview */}
        <div className="mt-14 grid w-full grid-cols-1 gap-4 text-left md:grid-cols-12">
          {/* Left surface: Scratchpad */}
          <div className="rounded-3xl border border-border bg-card p-6 md:col-span-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                  <StickyNote className="size-3.5 text-primary" />
                  Scratchpad
                </span>
                <span className="font-mono text-[11px]">#scratchpad</span>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-foreground/90">
                Draft Q4 architecture decisions before standup. Keep web client
                server-first with strict schema checks.
              </p>
            </div>
            <div className="mt-6 flex items-center justify-between border-t border-border/60 pt-3 text-[11px] text-muted-foreground">
              <span>Synced across 3 devices</span>
              <span className="size-1.5 rounded-full bg-primary" />
            </div>
          </div>

          {/* Center focal surface: Web Block Editor */}
          <div className="rounded-3xl border border-primary/30 bg-card p-6 sm:p-7 md:col-span-6 shadow-[0_0_50px_rgba(57,255,20,0.05)]">
            <div className="flex items-center justify-between border-b border-border/70 pb-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Folder className="size-3.5 text-primary" />
                <span>Product Roadmap</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1 text-primary">
                  <Pin className="size-3" /> Pinned
                </span>
                <span>Saved</span>
              </div>
            </div>

            <h2 className="mt-5 font-heading text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Web Workspace Launch Notes
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Unified block model shared between mobile, desktop, and web so
              markdown prose and checklists stay intact everywhere.
            </p>

            <div className="mt-5 space-y-2.5 rounded-2xl bg-background/70 p-4 border border-border/60">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <CheckSquare className="size-3.5 text-primary" />
                <span>Release Checklist</span>
              </div>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2.5 text-muted-foreground line-through">
                  <span className="flex size-4 items-center justify-center rounded bg-primary/20 text-[10px] text-primary">
                    ✓
                  </span>
                  REST block endpoints & Zod validation
                </li>
                <li className="flex items-center gap-2.5 text-foreground">
                  <span className="size-4 rounded border border-border" />
                  Notes, Folders & Scratchpad workspace
                </li>
                <li className="flex items-center gap-2.5 text-foreground">
                  <span className="size-4 rounded border border-border" />
                  Media block previews & uploads
                </li>
              </ul>
            </div>
          </div>

          {/* Right surface: Folders & Pinned Index */}
          <div className="rounded-3xl border border-border bg-card p-6 md:col-span-3 flex flex-col justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Folders
              </p>
              <ul className="mt-4 space-y-2.5 text-sm">
                <li className="flex items-center justify-between text-foreground">
                  <span className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-primary" />
                    Product
                  </span>
                  <span className="text-xs text-muted-foreground">14</span>
                </li>
                <li className="flex items-center justify-between text-foreground">
                  <span className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-sky-400" />
                    Engineering
                  </span>
                  <span className="text-xs text-muted-foreground">23</span>
                </li>
                <li className="flex items-center justify-between text-foreground">
                  <span className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-amber-400" />
                    Personal
                  </span>
                  <span className="text-xs text-muted-foreground">9</span>
                </li>
              </ul>
            </div>
            <div className="mt-6 border-t border-border/60 pt-3 text-xs text-muted-foreground">
              #roadmap · #research · #daily
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
