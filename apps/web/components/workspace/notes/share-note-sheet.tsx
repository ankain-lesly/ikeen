"use client";

import * as React from "react";
import toast from "react-hot-toast";
import {
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  Link2,
  Lock,
  RefreshCw,
  Share2,
  Trash2,
} from "lucide-react";

import {
  computeExpiryIso,
  useNoteShare,
  useRevokeShare,
  useUpdateShare,
  useUpsertShare,
  type ShareAccess,
  type ShareExpiryPreset,
} from "@/lib/api/shares.api";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";

interface ShareNoteSheetProps {
  noteId: string;
  isLockedFolder?: boolean;
}

const EXPIRY_OPTIONS: Array<{ key: ShareExpiryPreset; label: string }> = [
  { key: "never", label: "Never expires" },
  { key: "24h", label: "24 hours" },
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
];

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

function inferExpiryPreset(expiresAt: string | null): ShareExpiryPreset {
  if (!expiresAt) return "never";
  const remainingMs = Date.parse(expiresAt) - Date.now();
  if (Number.isNaN(remainingMs) || remainingMs <= 0) return "never";
  if (remainingMs <= 36 * HOUR_MS) return "24h";
  if (remainingMs <= 10 * DAY_MS) return "7d";
  return "30d";
}

export function ShareNoteSheet({
  noteId,
  isLockedFolder = false,
}: ShareNoteSheetProps) {
  const [open, setOpen] = React.useState(false);
  const [initialAllowCopy, setInitialAllowCopy] = React.useState(false);
  const [showPasscodeInput, setShowPasscodeInput] = React.useState(false);
  const [passwordDraft, setPasswordDraft] = React.useState("");
  const [copied, setCopied] = React.useState(false);

  const { data: share, isLoading } = useNoteShare(
    noteId,
    open && !isLockedFolder,
  );

  const [selectedExpiry, setSelectedExpiry] =
    React.useState<ShareExpiryPreset>(share ? inferExpiryPreset(share.expiresAt) : "never");

  const upsertShare = useUpsertShare(noteId);
  const updateShare = useUpdateShare(noteId);
  const revokeShare = useRevokeShare(noteId);

  const isBusy =
    upsertShare.isPending || updateShare.isPending || revokeShare.isPending;

  // React.useEffect(() => {
  //   if (!open) {
  //     setShowPasscodeInput(false);
  //     setPasswordDraft("");
  //     return;
  //   }
  //   if (share) {
  //     setSelectedExpiry(inferExpiryPreset(share.expiresAt));
  //   }
  // }, [open, share]);

  async function handleCopyUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Share link copied");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Failed to copy link");
    }
  }

  function handleCreate() {
    const access: ShareAccess = initialAllowCopy ? "copy" : "view";
    upsertShare.mutate(
      { access },
      {
        onSuccess: (created) => {
          setSelectedExpiry(inferExpiryPreset(created.expiresAt));
          toast.success("Share link created");
          void handleCopyUrl(created.url);
        },
        onError: () => toast.error("Failed to create share link"),
      },
    );
  }

  function handleToggleAllowCopy(checked: boolean) {
    updateShare.mutate(
      { access: checked ? "copy" : "view" },
      {
        onSuccess: () => toast.success("Permissions updated"),
        onError: () => toast.error("Failed to update permissions"),
      },
    );
  }

  function handleExpiryChange(preset: ShareExpiryPreset) {
    const previous = selectedExpiry;
    setSelectedExpiry(preset);
    updateShare.mutate(
      { expiresAt: computeExpiryIso(preset) },
      {
        onSuccess: () =>
          toast.success(
            preset === "never" ? "Expiration cleared" : `Expires in ${preset}`,
          ),
        onError: () => {
          setSelectedExpiry(previous);
          toast.error("Failed to update expiration");
        },
      },
    );
  }

  function handleTogglePasscode(checked: boolean) {
    if (checked) {
      setPasswordDraft("");
      setShowPasscodeInput(true);
      return;
    }

    setShowPasscodeInput(false);
    setPasswordDraft("");
    if (!share?.hasPassword) return;

    updateShare.mutate(
      { password: null },
      {
        onSuccess: () => toast.success("Passcode removed"),
        onError: () => toast.error("Failed to remove passcode"),
      },
    );
  }

  function handleSavePassword(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = passwordDraft.trim();
    if (trimmed.length < 4) {
      toast.error("Passcode must be at least 4 characters");
      return;
    }
    updateShare.mutate(
      { password: trimmed },
      {
        onSuccess: () => {
          setPasswordDraft("");
          setShowPasscodeInput(false);
          toast.success("Passcode saved");
        },
        onError: () => toast.error("Failed to save passcode"),
      },
    );
  }

  function handleRotateSlug() {
    updateShare.mutate(
      { rotateSlug: true },
      {
        onSuccess: (updated) => {
          toast.success("Link rotated — previous URL invalidated");
          void handleCopyUrl(updated.url);
        },
        onError: () => toast.error("Failed to rotate link"),
      },
    );
  }

  function handleRevoke() {
    revokeShare.mutate(undefined, {
      onSuccess: () => {
        setSelectedExpiry("never");
        setShowPasscodeInput(false);
        setPasswordDraft("");
        toast.success("Share link revoked");
      },
      onError: () => toast.error("Failed to revoke share link"),
    });
  }

  const passcodeSwitchOn = Boolean(share?.hasPassword) || showPasscodeInput;
  const activeExpiryLabel =
    EXPIRY_OPTIONS.find((opt) => opt.key === selectedExpiry)?.label ??
    "Never expires";

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label="Share note"
            className="size-8 text-muted-foreground hover:text-foreground"
          />
        }
      >
        <Share2 className="size-3.5" />
      </SheetTrigger>

      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Link2 className="size-4 text-primary" />
            Share note
          </SheetTitle>
          <SheetDescription>
            Share a live, read-only link across web and mobile.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-5 px-4 pb-6">
          {isLockedFolder ? (
            <div className="rounded-lg border border-border bg-muted/40 p-4 text-xs text-muted-foreground space-y-1.5">
              <div className="flex items-center gap-1.5 font-medium text-foreground">
                <Lock className="size-3.5" />
                Locked folder
              </div>
              <p>
                Notes inside locked folders cannot be shared. Move this note out
                of the locked folder first.
              </p>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground gap-2 text-xs">
              <Spinner className="size-4" />
              <span>Loading share settings…</span>
            </div>
          ) : !share ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-muted/20 px-3.5 py-3">
                <div className="space-y-0.5">
                  <Label
                    htmlFor="initial-allow-copy"
                    className="text-xs font-medium"
                  >
                    Allow copy
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    Let recipients fork this note into their workspace
                  </p>
                </div>
                <Switch
                  id="initial-allow-copy"
                  checked={initialAllowCopy}
                  onCheckedChange={setInitialAllowCopy}
                  disabled={isBusy}
                />
              </div>

              <Button
                className="w-full"
                onClick={handleCreate}
                disabled={isBusy}
              >
                {upsertShare.isPending ? "Creating link…" : "Create share link"}
              </Button>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Canonical Share URL */}
              <div className="space-y-2">
                <Label htmlFor="share-url-input" className="text-xs">
                  Share link
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="share-url-input"
                    readOnly
                    value={share.url}
                    className="font-mono text-xs"
                    onFocus={(e) => e.currentTarget.select()}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    onClick={() => void handleCopyUrl(share.url)}
                    aria-label="Copy share link"
                  >
                    {copied ? (
                      <Check className="size-4 text-primary" />
                    ) : (
                      <Copy className="size-4" />
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Open share link"
                    render={
                      <a
                        href={share.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      />
                    }
                  >
                    <ExternalLink className="size-4" />
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {share.viewCount} {share.viewCount === 1 ? "view" : "views"}
                  {share.expiresAt
                    ? ` · Expires ${new Date(share.expiresAt).toLocaleDateString()}`
                    : " · Never expires"}
                  {share.hasPassword ? " · Passcode protected" : ""}
                </p>
              </div>

              <Separator />

              {/* Settings: Switches & Expiration Dropdown */}
              <div className="space-y-4">
                {/* Allow Copy Switch */}
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <Label
                      htmlFor="share-allow-copy"
                      className="text-xs font-medium"
                    >
                      Allow copy
                    </Label>
                    <p className="text-[11px] text-muted-foreground">
                      Recipients can fork a copy into their workspace
                    </p>
                  </div>
                  <Switch
                    id="share-allow-copy"
                    checked={share.access === "copy"}
                    onCheckedChange={handleToggleAllowCopy}
                    disabled={isBusy}
                  />
                </div>

                {/* Passcode Switch + Progressive Input */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <Label
                        htmlFor="share-passcode-toggle"
                        className="text-xs font-medium"
                      >
                        Passcode protection
                      </Label>
                      <p className="text-[11px] text-muted-foreground">
                        {share.hasPassword
                          ? "Passcode required to view"
                          : "Require a passcode to open this link"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {share.hasPassword && !showPasscodeInput && (
                        <button
                          type="button"
                          onClick={() => {
                            setPasswordDraft("");
                            setShowPasscodeInput(true);
                          }}
                          disabled={isBusy}
                          className="text-[11px] font-medium text-primary hover:underline"
                        >
                          Change
                        </button>
                      )}
                      <Switch
                        id="share-passcode-toggle"
                        checked={passcodeSwitchOn}
                        onCheckedChange={handleTogglePasscode}
                        disabled={isBusy}
                      />
                    </div>
                  </div>

                  {showPasscodeInput && (
                    <form
                      onSubmit={handleSavePassword}
                      className="flex items-center gap-2 pt-0.5"
                    >
                      <Input
                        type="password"
                        value={passwordDraft}
                        onChange={(e) => setPasswordDraft(e.target.value)}
                        placeholder="Min 4 characters…"
                        minLength={4}
                        maxLength={128}
                        autoFocus
                        disabled={isBusy}
                      />
                      <Button
                        type="submit"
                        variant="secondary"
                        size="sm"
                        disabled={isBusy || passwordDraft.trim().length < 4}
                      >
                        Save
                      </Button>
                    </form>
                  )}
                </div>

                {/* Link Expiration DropdownMenu */}
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className="text-xs font-medium">Link expiration</span>
                    <p className="text-[11px] text-muted-foreground">
                      Automatically disable access after a period
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      disabled={isBusy}
                      render={
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-1.5 text-xs min-w-[126px] justify-between"
                        />
                      }
                    >
                      <span>{activeExpiryLabel}</span>
                      <ChevronDown className="size-3.5 text-muted-foreground" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      {EXPIRY_OPTIONS.map((opt) => (
                        <DropdownMenuItem
                          key={opt.key}
                          onClick={() => handleExpiryChange(opt.key)}
                          className="justify-between text-xs"
                        >
                          <span>{opt.label}</span>
                          {selectedExpiry === opt.key && (
                            <Check className="size-3.5 text-primary" />
                          )}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <Separator />

              {/* Rotate & Revoke */}
              <div className="flex items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRotateSlug}
                  disabled={isBusy}
                  className="gap-1.5"
                >
                  <RefreshCw className="size-3.5" />
                  Rotate link
                </Button>

                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleRevoke}
                  disabled={isBusy}
                  className="gap-1.5"
                >
                  <Trash2 className="size-3.5" />
                  Revoke link
                </Button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
