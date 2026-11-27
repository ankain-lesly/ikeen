const FAQ_ITEMS = [
  {
    question: "How does the Web Workspace sync with Mobile and Desktop?",
    answer:
      "The Web Workspace reads and writes directly to your iKeen account via REST APIs using the exact same block codec as the Mobile and Desktop apps. Any edit you make in the browser appears on your devices on the next sync.",
  },
  {
    question: "What is the Scratchpad?",
    answer:
      "Scratchpad is a dedicated quick-capture note tagged with 'scratchpad' across all your devices. Use it for fleeting thoughts, links, or daily notes without creating dozens of untitled files.",
  },
  {
    question: "Are my notes private?",
    answer:
      "Yes. Your notes are scoped strictly to your authenticated account. We do not sell your data or train external models on your personal workspace. Read our Privacy Policy for full details.",
  },
  {
    question: "Can I connect Claude Desktop, Cursor, or other AI agents?",
    answer:
      "Yes. iKeen exposes a Model Context Protocol (MCP) server authenticated with scoped API keys. You can inspect available tools and connection guides in the MCP Showcase.",
  },
  {
    question: "Which platforms are supported?",
    answer:
      "iKeen runs on the Web at /app, natively on Android and iOS, and as a lightweight Windows desktop application.",
  },
] as const;

export function FaqSection() {
  return (
    <section
      id="faq"
      className="mx-auto w-full max-w-[1120px] px-6 pb-24 sm:px-10 sm:pb-28"
    >
      <h2 className="font-heading text-[clamp(2rem,5vw,3.5rem)] font-bold leading-[1.02] tracking-[-0.03em] text-foreground">
        <span>Questions, </span>
        <span className="text-muted-foreground">answered.</span>
      </h2>

      <div className="mt-10 divide-y divide-border border-y border-border">
        {FAQ_ITEMS.map((item, idx) => (
          <details
            key={item.question}
            open={idx === 0}
            className="group py-6"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-heading text-base font-bold text-foreground sm:text-lg [&::-webkit-details-marker]:hidden">
              <span>{item.question}</span>
              <span
                aria-hidden="true"
                className="shrink-0 font-mono text-2xl font-normal leading-none text-primary transition-transform duration-200 group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <p className="mt-3.5 max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              {item.answer}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
