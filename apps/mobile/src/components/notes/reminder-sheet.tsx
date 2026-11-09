import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import {
  Bell,
  Calendar,
  Clock,
  RotateCw,
  Sun,
  Sunset,
  Trash2,
  Check,
} from 'lucide-react-native';
import { OptionSheet } from '@/components/ui/option-sheet';
import { ThemedText } from '@/components/ui/themed-text';
import { useTheme } from '@/hooks/use-theme';
import * as Haptics from 'expo-haptics';
import type { ReminderRepeat } from '@repo/types';

export interface ReminderSheetProps {
  isPresented: boolean;
  onDismiss: () => void;
  targetCount?: number;
  initialDueAt?: string | null;
  initialRepeat?: ReminderRepeat;
  onSave: (dueAt: string, repeat: ReminderRepeat) => void | Promise<void>;
  onClear?: () => void | Promise<void>;
}

interface PresetOption {
  id: string;
  label: string;
  subtitle: string;
  icon: typeof Sun;
  getDate: () => Date;
}

export function ReminderSheet({
  isPresented,
  onDismiss,
  targetCount = 1,
  initialDueAt,
  initialRepeat = 'none',
  onSave,
  onClear,
}: ReminderSheetProps) {
  const colors = useTheme();

  // Compute preset dates
  const presets: PresetOption[] = useMemo(() => {
    return [
      {
        id: 'later_today',
        label: 'Later Today',
        subtitle: '6:00 PM',
        icon: Sunset,
        getDate: () => {
          const d = new Date();
          if (d.getHours() >= 17) {
            d.setHours(d.getHours() + 3, 0, 0, 0);
          } else {
            d.setHours(18, 0, 0, 0);
          }
          return d;
        },
      },
      {
        id: 'tomorrow_morning',
        label: 'Tomorrow Morning',
        subtitle: '9:00 AM',
        icon: Sun,
        getDate: () => {
          const d = new Date();
          d.setDate(d.getDate() + 1);
          d.setHours(9, 0, 0, 0);
          return d;
        },
      },
      {
        id: 'tomorrow_afternoon',
        label: 'Tomorrow Afternoon',
        subtitle: '2:00 PM',
        icon: Clock,
        getDate: () => {
          const d = new Date();
          d.setDate(d.getDate() + 1);
          d.setHours(14, 0, 0, 0);
          return d;
        },
      },
      {
        id: 'next_week',
        label: 'Next Week',
        subtitle: 'Mon 9:00 AM',
        icon: Calendar,
        getDate: () => {
          const d = new Date();
          const daysUntilMonday = ((1 + 7 - d.getDay()) % 7) || 7;
          d.setDate(d.getDate() + daysUntilMonday);
          d.setHours(9, 0, 0, 0);
          return d;
        },
      },
    ];
  }, []);

  const [selectedPresetId, setSelectedPresetId] = useState<string>('tomorrow_morning');
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    if (initialDueAt) {
      const parsed = new Date(initialDueAt);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    return d;
  });
  const [repeat, setRepeat] = useState<ReminderRepeat>(initialRepeat);

  const handleSelectPreset = (preset: PresetOption) => {
    Haptics.selectionAsync();
    setSelectedPresetId(preset.id);
    setSelectedDate(preset.getDate());
  };

  const handleOffsetHours = (hours: number) => {
    Haptics.selectionAsync();
    setSelectedPresetId(`offset_${hours}`);
    const d = new Date();
    d.setHours(d.getHours() + hours);
    setSelectedDate(d);
  };

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

  const formatSelectedPreview = (date: Date) => {
    const today = new Date();
    const isToday =
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();

    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    const isTomorrow =
      date.getDate() === tomorrow.getDate() &&
      date.getMonth() === tomorrow.getMonth() &&
      date.getFullYear() === tomorrow.getFullYear();

    const timeStr = date.toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    });

    if (isToday) return `Today at ${timeStr}`;
    if (isTomorrow) return `Tomorrow at ${timeStr}`;

    return `${date.toLocaleDateString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })} at ${timeStr}`;
  };

  const repeatOptions: { value: ReminderRepeat; label: string }[] = [
    { value: 'none', label: 'Does not repeat' },
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
  ];

  return (
    <OptionSheet
      isPresented={isPresented}
      onDismiss={onDismiss}
      title={
        <View className="flex-row items-center gap-2">
          <Bell size={18} color={colors.primary} />
          <Text className="text-base font-bold text-text">
            {targetCount > 1
              ? `Remind for ${targetCount} notes`
              : 'Set Reminder'}
          </Text>
        </View>
      }
      snapPoints={['full']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
        className="gap-4">
        {/* Presets List */}
        <View className="rounded-2xl bg-background-element border border-border overflow-hidden">
          {presets.map((preset, index) => {
            const isSelected = selectedPresetId === preset.id;
            const Icon = preset.icon;

            return (
              <React.Fragment key={preset.id}>
                {index > 0 && <View className="h-px bg-border/40 mx-4" />}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => handleSelectPreset(preset)}
                  className={`flex-row items-center justify-between p-3.5 px-4 ${
                    isSelected ? 'bg-primary/10' : ''
                  }`}>
                  <View className="flex-row items-center gap-3">
                    <View
                      className={`w-8 h-8 rounded-full items-center justify-center ${
                        isSelected ? 'bg-primary' : 'bg-card'
                      }`}>
                      <Icon
                        size={16}
                        color={isSelected ? '#ffffff' : colors.textSecondary}
                      />
                    </View>
                    <View>
                      <Text
                        className={`text-sm font-semibold ${
                          isSelected ? 'text-primary' : 'text-text'
                        }`}>
                        {preset.label}
                      </Text>
                      <Text className="text-[11px] text-text-secondary">
                        {preset.subtitle}
                      </Text>
                    </View>
                  </View>

                  {isSelected && (
                    <View className="w-5 h-5 rounded-full bg-primary items-center justify-center">
                      <Check size={12} color="#ffffff" strokeWidth={3} />
                    </View>
                  )}
                </TouchableOpacity>
              </React.Fragment>
            );
          })}
        </View>

        {/* Quick Hour Offsets */}
        <View className="gap-1.5">
          <Text className="text-xs font-semibold text-text-secondary uppercase tracking-wider ml-1">
            Quick Timing
          </Text>
          <View className="flex-row gap-2">
            {[1, 2, 4].map((hours) => {
              const id = `offset_${hours}`;
              const isSelected = selectedPresetId === id;
              return (
                <TouchableOpacity
                  key={hours}
                  activeOpacity={0.7}
                  onPress={() => handleOffsetHours(hours)}
                  className={`flex-1 py-2.5 rounded-xl border items-center justify-center ${
                    isSelected
                      ? 'bg-primary/10 border-primary'
                      : 'bg-background-element border-border'
                  }`}>
                  <Text
                    className={`text-xs font-bold ${
                      isSelected ? 'text-primary' : 'text-text'
                    }`}>
                    +{hours} {hours === 1 ? 'hour' : 'hours'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Recurrence Selector */}
        <View className="gap-1.5">
          <Text className="text-xs font-semibold text-text-secondary uppercase tracking-wider ml-1">
            Repeat
          </Text>
          <View className="rounded-xl bg-background-element border border-border p-1 flex-row">
            {repeatOptions.map((opt) => {
              const isSelected = repeat === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  activeOpacity={0.7}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setRepeat(opt.value);
                  }}
                  className={`flex-1 py-2 rounded-lg items-center justify-center ${
                    isSelected ? 'bg-card shadow-xs' : ''
                  }`}>
                  <Text
                    className={`text-xs ${
                      isSelected ? 'font-bold text-text' : 'text-text-secondary'
                    }`}>
                    {opt.label === 'Does not repeat' ? 'None' : opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Scheduled Preview Card */}
        <View className="p-3.5 rounded-xl bg-card border border-border flex-row items-center gap-3">
          <View className="w-8 h-8 rounded-full bg-primary/10 items-center justify-center">
            <Bell size={16} color={colors.primary} />
          </View>
          <View className="flex-1">
            <Text className="text-[11px] text-text-secondary font-medium uppercase tracking-wider">
              Alert Scheduled For
            </Text>
            <Text className="text-sm font-bold text-text">
              {formatSelectedPreview(selectedDate)}
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View className="gap-2.5 mt-2">
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleSave}
            className="w-full h-12 rounded-xl bg-primary items-center justify-center shadow-xs">
            <Text className="text-white font-bold text-sm">
              Save Reminder
            </Text>
          </TouchableOpacity>

          {onClear && (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleClear}
              className="w-full h-11 rounded-xl bg-background-element border border-border items-center justify-center flex-row gap-2">
              <Trash2 size={15} color="#ef4444" />
              <Text className="text-red-500 font-semibold text-xs">
                Clear Reminder
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </OptionSheet>
  );
}
