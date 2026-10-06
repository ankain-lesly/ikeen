"use client";

import * as React from "react";
import toast from "react-hot-toast";
import {
  Copy,
  Check,
  AlertTriangle,
  Eye,
  EyeOff,
  ShieldAlert,
  ArrowDownRight,
} from "lucide-react";

import { useKeysStore } from "@/lib/stores/keys-store";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

interface KeyRevealContentProps {
  revealedKey: {
    name: string;
    fullKey: string;
    keyPrefix: string;
  };
  onClose: () => void;
}

function KeyRevealContent({ revealedKey, onClose }: KeyRevealContentProps) {
  const { setSelectedKeyPrefix, setActiveSnippetKey } = useKeysStore();
  const [copied, setCopied] = React.useState(false);
  const [isMasked, setIsMasked] = React.useState(false);
  const [warnUncopied, setWarnUncopied] = React.useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(revealedKey.fullKey);
    setCopied(true);
    setWarnUncopied(false);
    toast.success("Secret API key copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  }

  function handleAttemptClose() {
    if (!copied && !warnUncopied) {
      setWarnUncopied(true);
      return;
    }
    onClose();
  }

  function handleConfigureClient() {
    setSelectedKeyPrefix(revealedKey.keyPrefix);
    setActiveSnippetKey(revealedKey.fullKey);
    onClose();

    const el = document.getElementById("mcp-client-guides");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  }

  return (
    <>
      <SheetHeader className="text-left space-y-2 pb-4 border-b border-border/50">
        <div className="flex items-center gap-2 text-destructive font-mono text-xs uppercase tracking-wider">
          <AlertTriangle className="size-4 text-destructive" />
          <span>One-Time Secret Reveal</span>
        </div>
        <SheetTitle className="text-xl font-heading tracking-tight">
          Key Generated: {revealedKey.name}
        </SheetTitle>
        <SheetDescription className="text-xs text-muted-foreground">
          Please copy this secret key now. For your security, it will{" "}
          <span className="text-destructive font-medium">never be displayed again</span>.
        </SheetDescription>
      </SheetHeader>

      <div className="my-6 space-y-4">
        {warnUncopied ? (
          <div className="rounded-lg border border-destructive bg-destructive/15 p-3.5 text-xs text-destructive space-y-2">
            <div className="flex items-center gap-2 font-semibold">
              <ShieldAlert className="size-4 shrink-0" />
              <span>You have not copied this secret key!</span>
            </div>
            <p className="text-[11px] leading-relaxed opacity-90">
              Closing this dialog now will make it permanently impossible to view or retrieve this
              secret. Are you sure you have stored it elsewhere?
            </p>
            <div className="flex gap-2 pt-1">
              <Button size="xs" variant="default" onClick={handleCopy} className="gap-1">
                <Copy className="size-3" />
                <span>Copy Key Now</span>
              </Button>
              <Button size="xs" variant="outline" onClick={onClose}>
                Dismiss Anyway
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3.5 text-xs text-destructive flex items-start gap-3">
            <AlertTriangle className="size-4 shrink-0 mt-0.5" />
            <p className="leading-relaxed text-[11px]">
              If you lose this key, you will have to revoke it and generate a new one. Store it in
              a secure password manager or paste it directly into your client configuration.
            </p>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-mono text-[11px]">Key Prefix: {revealedKey.keyPrefix}</span>
            <button
              type="button"
              onClick={() => setIsMasked((prev) => !prev)}
              className="flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer text-xs"
            >
              {isMasked ? (
                <>
                  <Eye className="size-3.5" />
                  <span>Reveal</span>
                </>
              ) : (
                <>
                  <EyeOff className="size-3.5" />
                  <span>Mask</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-primary/40 bg-surface-raised p-3">
            <code className="flex-1 font-mono text-xs text-primary break-all select-all">
              {isMasked ? "••••••••••••••••••••••••••••••••••••••••••••" : revealedKey.fullKey}
            </code>
            <Button
              variant={copied ? "default" : "outline"}
              size="sm"
              onClick={handleCopy}
              className="shrink-0 gap-1.5"
            >
              {copied ? <Check className="size-3.5 text-primary" /> : <Copy className="size-3.5" />}
              <span>{copied ? "Copied" : "Copy"}</span>
            </Button>
          </div>
        </div>
      </div>

      <SheetFooter className="flex-col sm:flex-row gap-2 pt-4 border-t border-border/50">
        <Button
          variant="outline"
          onClick={handleAttemptClose}
          className="w-full sm:w-auto text-xs"
        >
          I Have Saved It
        </Button>
        <Button
          onClick={handleConfigureClient}
          className="w-full sm:w-auto gap-2 text-xs"
        >
          <span>Configure Client Guides</span>
          <ArrowDownRight className="size-3.5" />
        </Button>
      </SheetFooter>
    </>
  );
}

export function KeyRevealDialog() {
  const { isRevealOpen, closeReveal, revealedKey } = useKeysStore();

  if (!revealedKey) return null;

  return (
    <Sheet open={isRevealOpen} onOpenChange={(open) => !open && closeReveal()}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-6 overflow-y-auto">
        <KeyRevealContent
          key={revealedKey.keyPrefix}
          revealedKey={revealedKey}
          onClose={closeReveal}
        />
      </SheetContent>
    </Sheet>
  );
}
