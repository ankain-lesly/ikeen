export function PlatformsBento() {
  return (
    <section
      id="platforms"
      className="mx-auto w-full max-w-[1120px] px-6 py-24 sm:px-10 sm:py-28"
    >
      {/* Split section header */}
      <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
        <h2 className="max-w-xl font-heading text-[clamp(2rem,5vw,3.5rem)] font-bold leading-[1.02] tracking-[-0.03em] text-foreground">
          <span className="block">Built for every screen</span>
          <span className="block text-muted-foreground">you think on.</span>
        </h2>
        <p className="max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg">
          Start a note on your phone, refine it in the browser, and review it on
          your desktop—same block model, zero format drift.
        </p>
      </div>

      {/* Asymmetric bento grid */}
      <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* 1. Web Workspace (1.5fr -> 3 cols) */}
        <div className="flex flex-col justify-between overflow-hidden rounded-[2rem] border border-border bg-card p-8 lg:col-span-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-primary">
              Web Workspace
            </p>
            <h3 className="mt-2 font-heading text-2xl font-bold tracking-tight text-foreground">
              Instant access in any browser
            </h3>
            <p className="mt-2.5 max-w-lg text-sm leading-relaxed text-muted-foreground">
              Full notes, folders, block editing, and Scratchpad directly at{" "}
              <span className="font-mono text-foreground">/app</span>—backed by
              live server queries with zero setup.
            </p>
          </div>

          <div className="mt-8 rounded-2xl border border-border/80 bg-background p-5">
            <div className="flex items-center gap-1.5 pb-4">
              <span className="size-2.5 rounded-full bg-border" />
              <span className="size-2.5 rounded-full bg-border" />
              <span className="size-2.5 rounded-full bg-primary/70" />
              <span className="ml-2 font-mono text-[11px] text-muted-foreground">
                ikeen / app / notes
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="rounded-xl bg-card p-3 space-y-2 border border-border/60">
                <div className="font-medium text-foreground">All Notes</div>
                <div className="text-muted-foreground">Scratchpad</div>
                <div className="text-muted-foreground">Pinned</div>
                <div className="text-muted-foreground">Folders</div>
              </div>
              <div className="col-span-2 rounded-xl bg-card p-3 border border-border/60 space-y-2">
                <div className="font-heading font-semibold text-foreground">
                  Weekly Synthesis
                </div>
                <div className="h-2 w-5/6 rounded bg-secondary" />
                <div className="h-2 w-4/6 rounded bg-secondary" />
                <div className="pt-1 flex items-center gap-2 text-[11px] text-primary">
                  <span>✓ Shipped API schemas</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Mobile (1fr -> 2 cols) */}
        <div className="flex flex-col justify-between overflow-hidden rounded-[2rem] border border-border bg-secondary/60 p-8 lg:col-span-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Android & iOS
            </p>
            <h3 className="mt-2 font-heading text-2xl font-bold tracking-tight text-foreground">
              Local-first in your pocket
            </h3>
            <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
              Offline-resilient capture, share-sheet ingestion, voice & image
              blocks, and background delta sync when you reconnect.
            </p>
          </div>

          <div className="mt-8 mx-auto w-full max-w-[240px] rounded-t-3xl border border-b-0 border-border bg-background p-4 pb-6">
            <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-border" />
            <p className="font-heading text-sm font-bold text-foreground">
              Quick Capture
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              Shared link + 2 action items saved straight to Scratchpad.
            </p>
            <div className="mt-4 flex items-center gap-2">
              <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-[10px] font-semibold text-primary">
                Synced
              </span>
              <span className="text-[10px] text-muted-foreground">Just now</span>
            </div>
          </div>
        </div>

        {/* 3. Desktop (1.5fr -> 3 cols) */}
        <div className="flex flex-col justify-between gap-6 rounded-[2rem] border border-border bg-card p-8 sm:flex-row sm:items-center lg:col-span-3">
          <div className="max-w-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Desktop Client
            </p>
            <h3 className="mt-2 font-heading text-2xl font-bold tracking-tight text-foreground">
              Keyboard-first focus
            </h3>
            <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
              Lightweight native desktop companion with quick-capture HUD,
              markdown preview, and instant switching without leaving your flow.
            </p>
          </div>
          <div className="shrink-0 rounded-2xl border border-border bg-background p-4 font-mono text-xs space-y-2.5 min-w-[180px]">
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Quick Switch</span>
              <kbd className="rounded border border-border px-1.5 py-0.5 text-[10px] text-foreground">
                ⌘K
              </kbd>
            </div>
            <div className="flex items-center justify-between text-muted-foreground">
              <span>New Note</span>
              <kbd className="rounded border border-border px-1.5 py-0.5 text-[10px] text-foreground">
                ⌘N
              </kbd>
            </div>
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Sidebar</span>
              <kbd className="rounded border border-border px-1.5 py-0.5 text-[10px] text-foreground">
                ⌘\
              </kbd>
            </div>
          </div>
        </div>

        {/* 4. Cross-Device Sync (1fr -> 2 cols) */}
        <div className="flex flex-col justify-between rounded-[2rem] border border-border bg-card p-8 lg:col-span-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-primary">
              Unified Model
            </p>
            <h3 className="mt-2 font-heading text-2xl font-bold tracking-tight text-foreground">
              Blocks stay intact
            </h3>
            <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
              Text, checklists, bullet lists, and media attachments share one
              canonical schema across every platform.
            </p>
          </div>
          <div className="mt-6 flex items-center gap-2 text-xs font-mono text-muted-foreground">
            <span className="rounded-md border border-border bg-background px-2.5 py-1 text-foreground">
              text
            </span>
            <span className="rounded-md border border-border bg-background px-2.5 py-1 text-foreground">
              list
            </span>
            <span className="rounded-md border border-border bg-background px-2.5 py-1 text-foreground">
              media
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
