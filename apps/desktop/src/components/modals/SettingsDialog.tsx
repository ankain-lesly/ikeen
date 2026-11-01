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
import { ShieldCheck, Keyboard, CloudSync, Sparkles } from "lucide-react";

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
            Configure local-first SQLite storage, keyboard shortcuts, and cloud sync.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Storage & Runtime */}
          <div className="space-y-2">
            <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-[#39ff14]" />
              Local Storage & Engine
            </h4>
            <div className="rounded border border-border p-3 bg-muted/30 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">SQLite Database</p>
                  <p className="text-[10px] text-muted-foreground">
                    ikeen_desktop.db with FTS5 virtual tables
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
              <Keyboard className="h-3.5 w-3.5 text-sky-400" />
              Keyboard Ergonomics
            </h4>
            <div className="rounded border border-border divide-y divide-border bg-muted/30">
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
                <span className="text-muted-foreground">Quick-Capture HUD</span>
                <div className="flex gap-1">
                  <Kbd>⌘</Kbd>
                  <Kbd>⇧</Kbd>
                  <Kbd>Space</Kbd>
                </div>
              </div>
            </div>
          </div>

          {/* Sync & AI */}
          <div className="space-y-2">
            <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <CloudSync className="h-3.5 w-3.5 text-amber-400" />
              Sync & Network
            </h4>
            <div className="rounded border border-border p-3 bg-muted/30 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Background Sync Outbox</p>
                  <p className="text-[10px] text-muted-foreground">
                    Non-blocking sync queue when online
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 text-amber-400" />
                  <span className="font-medium text-foreground">MCP Tool Sidecars</span>
                </div>
                <Switch defaultChecked />
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
