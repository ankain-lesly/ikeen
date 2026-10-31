import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Terminal, ShieldCheck, Cpu } from "lucide-react";

interface DiagnosticCardProps {
  rustGreeting: string;
  ipcConnected: boolean;
}

export function DiagnosticCard({ rustGreeting, ipcConnected }: DiagnosticCardProps) {
  return (
    <Card className="border-border bg-muted/20">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-[#39ff14]" />
            <CardTitle className="text-xs font-semibold uppercase tracking-wider font-mono">
              Tauri v2 IPC Diagnostic
            </CardTitle>
          </div>
          <Badge
            variant={ipcConnected ? "default" : "secondary"}
            className="text-[10px] font-mono"
          >
            {ipcConnected ? "Bridge Active" : "Initializing"}
          </Badge>
        </div>
        <CardDescription className="text-xs text-muted-foreground">
          Real-time diagnostics for the local desktop engine & SQLite IPC channels.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 pt-2 text-xs">
        <div className="rounded border border-border/80 bg-background/60 p-2.5 font-mono text-[11px] text-[#39ff14]">
          {rustGreeting}
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="rounded border border-border/60 bg-background/40 p-2 space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground font-medium">
              <ShieldCheck className="h-3.5 w-3.5 text-sky-400" />
              <span>Storage Engine</span>
            </div>
            <p className="font-mono text-[10px] text-foreground">
              Embedded SQLite (FTS5)
            </p>
          </div>

          <div className="rounded border border-border/60 bg-background/40 p-2 space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground font-medium">
              <Cpu className="h-3.5 w-3.5 text-amber-400" />
              <span>Multi-Window</span>
            </div>
            <p className="font-mono text-[10px] text-foreground">
              Main (1280x840) + Quick-Capture
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
