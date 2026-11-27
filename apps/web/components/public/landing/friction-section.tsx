export function FrictionSection() {
  return (
    <section
      id="why"
      className="mt-20 w-full border-y border-border bg-card py-24 sm:mt-28 sm:py-28"
    >
      <div className="mx-auto w-full max-w-[1120px] px-6 sm:px-10">
        <h2 className="max-w-3xl font-heading text-[clamp(2.25rem,5.5vw,3.75rem)] font-bold leading-[1.02] tracking-[-0.03em] text-foreground">
          <span className="block">The thought is fast.</span>
          <span className="block text-muted-foreground">
            Most note apps are slow.
          </span>
        </h2>

        <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          Heavy nested menus, bloated toolbars, and locked-in formats get in the
          way of thinking. iKeen strips the path down to three calm steps.
        </p>

        <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3">
          {/* Card 1: Dashed friction contrast */}
          <div className="rounded-3xl border border-dashed border-border/90 bg-transparent p-8">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Without iKeen
            </p>
            <h3 className="mt-3 font-heading text-xl font-bold text-foreground">
              Scattered across tabs
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Ideas disappear into chat DMs, sticky files, and slow browser tabs
              while you wait for a workspace to load and pick a template.
            </p>
          </div>

          {/* Card 2: Solid primary focal solution */}
          <div className="rounded-3xl bg-primary p-8 text-primary-foreground">
            <p className="text-xs font-bold uppercase tracking-wider text-primary-foreground/75">
              Capture in iKeen
            </p>
            <h3 className="mt-3 font-heading text-xl font-bold">
              Write immediately
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-primary-foreground/85">
              Drop a quick thought into Scratchpad or open any note with
              markdown prose, checklists, and media blocks—zero ceremony.
            </p>
          </div>

          {/* Card 3: Subtle elevated resolution */}
          <div className="rounded-3xl border border-border/80 bg-secondary/70 p-8">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Organize later
            </p>
            <h3 className="mt-3 font-heading text-xl font-bold text-foreground">
              Structured on your terms
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Move notes into color-coded folders, pin what matters today,
              archive finished threads, and find anything instantly.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
