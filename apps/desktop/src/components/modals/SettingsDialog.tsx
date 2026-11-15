import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Power,
  RefreshCw,
  Download,
  RotateCcw,
  Cloud,
  Layers,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { useUpdater } from "@/lib/updater/use-updater";
import { useSyncStore } from "@/lib/sync/use-sync";
import { useAuthStore } from "@/stores/use-auth-store";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenAuth?: () => void;
  onOpenOutbox?: () => void;
}

export function SettingsDialog({
  open,
  onOpenChange,
  onOpenAuth,
  onOpenOutbox,
}: SettingsDialogProps) {
  const [appVersion, setAppVersion] = useState("0.1.0");
  const [autostartEnabled, setAutostartEnabled] = useState(false);
  const [startMinimized, setStartMinimized] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("ikeen_start_minimized") === "true";
    }
    return false;
  });

  const { status: syncStatus, pendingCount } = useSyncStore();
  const { user, isAuthenticated } = useAuthStore();

  const {
    status: updaterStatus,
    updateInfo,
    downloadProgress,
    checkForUpdates,
    downloadAndInstall,
    relaunchApp,
  } = useUpdater();

  // Load app version on mount
  useEffect(() => {
    if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
      import("@tauri-apps/api/app")
        .then((m) => m.getVersion())
        .then((v) => setAppVersion(v))
        .catch(() => setAppVersion("0.1.0"));
    }
  }, []);

  // Query autostart state on open
  useEffect(() => {
    if (open) {
      invoke<boolean>("plugin:autostart|is_enabled")
        .then((res: boolean) => setAutostartEnabled(res))
        .catch(() => setAutostartEnabled(false));
    }
  }, [open]);

  async function handleToggleAutostart(checked: boolean) {
    try {
      if (checked) {
        await invoke("plugin:autostart|enable");
        setAutostartEnabled(true);
      } else {
        await invoke("plugin:autostart|disable");
        setAutostartEnabled(false);
      }
    } catch (err: unknown) {
      console.warn("[Settings:AutostartToggleError]", err);
    }
  }

  function handleToggleStartMinimized(checked: boolean) {
    setStartMinimized(checked);
    if (typeof window !== "undefined") {
      localStorage.setItem("ikeen_start_minimized", String(checked));
    }
  }

  // const handleManualSync = async () => {
  //   if (!isAuthenticated) {
  //     if (onOpenAuth) onOpenAuth();
  //     return;
  //   }
  //   await syncManager.sync();
  // };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl bg-card text-card-foreground border-border">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            Desktop Preferences
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Configure system integration, cloud sync, and software updates.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Cloud & Data Synchronization */}
          <div className="space-y-2">
            <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Cloud className="h-3.5 w-3.5 text-[#39ff14]" />
              Cloud & Account
            </h4>
            <div className="rounded border border-border p-3 bg-muted/30 space-y-3">
              {/* Row 1: Account */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">
                    {isAuthenticated && user ? user.email : "Local-only (Guest)"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {isAuthenticated
                      ? "Account connected to cloud sync"
                      : "Sign in to sync notes across devices"}
                  </p>
                </div>

                {onOpenAuth && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onOpenAuth}
                    className="h-7 text-xs"
                  >
                    {isAuthenticated ? "Account" : "Sign In"}
                  </Button>
                )}
              </div>

              <Separator />

              {/* Row 2: Sync Engine Actions */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground">Cloud Sync</p>
                    <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          !isAuthenticated
                            ? "bg-muted-foreground"
                            : syncStatus === "syncing"
                            ? "bg-sky-400 animate-pulse"
                            : syncStatus === "error"
                            ? "bg-rose-500"
                            : "bg-[#39ff14]"
                        }`}
                      />
                      {syncStatus === "syncing"
                        ? "Syncing..."
                        : syncStatus === "error"
                        ? "Error"
                        : isAuthenticated
                        ? "Connected"
                        : "Offline"}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {pendingCount > 0 ? `${pendingCount} mutation${pendingCount === 1 ? "" : "s"} in local queue` : "All local changes pushed"}
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  {onOpenOutbox && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onOpenOutbox}
                      className="h-7 text-xs gap-1"
                    >
                      <Layers className="h-3 w-3" />
                      Ledger
                    </Button>
                  )}

                  {/* <Button
                    size="sm"
                    onClick={handleManualSync}
                    disabled={syncStatus === "syncing"}
                    className="h-7 text-xs gap-1.5 bg-[#39ff14] text-black hover:bg-[#32e012]"
                  >
                    <Send className={`h-3 w-3 ${syncStatus === "syncing" ? "animate-spin" : ""}`} />
                    Sync Now
                  </Button> */}
                </div>
              </div>
            </div>
          </div>

          {/* System & Startup */}
          <div className="space-y-2">
            <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Power className="h-3.5 w-3.5 text-[#39ff14]" />
              System & Startup Integration
            </h4>
            <div className="rounded border border-border p-3 bg-muted/30 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Launch on System Startup</p>
                  <p className="text-[10px] text-muted-foreground">
                    Automatically launch iKeen in the background when your computer boots
                  </p>
                </div>
                <Switch
                  checked={autostartEnabled}
                  onCheckedChange={(checked) => void handleToggleAutostart(checked)}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Start Minimized to System Tray</p>
                  <p className="text-[10px] text-muted-foreground">
                    Keep main window hidden on launch; access via tray or global shortcut
                  </p>
                </div>
                <Switch
                  checked={startMinimized}
                  onCheckedChange={handleToggleStartMinimized}
                />
              </div>
            </div>
          </div>

          {/* Software Updates */}
          <div className="space-y-2">
            <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <RefreshCw className="h-3.5 w-3.5 text-sky-400" />
              Software Updates
            </h4>
            <div className="rounded border border-border p-3 bg-muted/30 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground">iKeen Desktop</p>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      v{appVersion}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {updaterStatus === 'checking' && 'Checking for updates...'}
                    {updaterStatus === 'up-to-date' && 'You are running the latest release.'}
                    {updaterStatus === 'available' && `Update v${updateInfo?.version} available!`}
                    {updaterStatus === 'downloading' && `Downloading update: ${downloadProgress}%`}
                    {updaterStatus === 'ready' && 'Update downloaded. Ready to relaunch.'}
                    {updaterStatus === 'error' && 'Unable to reach update server.'}
                    {updaterStatus === 'idle' && 'Up to date'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {updaterStatus === 'available' && (
                    <Button
                      size="sm"
                      onClick={() => void downloadAndInstall()}
                      className="h-7 text-xs gap-1.5 bg-[#39ff14] text-black hover:bg-[#32e012]"
                    >
                      <Download className="h-3 w-3" />
                      Download
                    </Button>
                  )}
                  {updaterStatus === 'ready' && (
                    <Button
                      size="sm"
                      onClick={() => void relaunchApp()}
                      className="h-7 text-xs gap-1.5 bg-[#39ff14] text-black hover:bg-[#32e012]"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Relaunch
                    </Button>
                  )}
                  {updaterStatus !== 'available' && updaterStatus !== 'ready' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void checkForUpdates()}
                      disabled={updaterStatus === 'checking' || updaterStatus === 'downloading'}
                      className="h-7 text-xs gap-1.5"
                    >
                      <RefreshCw className={`h-3 w-3 ${updaterStatus === 'checking' ? 'animate-spin' : ''}`} />
                      Check
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="default"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
