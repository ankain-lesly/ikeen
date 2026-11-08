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
import { Kbd } from "@/components/ui/kbd";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  ShieldCheck,
  Keyboard,
  CloudSync,
  Power,
  RefreshCw,
  Download,
  RotateCcw,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { useUpdater } from "@/lib/updater/use-updater";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ipcConnected: boolean;
}

export function SettingsDialog({
  open,
  onOpenChange,
  ipcConnected,
}: SettingsDialogProps) {
  const [autostartEnabled, setAutostartEnabled] = useState(false);
  const [startMinimized, setStartMinimized] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("ikeen_start_minimized") === "true";
    }
    return false;
  });

  const {
    status: updaterStatus,
    updateInfo,
    downloadProgress,
    checkForUpdates,
    downloadAndInstall,
    relaunchApp,
  } = useUpdater();

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-card text-card-foreground border-border">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle className="text-base font-semibold">
              Desktop Preferences
            </DialogTitle>
            <Badge variant="outline" className="text-[10px] text-[#39ff14] border-[#39ff14]/30">
              v2.0
            </Badge>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Configure system integration, startup preferences, keyboard shortcuts, and sync.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
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

          {/* Local Storage & Runtime */}
          <div className="space-y-2">
            <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-sky-400" />
              Local Storage & Engine
            </h4>
            <div className="rounded border border-border p-3 bg-muted/30 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">SQLite Storage Engine</p>
                  <p className="text-[10px] text-muted-foreground">
                    ikeen_desktop.db with pure Drizzle ORM query builders
                  </p>
                </div>
                <Badge variant={ipcConnected ? "default" : "secondary"} className="text-[10px]">
                  {ipcConnected ? "Connected" : "Offline"}
                </Badge>
              </div>
              <Separator />
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">Runtime Engine</span>
                <span className="font-mono text-[10px]">Tauri v2 + Rust WebView2</span>
              </div>
            </div>
          </div>

          {/* Shortcuts */}
          <div className="space-y-2">
            <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Keyboard className="h-3.5 w-3.5 text-amber-400" />
              Keyboard Ergonomics
            </h4>
            <div className="rounded border border-border divide-y divide-border bg-muted/30">
              <div className="flex items-center justify-between p-2.5">
                <div>
                  <span className="text-muted-foreground">Quick-Capture HUD</span>
                  <p className="text-[10px] text-muted-foreground/70">Global shortcut anywhere on OS</p>
                </div>
                <div className="flex gap-1">
                  <Kbd>⌘</Kbd>
                  <Kbd>⇧</Kbd>
                  <Kbd>Space</Kbd>
                </div>
              </div>
              <div className="flex items-center justify-between p-2.5">
                <span className="text-muted-foreground">Command Palette</span>
                <div className="flex gap-1">
                  <Kbd>⌘</Kbd>
                  <Kbd>K</Kbd>
                </div>
              </div>
              <div className="flex items-center justify-between p-2.5">
                <span className="text-muted-foreground">New Note</span>
                <div className="flex gap-1">
                  <Kbd>⌘</Kbd>
                  <Kbd>N</Kbd>
                </div>
              </div>
              <div className="flex items-center justify-between p-2.5">
                <span className="text-muted-foreground">Toggle Sidebar</span>
                <div className="flex gap-1">
                  <Kbd>⌘</Kbd>
                  <Kbd>\</Kbd>
                </div>
              </div>
            </div>
          </div>

          {/* Sync & Network */}
          <div className="space-y-2">
            <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <CloudSync className="h-3.5 w-3.5 text-purple-400" />
              Sync & Network
            </h4>
            <div className="rounded border border-border p-3 bg-muted/30 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Background Sync Outbox</p>
                  <p className="text-[10px] text-muted-foreground">
                    Non-blocking outbox mutation queue pushes when online
                  </p>
                </div>
                <Switch defaultChecked />
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
                      v0.1.0
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {updaterStatus === 'checking' && 'Checking for updates...'}
                    {updaterStatus === 'up-to-date' && 'You are running the latest release.'}
                    {updaterStatus === 'available' && `Update v${updateInfo?.version} available!`}
                    {updaterStatus === 'downloading' && `Downloading update: ${downloadProgress}%`}
                    {updaterStatus === 'ready' && 'Update downloaded. Ready to relaunch.'}
                    {updaterStatus === 'error' && 'Unable to reach update server.'}
                    {updaterStatus === 'idle' && 'Release channel: GitHub Stable Releases'}
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
