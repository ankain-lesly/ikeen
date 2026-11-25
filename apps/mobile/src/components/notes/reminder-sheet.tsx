import React, { useState, useMemo, useCallback } from "react";
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
  Timer,
  Minus,
  Plus,
} from "lucide-react-native";
import {
  Host,
  DropdownMenu,
  DropdownMenuItem,
  Column,
  Text as ComposeText,
} from "@expo/ui/jetpack-compose";
import { RNHostView, Switch } from "@expo/ui";
import { DateTimePicker } from "@expo/ui/community/datetime-picker";
import { OptionSheet } from "@/components/ui/option-sheet";
import { useTheme } from "@/hooks/use-theme";
import * as Haptics from "expo-haptics";
import type { ReminderRepeat } from "@repo/types";
import { parseClockToSeconds, formatIntervalSeconds } from "@repo/utils";

export interface ReminderSheetProps {
  isPresented: boolean;
  onDismiss: () => void;
  targetCount?: number;
  initialDueAt?: string | null;
  initialRepeat?: ReminderRepeat;
  initialRepeatInterval?: number | null;
  initialMaxRepeats?: number | null;
  onSave: (
    dueAt: string,
    repeat: ReminderRepeat,
    repeatInterval?: number | null,
    maxRepeats?: number | null,
  ) => void | Promise<void>;
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
  initialRepeatInterval,
  initialMaxRepeats,
  onSave,
  onClear,
  onComplete,
}: ReminderSheetProps) {
  const colors = useTheme();

  const [scheduleMode, setScheduleMode] = useState<"regular" | "interval">(() =>
    initialRepeat === "interval" ? "interval" : "regular",
  );

  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    if (initialDueAt) {
      const parsed = new Date(initialDueAt);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    const d = new Date();
    d.setSeconds(0, 0);
    return d;
  });

  const [repeat, setRepeat] = useState<ReminderRepeat>(initialRepeat);

  // Interval-based states (duration in hours/minutes, max occurrences)
  const [intervalHours, setIntervalHours] = useState<number>(() => {
    if (initialRepeatInterval && initialRepeatInterval > 0) {
      return Math.floor(initialRepeatInterval / 3600);
    }
    return 1;
  });
  const [intervalMinutes, setIntervalMinutes] = useState<number>(() => {
    if (initialRepeatInterval && initialRepeatInterval > 0) {
      return Math.floor((initialRepeatInterval % 3600) / 60);
    }
    return 0;
  });
  const [maxRepeats, setMaxRepeats] = useState<number>(() => {
    if (initialMaxRepeats && initialMaxRepeats > 0) {
      return Math.min(100, Math.max(1, initialMaxRepeats));
    }
    return 10;
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showIntervalPicker, setShowIntervalPicker] = useState(false);

  // Synchronize state during render when sheet is presented or initial props change (avoiding useEffect cascading renders)
  const [prevSyncProps, setPrevSyncProps] = useState({
    isPresented,
    initialDueAt,
    initialRepeat,
    initialRepeatInterval,
    initialMaxRepeats,
  });

  if (
    isPresented !== prevSyncProps.isPresented ||
    initialDueAt !== prevSyncProps.initialDueAt ||
    initialRepeat !== prevSyncProps.initialRepeat ||
    initialRepeatInterval !== prevSyncProps.initialRepeatInterval ||
    initialMaxRepeats !== prevSyncProps.initialMaxRepeats
  ) {
    setPrevSyncProps({
      isPresented,
      initialDueAt,
      initialRepeat,
      initialRepeatInterval,
      initialMaxRepeats,
    });

    if (isPresented) {
      if (initialDueAt) {
        const parsed = new Date(initialDueAt);
        if (!isNaN(parsed.getTime())) {
          setSelectedDate(parsed);
        }
      } else {
        const d = new Date();
        d.setSeconds(0, 0);
        setSelectedDate(d);
      }

      const isInterval = initialRepeat === "interval";
      setScheduleMode(isInterval ? "interval" : "regular");
      setRepeat(initialRepeat || "none");

      if (initialRepeatInterval && initialRepeatInterval > 0) {
        setIntervalHours(Math.floor(initialRepeatInterval / 3600));
        setIntervalMinutes(Math.floor((initialRepeatInterval % 3600) / 60));
      } else {
        setIntervalHours(1);
        setIntervalMinutes(0);
      }

      if (initialMaxRepeats && initialMaxRepeats > 0) {
        setMaxRepeats(Math.min(100, Math.max(1, initialMaxRepeats)));
      } else {
        setMaxRepeats(10);
      }
    }
  }

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
    if (scheduleMode === "interval") {
      const seconds = parseClockToSeconds(intervalHours, intervalMinutes);
      await onSave(selectedDate.toISOString(), "interval", seconds, maxRepeats);
    } else {
      await onSave(selectedDate.toISOString(), repeat, null, null);
    }
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

    if (scheduleMode === "interval") {
      const seconds = parseClockToSeconds(intervalHours, intervalMinutes);
      const intervalStr = formatIntervalSeconds(seconds);
      return `Rings every ${intervalStr} (Max ${maxRepeats} times) • First: ${dateStr} at ${timeStr}`;
    }

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
        rightHeader={
          <View className="flex-row items-center gap-2">
            <Text className="text-sm font-semibold text-text-secondary">
              {scheduleMode === "interval" ? "Interval" : "Calendar"}
            </Text>
            <Host matchContents>
              <Switch
                value={scheduleMode === "interval"}
                onValueChange={(val) => {
                  Haptics.selectionAsync();
                  setScheduleMode(val ? "interval" : "regular");
                  if (val) {
                    setRepeat("interval");
                  } else {
                    setRepeat("none");
                  }
                }}
              />
            </Host>
          </View>
        }
        matchHTMLContents={false}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={{ width: "100%" }}
          contentContainerStyle={{ paddingBottom: 24 }}
          className="gap-3.5">
          {scheduleMode === "regular" ? (
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
          ) : (
            <View className="gap-2.5">
              <Host matchContents>
                <Column>
                  {/* Date */}
                  <ReminderDropdownRow
                    label="Date"
                    selectedText={dateDisplayText}
                    icon={Calendar}
                    items={dateDropdownItems}
                    colors={colors}
                  />

                  {/* Time */}
                  <ReminderDropdownRow
                    label="Time"
                    selectedText={timeDisplayText}
                    icon={Clock}
                    items={timeDropdownItems}
                    colors={colors}
                  />
                </Column>
              </Host>

              {/* Interval Duration & Max Occurrences */}
              <View className="rounded-xl border border-border/40 overflow-hidden bg-background-element/30">
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setShowIntervalPicker(true);
                  }}
                  className="flex-row items-center justify-between p-3.5 px-4 border-b border-border/30">
                  <View className="flex-row items-center gap-3">
                    <Timer size={16} color={colors.textSecondary} />
                    <Text className="text-sm font-semibold text-text">
                      Repeat Every
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-1.5 flex-shrink">
                    <Text
                      numberOfLines={1}
                      className="text-xs text-text-secondary font-medium font-mono">
                      {formatIntervalSeconds(
                        parseClockToSeconds(intervalHours, intervalMinutes),
                      )}
                    </Text>
                    <ChevronDown size={15} color={colors.textSecondary} />
                  </View>
                </TouchableOpacity>

                <View className="flex-row items-center justify-between p-3.5 px-4">
                  <View className="flex-row items-center gap-3">
                    <RotateCw size={16} color={colors.textSecondary} />
                    <View>
                      <Text className="text-sm font-semibold text-text">
                        Max Repeats
                      </Text>
                      <Text className="text-[10px] text-text-secondary">
                        Terminates sequence at limit
                      </Text>
                    </View>
                  </View>
                  <View className="flex-row items-center gap-2">
                    <TouchableOpacity
                      activeOpacity={0.7}
                      disabled={maxRepeats <= 1}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setMaxRepeats((prev) => Math.max(1, prev - 1));
                      }}
                      className={`w-7 h-7 rounded-full items-center justify-center border border-border bg-background-element ${
                        maxRepeats <= 1 ? "opacity-30" : "active:opacity-70"
                      }`}>
                      <Minus size={13} color={colors.text} />
                    </TouchableOpacity>

                    <Text className="text-xs font-semibold font-mono text-text min-w-[32px] text-center">
                      {maxRepeats}
                    </Text>

                    <TouchableOpacity
                      activeOpacity={0.7}
                      disabled={maxRepeats >= 100}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setMaxRepeats((prev) => Math.min(100, prev + 1));
                      }}
                      className={`w-7 h-7 rounded-full items-center justify-center border border-border bg-background-element ${
                        maxRepeats >= 100 ? "opacity-30" : "active:opacity-70"
                      }`}>
                      <Plus size={13} color={colors.text} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Scheduled Preview Card */}
          <View className="p-3.5 rounded-xl flex-row items-center gap-3 mt-1">
            <Bell size={16} color={colors.primary} />

            <View className="flex-1">
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

      {showIntervalPicker && (
        <DateTimePicker
          value={new Date(2000, 0, 1, intervalHours, intervalMinutes)}
          mode="time"
          is24Hour={true}
          onValueChange={(_event, date) => {
            setShowIntervalPicker(false);
            if (date) {
              const h = date.getHours();
              const m = date.getMinutes();
              const secs = parseClockToSeconds(h, m);
              setIntervalHours(Math.floor(secs / 3600));
              setIntervalMinutes(Math.floor((secs % 3600) / 60));
            }
          }}
          onDismiss={() => setShowIntervalPicker(false)}
        />
      )}
    </>
  );
}
