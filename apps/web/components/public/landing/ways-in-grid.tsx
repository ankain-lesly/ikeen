const CAPABILITIES = [
  {
    title: "Structured Block Editor",
    description:
      "Compose notes from clean markdown text blocks, interactive lists, and media attachments that reorder effortlessly.",
  },
  {
    title: "Checklists & Lists",
    description:
      "Switch between checkboxes, bullets, and numbered lists with optional headers and footers for clear task tracking.",
  },
  {
    title: "Always-Ready Scratchpad",
    description:
      "One dedicated cross-device scratchpad note for fleeting ideas, snippets, and daily brain dumps—reachable in a click.",
  },
  {
    title: "Folders, Pins & Archive",
    description:
      "Group projects in color-coded folders, pin active references to the top, and archive completed work out of sight.",
  },
  {
    title: "Media Attachments",
    description:
      "Keep images, audio notes, and reference files right alongside your writing with synced cloud URLs.",
  },
  {
    title: "Instant Search & Filtering",
    description:
      "Filter by folder, pinned state, tags, or keywords without waiting on slow server round-trips or rigid hierarchies.",
  },
] as const;

export function WaysInGrid() {
  return (
    <section
      id="how-it-works"
      className="mx-auto w-full max-w-[1120px] px-6 pb-24 sm:px-10 sm:pb-28"
    >
      <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
        <h2 className="max-w-xl font-heading text-[clamp(2rem,5vw,3.5rem)] font-bold leading-[1.02] tracking-[-0.03em] text-foreground">
          <span className="block">However the thought</span>
          <span className="block text-muted-foreground">arrives.</span>
        </h2>
        <p className="max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg">
          A calm set of primitives designed to handle everything from a
          three-word reminder to a structured specification.
        </p>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {CAPABILITIES.map((item) => (
          <div
            key={item.title}
            className="rounded-3xl bg-card p-8 border border-border/60"
          >
            <h3 className="font-heading text-lg font-bold tracking-tight text-foreground">
              {item.title}
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {item.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
