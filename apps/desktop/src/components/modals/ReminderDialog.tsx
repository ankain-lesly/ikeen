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
import { Bell, Calendar, Clock, Trash2, CheckCircle2, RotateCcw } from "lucide-react";
import type { Reminder, ReminderRepeat } from "@repo/types";
import {
  getReminderForNote,
  createReminder,
  updateReminder,
  deleteReminder,
} from "@/lib/queries/reminders";

interface ReminderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  noteId: string;
  noteTitle: string;
  onReminderChanged?: () => void;
}

const PRESETS: Array<{ label: string; daysOffset: number; time: string }> = [
  { label: "Later Today (6 PM)", daysOffset: 0, time: "18:00" },
  { label: "Tomorrow (9 AM)", daysOffset: 1, time: "09:00" },
  { label: "Next Week", daysOffset: 7, time: "09:00" },
];

function formatLocalDateInput(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function ReminderDialog({
  open,
  onOpenChange,
  noteId,
  noteTitle,
  onReminderChanged,
}: ReminderDialogProps) {
  const [existingReminder, setExistingReminder] = useState<Reminder | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("09:00");
  const [repeat, setRepeat] = useState<ReminderRepeat>("none");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open && noteId) {
      void getReminderForNote(noteId).then((rem) => {
        setExistingReminder(rem);
        if (rem) {
          const d = new Date(rem.dueAt);
          setSelectedDate(formatLocalDateInput(d));
          setSelectedTime(
            `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
          );
          setRepeat(rem.repeat);
        } else {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          setSelectedDate(formatLocalDateInput(tomorrow));
          setSelectedTime("09:00");
          setRepeat("none");
        }
      });
    }
  }, [open, noteId]);

  const applyPreset = (daysOffset: number, time: string) => {
    const d = new Date();
    d.setDate(d.getDate() + daysOffset);
    setSelectedDate(formatLocalDateInput(d));
    setSelectedTime(time);
  };

  const handleSave = async () => {
    if (!selectedDate || !selectedTime) return;
    setIsSaving(true);
    try {
      const dueAtIso = new Date(`${selectedDate}T${selectedTime}:00`).toISOString();
      const title = noteTitle || "Note Reminder";

      if (existingReminder) {
        await updateReminder(existingReminder.id, {
          title,
          dueAt: dueAtIso,
          repeat,
          isCompleted: false,
        });
      } else {
        await createReminder({
          noteId,
          title,
          dueAt: dueAtIso,
          repeat,
          isCompleted: false,
        });
      }

      onReminderChanged?.();
      onOpenChange(false);
    } catch (err) {
      console.error("[ReminderDialog:SaveError]", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!existingReminder) return;
    setIsSaving(true);
    try {
      await deleteReminder(existingReminder.id);
      onReminderChanged?.();
      onOpenChange(false);
    } catch (err) {
      console.error("[ReminderDialog:DeleteError]", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border p-6 flex flex-col gap-4 text-xs">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-[#39ff14]" />
            <DialogTitle className="text-base font-semibold">
              {existingReminder ? "Edit Reminder" : "Set Reminder"}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground truncate">
            {noteTitle || "Untitled Note"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider block">
            Quick Presets
          </span>
          <div className="grid grid-cols-3 gap-2">
            {PRESETS.map((p) => (
              <Button
                key={p.label}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applyPreset(p.daysOffset, p.time)}
                className="text-[11px] h-8 text-muted-foreground hover:text-foreground"
              >
                {p.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-foreground flex items-center gap-1.5">
              <Calendar className="h-3 w-3 text-muted-foreground" />
              Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded border border-border bg-muted/20 text-xs focus:outline-none focus:border-[#39ff14]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-medium text-foreground flex items-center gap-1.5">
              <Clock className="h-3 w-3 text-muted-foreground" />
              Time
            </label>
            <input
              type="time"
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded border border-border bg-muted/20 text-xs focus:outline-none focus:border-[#39ff14]"
            />
          </div>
        </div>

        <div className="space-y-1 pt-1">
          <label className="text-[11px] font-medium text-foreground flex items-center gap-1.5">
            <RotateCcw className="h-3 w-3 text-muted-foreground" />
            Repeat
          </label>
          <select
            value={repeat}
            onChange={(e) => setRepeat(e.target.value as ReminderRepeat)}
            className="w-full px-2.5 py-1.5 rounded border border-border bg-muted/20 text-xs focus:outline-none focus:border-[#39ff14]"
          >
            <option value="none">Does not repeat</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>

        {existingReminder && (
          <div className="p-2.5 rounded bg-muted/30 border border-border/70 flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1.5">
              <CheckCircle2
                className={`h-3.5 w-3.5 ${
                  existingReminder.isCompleted ? "text-[#39ff14]" : "text-muted-foreground"
                }`}
              />
              <span className="text-muted-foreground">
                Status: {existingReminder.isCompleted ? "Completed" : "Active"}
              </span>
            </div>
            <Badge variant="outline" className="text-[9px] font-mono">
              {existingReminder.repeat}
            </Badge>
          </div>
        )}

        <DialogFooter className="pt-2 border-t border-border flex items-center justify-between gap-2">
          {existingReminder ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void handleDelete()}
              disabled={isSaving}
              className="text-xs text-rose-400 hover:text-rose-300 border-rose-500/30 hover:bg-rose-500/10 gap-1"
            >
              <Trash2 className="h-3 w-3" />
              Remove
            </Button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => void handleSave()}
              disabled={isSaving || !selectedDate || !selectedTime}
              className="text-xs bg-[#39ff14] text-black hover:bg-[#32e012] font-medium"
            >
              {isSaving ? "Saving..." : existingReminder ? "Update" : "Save Reminder"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
