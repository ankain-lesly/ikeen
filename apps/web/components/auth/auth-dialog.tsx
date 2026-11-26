"use client";

import * as React from "react";
import toast from "react-hot-toast";
import { LogIn, UserPlus, ShieldCheck } from "lucide-react";

import { useAuthUiStore } from "@/lib/stores/auth-ui-store";
import { useLogin, useRegister } from "@/lib/api/auth.api";

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
import { Spinner } from "@/components/ui/spinner";

export function AuthDialog() {
  const { isAuthOpen, closeAuth, authMode } = useAuthUiStore();
  const loginMutation = useLogin();
  const registerMutation = useRegister();

  const [userMode, setUserMode] = React.useState<"login" | "register" | null>(null);
  const mode = userMode ?? authMode;
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");

  function resetForm() {
    setName("");
    setEmail("");
    setPassword("");
    setUserMode(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error("Please enter email and password");
      return;
    }

    if (mode === "login") {
      loginMutation.mutate(
        { email: email.trim(), password },
        {
          onSuccess: (data) => {
            toast.success(`Welcome back, ${data.user.firstName || data.user.email}!`);
            closeAuth();
            resetForm();
          },
          onError: (err: unknown) => {
            const axiosErr = err as { response?: { data?: { message?: string } }; message?: string };
            toast.error(axiosErr.response?.data?.message || axiosErr.message || "Failed to sign in");
          },
        },
      );
    } else {
      if (!name.trim()) {
        toast.error("Please enter your name");
        return;
      }
      if (password.length < 6) {
        toast.error("Password must be at least 6 characters long");
        return;
      }
      registerMutation.mutate(
        { name: name.trim(), email: email.trim(), password },
        {
          onSuccess: () => {
            toast.success("Account created successfully!");
            closeAuth();
            resetForm();
          },
          onError: (err: unknown) => {
            const axiosErr = err as { response?: { data?: { message?: string } }; message?: string };
            toast.error(axiosErr.response?.data?.message || axiosErr.message || "Failed to create account");
          },
        },
      );
    }
  }

  const isLoading = loginMutation.isPending || registerMutation.isPending;

  return (
    <Sheet open={isAuthOpen} onOpenChange={(open) => !open && closeAuth()}>
      <SheetContent side="right" className="w-full sm:max-w-md p-6 overflow-y-auto">
        <SheetHeader className="text-left space-y-2 pb-4 border-b border-border/50">
          <div className="flex items-center gap-2 text-primary font-mono text-xs uppercase tracking-wider">
            <ShieldCheck className="size-4" />
            <span>Developer Authentication</span>
          </div>
          <SheetTitle className="text-xl font-heading tracking-tight">
            {mode === "login" ? "Sign In to iKeen" : "Create Developer Account"}
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            Authenticate to generate and manage secret keys for external MCP agents.
          </SheetDescription>
        </SheetHeader>

        {/* Tab switch */}
        <div className="flex rounded-lg border border-border p-1 my-6 bg-muted/20">
          <button
            type="button"
            onClick={() => setUserMode("login")}
            className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              mode === "login"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <LogIn className="size-3.5" />
            <span>Sign In</span>
          </button>
          <button
            type="button"
            onClick={() => setUserMode("register")}
            className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              mode === "register"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <UserPlus className="size-3.5" />
            <span>Create Account</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "register" && (
            <div className="space-y-1.5">
              <Label htmlFor="auth-name" className="text-xs font-medium text-muted-foreground">
                Full Name
              </Label>
              <Input
                id="auth-name"
                type="text"
                autoComplete="name"
                placeholder="Ada Lovelace"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="auth-email" className="text-xs font-medium text-muted-foreground">
              Email Address
            </Label>
            <Input
              id="auth-email"
              type="email"
              autoComplete="email"
              placeholder="developer@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="auth-password" className="text-xs font-medium text-muted-foreground">
              Password
            </Label>
            <Input
              id="auth-password"
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>

          <Button type="submit" disabled={isLoading} className="w-full mt-4">
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Spinner />
                <span>Processing...</span>
              </span>
            ) : mode === "login" ? (
              "Sign In"
            ) : (
              "Create Account"
            )}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
