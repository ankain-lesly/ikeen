import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
      <p className="text-sm font-medium text-zinc-500">Android · iOS</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">
        Write everything. Keep it yours.
      </h1>
      <p className="mt-4 max-w-xl text-lg leading-7 text-zinc-600 dark:text-zinc-400">
        Eye Keen is a local-first notes app with folders, pins, and an optional
        AI agent. Notes live on your device; sign-in and sync are available when
        you want them.
      </p>
      <p className="mt-8 text-sm text-zinc-600 dark:text-zinc-400">
        Package ID{" "}
        <code className="rounded bg-black/6 px-1.5 py-0.5 font-mono text-xs dark:bg-white/10">
          com.techforgelee.ikeen
        </code>
      </p>
      <Link
        href="/privacy"
        className="mt-8 inline-flex h-11 items-center rounded-full bg-foreground px-5 text-sm font-medium text-background"
      >
        Privacy Policy
      </Link>
    </main>
  );
}
