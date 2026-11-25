import React, { useState, useMemo, useCallback, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import {
  Bell,
  Calendar,
  Clock,
  RotateCw,
  Sun,
  Sunset,
  Sunrise,
  Trash2,
  ChevronDown,
  CalendarDays,
  Check,
} from "lucide-react-native";
import {
  Host,
  DropdownMenu,
  DropdownMenuItem,
  Column,
  Text as ComposeText,
} from "@expo/ui/jetpack-compose";
import { RNHostView } from "@expo/ui";
import { DateTimePicker } from "@expo/ui/community/datetime-picker";
import { OptionSheet } from "@/components/ui/option-sheet";
import { useTheme } from "@/hooks/use-theme";
import * as Haptics from "expo-haptics";
import type { ReminderRepeat } from "@repo/types";

export interface ReminderSheetProps {
  isPresented: boolean;
  onDismiss: () => void;
  targetCount?: number;
  initialDueAt?: string | null;
  initialRepeat?: ReminderRepeat;
  onSave: (dueAt: string, repeat: ReminderRepeat) => void | Promise<void>;
  onClear?: () => void | Promise<void>;
  onComplete?: () => void | Promise<void>;
}

interface DropdownItem {
  id: string;
  label: string;
  icon?: React.ComponentType<{ size: number; color: string }>;
  onSelect: () => void;
}

interface ReminderDropdownRowProps {
  label: string;
  selectedText: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  items: DropdownItem[];
  colors: {
    primary: string;
    text: string;
    textSecondary: string;
    border: string;
  };
}

function ReminderDropdownRow({
  label,
  selectedText,
  icon: RowIcon,
  items,
  colors,
}: ReminderDropdownRowProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <DropdownMenu expanded={isOpen} onDismissRequest={() => setIsOpen(false)}>
      <DropdownMenu.Trigger>
        <RNHostView matchContents={true} style={{ width: "100%" }}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              Haptics.selectionAsync();
              setIsOpen(true);
            }}
            className="flex-row items-center justify-between p-3.5 px-4 gap-2">
            <View className="flex-row items-center gap-3">
              <RowIcon size={16} color={colors.textSecondary} />
              <Text className="text-sm font-semibold text-text">{label}</Text>
            </View>

            <View className="flex-row items-center gap-1.5 flex-shrink">
              <Text
                numberOfLines={1}
                className="text-xs text-text-secondary font-medium">
                {selectedText}
              </Text>
              <ChevronDown size={15} color={colors.textSecondary} />
            </View>
          </TouchableOpacity>
        </RNHostView>
      </DropdownMenu.Trigger>

      <DropdownMenu.Items>
        {items.map((item) => {
          const ItemIcon = item.icon;
          return (
            <DropdownMenuItem
              key={item.id}
              onClick={() => {
                setIsOpen(false);
                item.onSelect();
              }}>
              {ItemIcon && (
                <DropdownMenuItem.LeadingIcon>
                  <RNHostView matchContents>
                    <ItemIcon size={18} color={colors.textSecondary} />
                  </RNHostView>
                </DropdownMenuItem.LeadingIcon>
              )}
              <DropdownMenuItem.Text>
                <ComposeText color={colors.text}>{item.label}</ComposeText>
              </DropdownMenuItem.Text>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenu.Items>
    </DropdownMenu>
  );
}

export function ReminderSheet({
  isPresented,
  onDismiss,
  targetCount = 1,
  initialDueAt,
  initialRepeat = "none",
  onSave,
  onClear,
  onComplete,
}: ReminderSheetProps) {
  const colors = useTheme();

  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    if (initialDueAt) {
      const parsed = new Date(initialDueAt);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    const d = new Date();
    d.setDate(d.getDate() + 0);
    d.setHours(9, 0, 0, 0);
    return d;
  });

  const [repeat, setRepeat] = useState<ReminderRepeat>(initialRepeat);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Date Math Presets
  const datePresets = useMemo(() => {
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    const nextWeek = new Date();
    const daysUntilMonday = (1 + 7 - today.getDay()) % 7 || 7;
    nextWeek.setDate(today.getDate() + daysUntilMonday);

    return { today, tomorrow, nextWeek };
  }, []);

  const formatShortDate = (d: Date) => {
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const isSameDay = (a: Date, b: Date) => {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  };

  const isToday = isSameDay(selectedDate, datePresets.today);
  const isTomorrow = isSameDay(selectedDate, datePresets.tomorrow);

  // Selected Date Display Text
  const dateDisplayText = useMemo(() => {
    if (isToday) return `Today (${formatShortDate(selectedDate)})`;
    if (isTomorrow) return `Tomorrow (${formatShortDate(selectedDate)})`;
    return selectedDate.toLocaleDateString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }, [selectedDate, isToday, isTomorrow]);

  // Selected Time Display Text
  const timeDisplayText = useMemo(() => {
    const hours = selectedDate.getHours();
    const minutes = selectedDate.getMinutes();

    if (hours === 8 && minutes === 0) return "Morning (8:00 AM)";
    if (hours === 13 && minutes === 0) return "Afternoon (1:00 PM)";
    if (hours === 18 && minutes === 0) return "Evening (6:00 PM)";
    if (hours === 9 && minutes === 0) return "All Day (9:00 AM)";

    return selectedDate.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  }, [selectedDate]);

  // Selected Repeat Display Text
  const repeatDisplayText = useMemo(() => {
    switch (repeat) {
      case "daily":
        return "Daily";
      case "weekly":
        return "Weekly";
      case "monthly":
        return "Monthly";
      case "yearly":
        return "Yearly";
      case "custom":
        return "Custom";
      default:
        return "Does not repeat";
    }
  }, [repeat]);

  // Set date portion while preserving time
  const handleSelectDate = useCallback((targetDate: Date) => {
    Haptics.selectionAsync();
    setSelectedDate((prev) => {
      const next = new Date(prev);
      next.setFullYear(
        targetDate.getFullYear(),
        targetDate.getMonth(),
        targetDate.getDate(),
      );
      return next;
    });
  }, []);

  // Set time portion while preserving date
  const handleSelectTime = useCallback((hours: number, minutes: number = 0) => {
    Haptics.selectionAsync();
    setSelectedDate((prev) => {
      const next = new Date(prev);
      next.setHours(hours, minutes, 0, 0);
      return next;
    });
  }, []);

  const handleSave = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await onSave(selectedDate.toISOString(), repeat);
    onDismiss();
  };

  const handleClear = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (onClear) {
      await onClear();
    }
    onDismiss();
  };

  const handleComplete = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (onComplete) {
      await onComplete();
    }
    onDismiss();
  };

  // Date Dropdown Items
  const dateDropdownItems: DropdownItem[] = useMemo(() => {
    return [
      {
        id: "today",
        label: `Today (${formatShortDate(datePresets.today)})`,
        icon: Sun,
        onSelect: () => handleSelectDate(datePresets.today),
      },
      {
        id: "tomorrow",
        label: `Tomorrow (${formatShortDate(datePresets.tomorrow)})`,
        icon: Sunrise,
        onSelect: () => handleSelectDate(datePresets.tomorrow),
      },
      {
        id: "next_week",
        label: `Next Week (${formatShortDate(datePresets.nextWeek)})`,
        icon: CalendarDays,
        onSelect: () => handleSelectDate(datePresets.nextWeek),
      },
      {
        id: "pick_date",
        label: "Pick a Date...",
        icon: Calendar,
        onSelect: () => setShowDatePicker(true),
      },
    ];
  }, [
    datePresets.nextWeek,
    datePresets.today,
    datePresets.tomorrow,
    handleSelectDate,
  ]);

  // Time Dropdown Items
  const timeDropdownItems: DropdownItem[] = useMemo(() => {
    return [
      {
        id: "morning",
        label: "Morning (8:00 AM)",
        icon: Sunrise,
        onSelect: () => handleSelectTime(8, 0),
      },
      {
        id: "afternoon",
        label: "Afternoon (1:00 PM)",
        icon: Sun,
        onSelect: () => handleSelectTime(13, 0),
      },
      {
        id: "evening",
        label: "Evening (6:00 PM)",
        icon: Sunset,
        onSelect: () => handleSelectTime(18, 0),
      },
      {
        id: "all_day",
        label: "All Day (9:00 AM)",
        icon: Clock,
        onSelect: () => handleSelectTime(9, 0),
      },
      {
        id: "pick_time",
        label: "Pick a time...",
        icon: Clock,
        onSelect: () => setShowTimePicker(true),
      },
    ];
  }, [handleSelectTime]);

  // Repeat Dropdown Items
  const repeatDropdownItems: DropdownItem[] = useMemo(() => {
    return [
      {
        id: "none",
        label: "Does not repeat",
        onSelect: () => {
          Haptics.selectionAsync();
          setRepeat("none");
        },
      },
      {
        id: "daily",
        label: "Daily",
        onSelect: () => {
          Haptics.selectionAsync();
          setRepeat("daily");
        },
      },
      {
        id: "weekly",
        label: "Weekly",
        onSelect: () => {
          Haptics.selectionAsync();
          setRepeat("weekly");
        },
      },
      {
        id: "monthly",
        label: "Monthly",
        onSelect: () => {
          Haptics.selectionAsync();
          setRepeat("monthly");
        },
      },
      {
        id: "yearly",
        label: "Yearly",
        onSelect: () => {
          Haptics.selectionAsync();
          setRepeat("yearly");
        },
      },
      {
        id: "custom",
        label: "Custom",
        onSelect: () => {
          Haptics.selectionAsync();
          setRepeat("custom");
        },
      },
    ];
  }, []);

  const formatScheduledSummary = () => {
    const timeStr = selectedDate.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
    const dateStr = isToday
      ? "Today"
      : isTomorrow
        ? "Tomorrow"
        : selectedDate.toLocaleDateString([], {
            weekday: "short",
            month: "short",
            day: "numeric",
          });

    let repeatStr = "Does not repeat";
    if (repeat === "daily") {
      repeatStr = `Rings every day at ${timeStr}`;
    } else if (repeat === "weekly") {
      const weekday = selectedDate.toLocaleDateString([], { weekday: "long" });
      repeatStr = `Rings every ${weekday} at ${timeStr}`;
    } else if (repeat === "monthly") {
      repeatStr = `Rings monthly on day ${selectedDate.getDate()} at ${timeStr}`;
    } else if (repeat === "yearly") {
      repeatStr = `Rings yearly on ${selectedDate.toLocaleDateString([], { month: "short", day: "numeric" })} at ${timeStr}`;
    }

    if (repeat !== "none") {
      return `${repeatStr} (First: ${dateStr})`;
    }
    return `${dateStr} at ${timeStr} • Does not repeat`;
  };

  return (
    <>
      <OptionSheet
        isPresented={isPresented}
        onDismiss={onDismiss}
        title={
          targetCount > 1 ? `Remind for ${targetCount} notes` : "Set Reminder"
        }
        matchHTMLContents={false}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={{ width: "100%" }}
          contentContainerStyle={{ paddingBottom: 24 }}
          className="gap-3.5">
          <Host matchContents>
            <Column>
              {/* Dropdown 1: Date */}
              <ReminderDropdownRow
                label="Date"
                selectedText={dateDisplayText}
                icon={Calendar}
                items={dateDropdownItems}
                colors={colors}
              />

              {/* Dropdown 2: Time */}
              <ReminderDropdownRow
                label="Time"
                selectedText={timeDisplayText}
                icon={Clock}
                items={timeDropdownItems}
                colors={colors}
              />

              {/* Dropdown 3: Repeat */}
              <ReminderDropdownRow
                label="Repeat"
                selectedText={repeatDisplayText}
                icon={RotateCw}
                items={repeatDropdownItems}
                colors={colors}
              />
            </Column>
          </Host>

          {/* Scheduled Preview Card */}
          <View className="p-3.5 rounded-xl flex-row items-center gap-3 mt-1">
            <Bell size={16} color={colors.primary} />

            <View className="flex-1">
              {/* <Text className="text-[11px] text-text-secondary font-medium tracking-wider">
                Alert Scheduled For
              </Text> */}
              <Text className="text-sm font-bold text-text">
                {formatScheduledSummary()}
              </Text>
            </View>
          </View>

          {/* Inline Action Buttons */}
          <View className="flex-row items-center justify-start gap-2 mt-3 pt-2">
            {onClear && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleClear}
                className="px-3.5 py-2 flex-row items-center">
                <Text className="text-text-secondary font-medium text-sm">
                  Delete
                </Text>
              </TouchableOpacity>
            )}

            {onComplete && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={onDismiss}
                className="px-3.5 py-2 flex-row items-center gap-1.5">
                <Text className="text-text-secondary font-medium text-sm">
                  Cancel
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleSave}
              className="px-4 py-2 flex-row border border-border rounded-full bg-foreground items-center justify-center ml-auto">
              <Text className="text-background font-semibold text-sm">
                Save
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </OptionSheet>

      {/* Native Pickers when triggered */}
      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          minimumDate={new Date()}
          onValueChange={(_event, date) => {
            setShowDatePicker(false);
            if (date) {
              handleSelectDate(date);
            }
          }}
          onDismiss={() => setShowDatePicker(false)}
        />
      )}

      {showTimePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="time"
          is24Hour={false}
          onValueChange={(_event, date) => {
            setShowTimePicker(false);
            if (date) {
              handleSelectTime(date.getHours(), date.getMinutes());
            }
          }}
          onDismiss={() => setShowTimePicker(false)}
        />
      )}
    </>
  );
}
