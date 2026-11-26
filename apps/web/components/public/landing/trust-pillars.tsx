const PILLARS = [
  {
    title: "Your notes, your ownership",
    body: "Clean markdown and structured JSON blocks—never trapped inside proprietary page trees or locked formats.",
  },
  {
    title: "Native apps, instant web",
    body: "Use native mobile and desktop apps when you want offline speed, or sign in on the web from any machine.",
  },
  {
    title: "Built for focus, zero bloat",
    body: "No noisy badges, no feed algorithms, and no cluttered dashboards competing with your writing canvas.",
  },
] as const;

export function TrustPillars() {
  return (
    <section className="mx-auto w-full max-w-[1120px] px-6 pb-24 sm:px-10 sm:pb-28">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        {PILLARS.map((pillar) => (
          <div key={pillar.title} className="space-y-2.5">
            <h3 className="font-heading text-lg font-bold tracking-tight text-foreground">
              {pillar.title}
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {pillar.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
