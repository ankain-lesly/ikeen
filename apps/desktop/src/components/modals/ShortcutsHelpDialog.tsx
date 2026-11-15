import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ShortcutsHelpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ShortcutCategory {
  title: string;
  shortcuts: {
    keys: string[];
    description: string;
  }[];
}

const SHORTCUT_CATEGORIES: ShortcutCategory[] = [
  {
    title: "Navigation & Panes",
    shortcuts: [
      { keys: ["⌘", "K"], description: "Open Command Palette" },
      { keys: ["⌘", "1"], description: "Focus Sidebar" },
      { keys: ["⌘", "2"], description: "Focus Notes List" },
      { keys: ["⌘", "3"], description: "Focus Note Editor" },
      { keys: ["⌘", "F"], description: "Search in Notes List" },
      { keys: ["↑", "/", "↓"], description: "Navigate Notes in List" },
      { keys: ["j", "/", "k"], description: "Vim navigation in Notes List" },
      { keys: ["Enter"], description: "Focus note into editor" },
      { keys: ["Esc"], description: "Clear search / Blur focus" },
    ],
  },
  {
    title: "Note Management",
    shortcuts: [
      { keys: ["⌘", "N"], description: "Create New Note" },
      { keys: ["⌘", "P"], description: "Pin / Unpin Active Note" },
      { keys: ["⌘", "E"], description: "Archive / Unarchive Note" },
      { keys: ["⌘", "⌫"], description: "Move Note to Trash" },
      { keys: ["⌘", "S"], description: "Save Note immediately" },
    ],
  },
  {
    title: "Editor Formatting",
    shortcuts: [
      { keys: ["⌘", "B"], description: "Bold Text (**text**)" },
      { keys: ["⌘", "I"], description: "Italic Text (*text*)" },
      { keys: ["Tab"], description: "Indent line (2 spaces)" },
      { keys: ["⇧", "Tab"], description: "Outdent line" },
    ],
  },
  {
    title: "System & App Control",
    shortcuts: [
      { keys: ["⌘", "⇧", "Space"], description: "Toggle Quick-Capture HUD (Global)" },
      { keys: ["⌘", "\\"], description: "Toggle Sidebar" },
      { keys: ["⌘", ","], description: "Open Preferences / Settings" },
      { keys: ["?"], description: "Show this Keyboard Shortcuts guide" },
    ],
  },
];

export function ShortcutsHelpDialog({
  open,
  onOpenChange,
}: ShortcutsHelpDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden bg-card border border-border">
        <DialogHeader className="p-4 pb-2 border-b border-border/40">
          <DialogTitle className="text-sm font-semibold tracking-tight text-foreground flex items-center justify-between">
            <span>Keyboard Shortcuts</span>
            <Kbd className="text-[10px] font-mono">?</Kbd>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Desktop-native hotkeys for high-speed note capture and navigation.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[460px] p-4">
          <div className="space-y-5">
            {SHORTCUT_CATEGORIES.map((category) => (
              <div key={category.title} className="space-y-2">
                <h4 className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                  {category.title}
                </h4>
                <div className="rounded-lg border border-border/50 divide-y divide-border/40 bg-muted/20">
                  {category.shortcuts.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between px-3 py-2 text-xs"
                    >
                      <span className="text-foreground/90">{item.description}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        {item.keys.map((k, kIdx) => (
                          <Kbd
                            key={kIdx}
                            className="text-[10px] min-w-4 px-1.5 py-0.5 text-center font-mono bg-background border-border"
                          >
                            {k}
                          </Kbd>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
