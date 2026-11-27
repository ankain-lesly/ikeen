"use client";

import * as React from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  CopyPlus,
  ExternalLink,
  Lock,
  Smartphone,
} from "lucide-react";

import type { PublicSharedNote } from "@repo/types/shares";
import {
  useForkShare,
  usePublicShare,
  useUnlockPublicShare,
  type PublicShareResult,
} from "@/lib/api/shares.api";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useAuthUiStore } from "@/lib/stores/auth-ui-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SharedNoteBlocks } from "./shared-note-blocks";

interface SharedNoteViewProps {
  slug: string;
  initialState: PublicShareResult;
}

function getStorageKey(slug: string): string {
  return `ikeen:share-token:${slug}`;
}

type CopyFeedback =
  | { type: "success"; noteId: string; title: string }
  | { type: "auth" }
  | { type: "error"; message: string }
  | null;

export function SharedNoteView({ slug, initialState }: SharedNoteViewProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const openAuth = useAuthUiStore((s) => s.openAuth);
  const forkShare = useForkShare();
  const unlockShare = useUnlockPublicShare(slug);

  const [shareToken, setShareToken] = React.useState<string | undefined>(() => {
    if (typeof window === "undefined" || initialState.status !== "locked") {
      return undefined;
    }
    return window.sessionStorage.getItem(getStorageKey(slug)) ?? undefined;
  });
  const [password, setPassword] = React.useState("");
  const [unlockError, setUnlockError] = React.useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = React.useState<CopyFeedback>(null);

  const unlockedQuery = usePublicShare(
    slug,
    shareToken,
    initialState.status === "locked",
  );

  // If a cached session token is stale/expired, clear it from sessionStorage
  React.useEffect(() => {
    if (unlockedQuery.isError && shareToken) {
      window.sessionStorage.removeItem(getStorageKey(slug));
    }
  }, [unlockedQuery.isError, shareToken, slug]);

  const state: PublicShareResult = unlockedQuery.data
    ? { status: "ok", data: unlockedQuery.data }
    : initialState;

  const isUnlocking =
    unlockShare.isPending ||
    (initialState.status === "locked" &&
      Boolean(shareToken) &&
      unlockedQuery.isPending);

  function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    if (!password.trim()) return;

    setUnlockError(null);
    unlockShare.mutate(password, {
      onSuccess: ({ token }) => {
        window.sessionStorage.setItem(getStorageKey(slug), token);
        setShareToken(token);
        setPassword("");
      },
      onError: () => {
        setUnlockError("Incorrect passcode. Please try again.");
      },
    });
  }

  function handleFork(note: PublicSharedNote) {
    setCopyFeedback(null);

    if (!isAuthenticated) {
      setCopyFeedback({ type: "auth" });
      openAuth("login");
      return;
    }

    forkShare.mutate(
      { slug: note.slug, shareToken },
      {
        onSuccess: (res) => {
          setCopyFeedback({
            type: "success",
            noteId: res.noteId,
            title: res.title || note.title || "Untitled",
          });
          toast.success("Saved to your iKeen workspace");
        },
        onError: (err: unknown) => {
          const response =
            typeof err === "object" && err !== null && "response" in err
              ? (err as {
                  response?: { status?: number; data?: { message?: string } };
                }).response
              : undefined;

          if (response?.status === 403) {
            setCopyFeedback({
              type: "error",
              message:
                "The author has disabled saving copies of this shared note.",
            });
            return;
          }

          const message =
            typeof response?.data?.message === "string"
              ? response.data.message
              : "Could not save a copy of this note. Please try again.";
          setCopyFeedback({ type: "error", message });
        },
      },
    );
  }

  if (state.status === "not_found") {
    return (
      <div className="mx-auto max-w-lg px-6 py-24 text-center space-y-4">
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          Shared note unavailable
        </h1>
        <p className="text-sm text-muted-foreground">
          This link may have expired, been rotated, or been revoked by its
          owner.
        </p>
        <div className="pt-2">
          <Button variant="outline" render={<Link href="/" />}>
            Back to iKeen
          </Button>
        </div>
      </div>
    );
  }

  if (state.status === "locked") {
    return (
      <div className="mx-auto max-w-md px-6 py-24 space-y-6">
        <div className="space-y-2 text-center">
          <div className="mx-auto flex size-10 items-center justify-center rounded-full border border-border bg-muted/40">
            <Lock className="size-4 text-primary" />
          </div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">
            Protected note
          </h1>
          <p className="text-sm text-muted-foreground">
            Enter the passcode shared by the author to view this note.
          </p>
        </div>

        <form onSubmit={handleUnlock} className="space-y-3">
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter passcode…"
            autoFocus
            disabled={isUnlocking}
          />
          {unlockError && (
            <p className="text-xs text-destructive">{unlockError}</p>
          )}
          <Button
            type="submit"
            className="w-full"
            disabled={isUnlocking || !password.trim()}
          >
            {isUnlocking ? "Unlocking…" : "Unlock note"}
          </Button>
        </form>
      </div>
    );
  }

  const note = state.data;

  return (
    <article className="mx-auto max-w-3xl px-6 py-12 sm:py-16 space-y-8">
      {/* Meta & Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-5">
        <div className="space-y-0.5">
          <p className="text-xs font-medium text-foreground">
            {note.author.firstName}{" "}
            <span className="text-muted-foreground font-normal">
              @{note.author.username}
            </span>
          </p>
          <p className="text-[11px] text-muted-foreground">
            Updated{" "}
            {new Date(note.updatedAt).toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            render={<a href={`ikeen://s/${note.slug}`} />}
          >
            <Smartphone className="size-3.5" />
            <span>Open in App</span>
          </Button>

          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => handleFork(note)}
            disabled={forkShare.isPending}
          >
            <CopyPlus className="size-3.5" />
            <span>
              {forkShare.isPending ? "Saving…" : "Save Copy"}
            </span>
          </Button>
        </div>
      </div>

      {/* Copy Result Banner (shown only after a copy response) */}
      {copyFeedback?.type === "success" && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-xs"
        >
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
            <div className="space-y-0.5">
              <p className="font-medium text-foreground">
                Saved to your workspace
              </p>
              <p className="text-muted-foreground">
                &ldquo;{copyFeedback.title}&rdquo; has been copied to your
                notes.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs"
            render={<Link href={`/app/notes/${copyFeedback.noteId}`} />}
          >
            <span>Open note</span>
            <ArrowRight className="size-3.5" />
          </Button>
        </div>
      )}

      {copyFeedback?.type === "auth" && (
        <div
          role="status"
          className="flex items-start gap-2.5 rounded-xl border border-border/70 bg-muted/30 px-4 py-3 text-xs text-muted-foreground"
        >
          <Lock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div className="space-y-0.5">
            <p className="font-medium text-foreground">Sign in required</p>
            <p>Sign in to save a copy of this note to your workspace.</p>
          </div>
        </div>
      )}

      {copyFeedback?.type === "error" && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-xs text-destructive"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <div className="space-y-0.5">
            <p className="font-medium">Could not save copy</p>
            <p className="text-destructive/90">{copyFeedback.message}</p>
          </div>
        </div>
      )}

      {/* Title & Tags */}
      <header className="space-y-3">
        <h1 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
          {note.title || "Untitled"}
        </h1>
        {note.tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {note.tags.map((tag) => (
              <span key={tag} className="font-mono">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </header>

      {/* Body Content + Formatted Blocks */}
      {note.content?.trim() ? (
        <div className="whitespace-pre-wrap text-[15px] leading-relaxed text-foreground/95">
          {note.content}
        </div>
      ) : null}

      <SharedNoteBlocks
        blocks={note.blocks}
        hideEmptyFallback={Boolean(note.content?.trim())}
      />

      {/* Subtle Footer CTA */}
      <div className="border-t border-border/60 pt-6 flex items-center justify-between text-xs text-muted-foreground">
        <span>Shared via iKeen</span>
        <Link
          href="/app"
          className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
        >
          <span>Open Workspace</span>
          <ExternalLink className="size-3" />
        </Link>
      </div>
    </article>
  );
}
