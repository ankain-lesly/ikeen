import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function ClosingCta() {
  return (
    <section className="mx-auto w-full max-w-[1120px] px-6 pt-4 pb-24 sm:px-10 sm:pb-28">
      <div className="flex flex-col items-center text-center">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-primary font-heading text-2xl font-bold text-primary-foreground">
          iK
        </div>

        <h2 className="mt-6 font-heading text-[clamp(2.5rem,6.5vw,4.25rem)] font-bold leading-[0.98] tracking-[-0.03em]">
          <span className="block text-foreground">Think clearly.</span>
          <span className="block text-primary">Keep it yours.</span>
        </h2>

        <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
          Available on the Web, Android, iOS, and Windows Desktop. Sign in once
          and pick up any note right where you left off.
        </p>

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
            Download Apps
          </Link>
        </div>
      </div>
    </section>
  );
}
