import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import { Pressable, Text, View } from "react-native";
import { Bell, Check, Plus } from "lucide-react-native";
import * as Haptics from "@/lib/haptics";
import { useTheme } from "@/hooks/use-theme";
import { toast } from "@/lib/toast";
import { formatReminderDisplay } from "@repo/utils";
import type { Reminder, ReminderRepeat } from "@repo/types";
import {
  useLiveRemindersForNote,
  createReminder,
  updateReminder,
  deleteReminder,
  toggleReminderCompleted,
} from "@/lib/queries/reminders";
import { ReminderSheet } from "./reminder-sheet";

export interface NoteRemindersSectionHandle {
  openAddReminder: () => void;
}

export interface NoteRemindersSectionProps {
  noteId: string;
  noteTitle?: string;
  className?: string;
}

export const NoteRemindersSection = forwardRef<
  NoteRemindersSectionHandle,
  NoteRemindersSectionProps
>(function NoteRemindersSection({ noteId, noteTitle = "", className = "" }, ref) {
  const colors = useTheme();
  const [isReminderSheetVisible, setIsReminderSheetVisible] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);

  const { data: noteReminders = [] } = useLiveRemindersForNote(noteId);

  const nonDeletedReminders = useMemo(
    () =>
      (noteReminders ?? [])
        .filter((r) => !r.deletedAt)
        .sort((a, b) => {
          if (a.isCompleted !== b.isCompleted) {
            return a.isCompleted ? 1 : -1;
          }
          return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
        }),
    [noteReminders],
  );

  useImperativeHandle(
    ref,
    () => ({
      openAddReminder: () => {
        setEditingReminder(null);
        setIsReminderSheetVisible(true);
      },
    }),
    [],
  );

  const handleSaveReminder = useCallback(
    async (
      dueAt: string,
      repeat: ReminderRepeat,
      repeatInterval?: number | null,
      maxRepeats?: number | null,
    ) => {
      if (!noteId) return;
      try {
        if (editingReminder) {
          await updateReminder(editingReminder.id, {
            dueAt,
            repeat,
            repeatInterval: repeat === "interval" ? repeatInterval : null,
            maxRepeats: repeat === "interval" ? maxRepeats : null,
            isCompleted: false,
          });
          toast.success("Reminder updated");
        } else {
          await createReminder({
            noteId,
            title: noteTitle || "Note Reminder",
            dueAt,
            repeat,
            repeatInterval: repeat === "interval" ? repeatInterval : null,
            maxRepeats: repeat === "interval" ? maxRepeats : null,
          });
          toast.success("Reminder set");
        }
        setIsReminderSheetVisible(false);
        setEditingReminder(null);
      } catch {
        toast.error("Failed to set reminder");
      }
    },
    [noteId, noteTitle, editingReminder],
  );

  const handleClearReminder = useCallback(async () => {
    if (!editingReminder) return;
    try {
      await deleteReminder(editingReminder.id);
      toast.success("Reminder removed");
      setIsReminderSheetVisible(false);
      setEditingReminder(null);
    } catch {
      toast.error("Failed to remove reminder");
    }
  }, [editingReminder]);

  const handleToggleCompleteReminder = useCallback(
    async (reminderId: string) => {
      try {
        await toggleReminderCompleted(reminderId);
        Haptics.selectionAsync();
      } catch {
        toast.error("Failed to update reminder");
      }
    },
    [],
  );

  const handleCompleteInSheet = useCallback(async () => {
    if (!editingReminder) return;
    try {
      await toggleReminderCompleted(editingReminder.id);
      setIsReminderSheetVisible(false);
      setEditingReminder(null);
    } catch {
      toast.error("Failed to update reminder status");
    }
  }, [editingReminder]);

  return (
    <>
      {nonDeletedReminders.length > 0 ? (
        <View className={`mt-8 mb-6 pt-4 ${className}`}>
          <View className="flex-row items-center justify-between mb-2.5 px-1">
            <View className="flex-row items-center gap-2">
              <Bell size={15} color={colors.primary} />
              <Text className="text-sm font-semibold text-text">
                Reminders ({nonDeletedReminders.length})
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add another reminder"
              onPress={() => {
                Haptics.selectionAsync();
                setEditingReminder(null);
                setIsReminderSheetVisible(true);
              }}
              hitSlop={8}
              className="flex-row items-center gap-1 px-2.5 py-2 rounded-full bg-primary/10 active:opacity-70">
              <Plus size={14} color={colors.primary} />
              <Text className="font-medium text-primary">Add</Text>
            </Pressable>
          </View>

          <View className="gap-2">
            {nonDeletedReminders.map((reminder) => {
              const display = formatReminderDisplay(
                reminder.dueAt,
                (reminder.repeat as ReminderRepeat) ?? "none",
                reminder.repeatInterval,
                reminder.maxRepeats,
                reminder.repeatCount,
              );
              const isCompleted = reminder.isCompleted;

              return (
                <Pressable
                  key={reminder.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Reminder: ${display.text}`}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setEditingReminder(reminder);
                    setIsReminderSheetVisible(true);
                  }}
                  className={`flex-row items-center justify-between px-3.5 py-2.5 rounded-xl border ${
                    isCompleted
                      ? "bg-background-element/40 border-border/30 opacity-70"
                      : display.isOverdue
                        ? "bg-red-500/10 border-red-500/25"
                        : "bg-background-element border-border/50"
                  } active:opacity-80`}>
                  <View className="flex-row items-center gap-2.5 flex-1 mr-2">
                    {/* Quick Toggle Checkbox */}
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation();
                        handleToggleCompleteReminder(reminder.id);
                      }}
                      hitSlop={8}
                      className={`w-5 h-5 rounded-full items-center justify-center border ${
                        isCompleted
                          ? "bg-primary border-primary"
                          : "border-text-secondary/50 bg-transparent"
                      }`}>
                      {isCompleted ? <Check size={12} color="#FFF" /> : null}
                    </Pressable>

                    <View className="flex-1">
                      <View className="flex-row items-center gap-1.5 flex-wrap">
                        <Text
                          className={`text-xs font-semibold ${
                            isCompleted
                              ? "line-through text-text-secondary"
                              : display.isOverdue
                                ? "text-red-500"
                                : "text-text"
                          }`}>
                          {display.text}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Right status chip / recurrence label */}
                  <Text
                    className={`text-[10px] font-medium font-mono ${
                      isCompleted
                        ? "text-text-secondary"
                        : display.isOverdue
                          ? "text-red-500 font-semibold"
                          : "text-primary"
                    }`}>
                    {isCompleted ? "Completed" : display.chipLabel}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      {/* Fully encapsulated ReminderSheet */}
      {noteId ? (
        <ReminderSheet
          isPresented={isReminderSheetVisible}
          onDismiss={() => {
            setIsReminderSheetVisible(false);
            setEditingReminder(null);
          }}
          initialDueAt={editingReminder?.dueAt}
          initialRepeat={editingReminder?.repeat}
          initialRepeatInterval={editingReminder?.repeatInterval}
          initialMaxRepeats={editingReminder?.maxRepeats}
          onSave={handleSaveReminder}
          onClear={editingReminder ? handleClearReminder : undefined}
          onComplete={editingReminder ? handleCompleteInSheet : undefined}
        />
      ) : null}
    </>
  );
});
