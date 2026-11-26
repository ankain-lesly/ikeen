"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { KeyRound, Sparkles } from "lucide-react";

import { useKeysStore } from "@/lib/stores/legacy/keys-store";
import { createKeyApi } from "@/lib/api/legacy/keys-api";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";

export function CreateKeySheet() {
  const queryClient = useQueryClient();
  const { isCreateOpen, closeCreate, openReveal } = useKeysStore();

  const [name, setName] = React.useState("");
  const [expiryDays, setExpiryDays] = React.useState<string>("never");

  const createMutation = useMutation({
    mutationFn: createKeyApi,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      closeCreate();
      setName("");
      setExpiryDays("never");
      toast.success("Secret API key generated!");
      // Immediately open the one-time reveal dialog
      openReveal({
        name: data.name,
        fullKey: data.rawKey || data.apiKey,
        keyPrefix: data.keyPrefix,
      });
    },
    onError: (err: unknown) => {
      const axiosErr = err as { response?: { data?: { message?: string } }; message?: string };
      const msg = axiosErr.response?.data?.message || axiosErr.message || "Failed to generate API key";
      toast.error(msg);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please provide a name for this API key");
      return;
    }

    const expiresInDays = expiryDays === "never" ? undefined : parseInt(expiryDays, 10);
    createMutation.mutate({ name: name.trim(), expiresInDays });
  }

  return (
    <Sheet open={isCreateOpen} onOpenChange={(open) => !open && closeCreate()}>
      <SheetContent side="right" className="w-full sm:max-w-md p-6 overflow-y-auto">
        <SheetHeader className="text-left space-y-2 pb-4 border-b border-border/50">
          <div className="flex items-center gap-2 text-primary font-mono text-xs uppercase tracking-wider">
            <KeyRound className="size-4" />
            <span>Key Generation</span>
          </div>
          <SheetTitle className="text-xl font-heading tracking-tight">
            Create Secret API Key
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            Generate a new secret token for an external client. The key secret will only be shown
            once.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-5 my-6">
          <div className="space-y-1.5">
            <Label htmlFor="key-name" className="text-xs font-medium text-muted-foreground">
              Key Name / Purpose
            </Label>
            <Input
              id="key-name"
              type="text"
              placeholder="e.g. Claude Desktop (Workstation)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={createMutation.isPending}
              required
            />
            <p className="text-[11px] text-muted-foreground">
              A recognizable description to identify which client is using this key.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Expiration Period</Label>
            <Select value={expiryDays} onValueChange={(val) => val && setExpiryDays(val)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select expiration" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="never">Never expires</SelectItem>
                <SelectItem value="30">30 Days</SelectItem>
                <SelectItem value="60">60 Days</SelectItem>
                <SelectItem value="90">90 Days</SelectItem>
                <SelectItem value="365">1 Year</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Key will be automatically rejected after this time period.
            </p>
          </div>

          <div className="rounded-lg border border-border/70 bg-surface p-3 space-y-2 text-xs">
            <div className="flex items-center gap-1.5 text-primary font-medium">
              <Sparkles className="size-3.5" />
              <span>Assigned Permissions</span>
            </div>
            <ul className="space-y-1 text-muted-foreground text-[11px] list-disc list-inside">
              <li>Live Web Research & URL Passage Extraction</li>
              <li>Read & Query Second-Brain Workspace Notes</li>
              <li>Save & Persist Research Memos to Notes</li>
            </ul>
          </div>

          <Button type="submit" disabled={createMutation.isPending} className="w-full">
            {createMutation.isPending ? (
              <span className="flex items-center gap-2">
                <Spinner />
                <span>Generating Key...</span>
              </span>
            ) : (
              "Generate Secret Key"
            )}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
