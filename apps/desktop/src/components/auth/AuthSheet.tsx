import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useAuthStore } from "@/stores/use-auth-store";
import { loginApi, registerApi } from "@/lib/api/auth-api";
import { syncManager } from "@/lib/sync/sync-manager";
import {
  LogIn,
  UserPlus,
  LogOut,
  User,
  Mail,
  Lock,
  CloudCheck,
  AlertCircle,
  Loader2,
} from "lucide-react";

interface AuthSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialMode?: "login" | "register";
}

export function AuthSheet({
  open,
  onOpenChange,
  initialMode = "login",
}: AuthSheetProps) {
  const { user, isAuthenticated, setAuth, logout } = useAuthStore();
  const [mode, setMode] = useState<string>(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setError(null);
    }
  }, [open, initialMode]);

  const isRegister = mode === "register";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((isRegister && !name.trim()) || !email.trim() || !password.trim()) {
      setError("Please fill in all required fields.");
      return;
    }
    if (isRegister && password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = isRegister
        ? await registerApi({ name: name.trim(), email: email.trim(), password })
        : await loginApi({ email: email.trim(), password });

      setAuth(res.user, res.accessToken);
      setName("");
      setEmail("");
      setPassword("");
      onOpenChange(false);
      void syncManager.sync();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : isRegister
            ? "Failed to create account."
            : "Failed to sign in. Please verify your credentials."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md p-6 bg-card border-border flex flex-col justify-between overflow-y-auto"
      >
        <div className="space-y-6">
          <SheetHeader>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#39ff14] shadow-[0_0_8px_#39ff14]" />
              <SheetTitle className="text-base font-semibold">
                {isAuthenticated ? "Your Account" : "Sign In to iKeen"}
              </SheetTitle>
            </div>
            <SheetDescription className="text-xs text-muted-foreground">
              {isAuthenticated
                ? "Manage your sync credentials and account details."
                : "Synchronize your notes and folders across desktop, mobile, and web."}
            </SheetDescription>
          </SheetHeader>

          {isAuthenticated && user ? (
            <div className="space-y-4 pt-2">
              <div className="rounded-lg border border-border p-4 bg-muted/30 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-[#39ff14]/10 border border-[#39ff14]/30 flex items-center justify-center text-[#39ff14] font-semibold text-sm">
                    {user.firstName ? user.firstName[0].toUpperCase() : user.email[0].toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-xs text-foreground truncate">
                      {user.firstName
                        ? `${user.firstName} ${user.lastName || ""}`.trim()
                        : user.username}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
                  </div>
                </div>
                <Separator />
                <div className="flex items-center justify-between text-xs pt-1 text-muted-foreground">
                  <span className="flex items-center gap-1.5 text-[11px]">
                    <CloudCheck className="h-3.5 w-3.5 text-[#39ff14]" />
                    Cloud Sync Active
                  </span>
                  <span className="text-[10px] font-mono">ID: {user.id.slice(0, 8)}...</span>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    logout();
                    onOpenChange(false);
                  }}
                  className="w-full gap-2 text-xs border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign Out
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              <Tabs
                value={mode}
                onValueChange={(val) => {
                  setMode(val);
                  setError(null);
                }}
                className="w-full"
              >
                <TabsList className="w-full h-8 bg-muted/40 p-0.5 border border-border/60">
                  <TabsTrigger
                    value="login"
                    className="flex-1 text-xs gap-1.5 data-[state=active]:bg-background"
                  >
                    <LogIn className="h-3 w-3" />
                    Sign In
                  </TabsTrigger>
                  <TabsTrigger
                    value="register"
                    className="flex-1 text-xs gap-1.5 data-[state=active]:bg-background"
                  >
                    <UserPlus className="h-3 w-3" />
                    Register
                  </TabsTrigger>
                </TabsList>

                {error && (
                  <div className="mt-3 p-3 rounded border border-destructive/30 bg-destructive/10 text-destructive text-xs flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span className="text-[11px] leading-tight">{error}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-3 pt-3">
                  {isRegister && (
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
                        <User className="h-3 w-3" />
                        Full Name
                      </label>
                      <Input
                        type="text"
                        required
                        placeholder="Jane Doe"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="h-8 text-xs bg-muted/20"
                      />
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
                      <Mail className="h-3 w-3" />
                      Email Address
                    </label>
                    <Input
                      type="email"
                      required
                      placeholder="you@domain.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-8 text-xs bg-muted/20"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
                      <Lock className="h-3 w-3" />
                      {isRegister ? "Password (min 6 characters)" : "Password"}
                    </label>
                    <Input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-8 text-xs bg-muted/20"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-8 text-xs font-semibold gap-1.5 bg-[#39ff14] text-black hover:bg-[#32e012] mt-2"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        {isRegister ? "Creating Account..." : "Signing In..."}
                      </>
                    ) : isRegister ? (
                      <>
                        <UserPlus className="h-3.5 w-3.5" />
                        Create Account
                      </>
                    ) : (
                      <>
                        <LogIn className="h-3.5 w-3.5" />
                        Sign In
                      </>
                    )}
                  </Button>
                </form>
              </Tabs>
            </div>
          )}
        </div>

        <div className="pt-6 border-t border-border flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Close
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
