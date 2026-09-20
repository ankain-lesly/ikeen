import React from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Host, Switch } from '@expo/ui/jetpack-compose';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  ArrowUpDown,
  Check,
  CheckCircle2,
  ChevronRight,
  Cloud,
  FileText,
  Folder,
  HardDrive,
  Info,
  Laptop,
  Lock,
  LogOut,
  Moon,
  Pin,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Sun,
  User,
  Vibrate,
  Wifi,
} from 'lucide-react-native';

import { ThemedText } from '@/components/ui/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/lib/auth/auth-store';
import { useLiveNotes } from '@/lib/queries/notes';
import { useLiveFolders } from '@/lib/queries/folders';
import { useSyncStore } from '@/lib/sync/use-sync';
import { syncManager } from '@/lib/sync/sync-manager';
import {
  useSettingsStore,
  type AppTheme,
  type DefaultNoteSort,
} from '@/lib/settings/settings-store';

export default function ProfileScreen() {
  const colors = useTheme();
  const { isAuthenticated, user, logout } = useAuthStore();
  const { status: syncStatus, pendingCount, lastSyncedAt } = useSyncStore();
  const {
    theme,
    setTheme,
    defaultSort,
    setDefaultSort,
    hapticsEnabled,
    setHapticsEnabled,
    autoSyncOnCellular,
    setAutoSyncOnCellular,
  } = useSettingsStore();

  const { data: notes = [] } = useLiveNotes({ includeArchived: true });
  const { data: folders = [] } = useLiveFolders();

  const pinnedCount = notes.filter((n) => n.isPinned).length;

  const handleOpenAuth = () => {
    if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/(auth)/login');
  };

  const handleOpenSyncOutbox = () => {
    if (hapticsEnabled) Haptics.selectionAsync();
    router.push('/(tabs)/profile/sync-outbox');
  };

  const handleThemeChange = (newTheme: AppTheme) => {
    if (hapticsEnabled) Haptics.selectionAsync();
    setTheme(newTheme);
  };

  const handleSortCycle = () => {
    if (hapticsEnabled) Haptics.selectionAsync();
    const cycleMap: Record<DefaultNoteSort, DefaultNoteSort> = {
      updatedAt: 'createdAt',
      createdAt: 'title',
      title: 'updatedAt',
    };
    setDefaultSort(cycleMap[defaultSort] || 'updatedAt');
  };

  const handleSignOut = () => {
    if (hapticsEnabled) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out? Your notes will remain safely stored on this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await logout();
            if (hapticsEnabled) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
          },
        },
      ]
    );
  };

  const userInitials = user
    ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || 'U'
    : 'G';

  const sortLabel = {
    updatedAt: 'Recently Edited',
    createdAt: 'Date Created',
    title: 'Title (A-Z)',
  }[defaultSort];

  return (
    <View className="flex-1 bg-background pt-safe">
      {/* Top Navigation Header */}
      <View className="px-5 pb-3 border-b border-border/70 flex-row items-center justify-between">
        <ThemedText className="font-bold text-2xl text-text tracking-tight">
          Profile
        </ThemedText>
        {isAuthenticated ? (
          <View className="flex-row items-center gap-1.5 px-2.5 py-1 rounded-full bg-background-element border border-border">
            <CheckCircle2 size={12} color={colors.primary} />
            <Text className="text-xs font-semibold text-text">
              Active Cloud
            </Text>
          </View>
        ) : (
          <View className="flex-row items-center gap-1 px-2.5 py-1 rounded-full bg-background-element border border-border">
            <User size={12} color={colors.textSecondary} />
            <Text className="text-xs font-medium text-text-secondary">
              Guest Mode
            </Text>
          </View>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-1 px-5 pt-4 pb-safe"
        contentContainerClassName="gap-5 pb-20">
        {/* User Identity Card */}
        {isAuthenticated && user ? (
          <>
            <View className="p-5 rounded-3xl bg-card border border-border shadow-xs">
              <View className="flex-row items-center gap-4">
                <View className="w-16 h-16 rounded-2xl bg-background-element border border-border items-center justify-center shadow-xs">
                  <Text className="text-text text-2xl font-bold font-mono">
                    {userInitials}
                  </Text>
                </View>

                <View className="flex-1">
                  <ThemedText className="text-lg font-bold text-text">
                    {user.firstName} {user.lastName}
                  </ThemedText>
                  <Text className="text-xs text-text-secondary font-mono mt-0.5">
                    @{user.username}
                  </Text>
                  <Text className="text-xs text-text-secondary mt-0.5">
                    {user.email}
                  </Text>
                </View>
              </View>
            </View>

            {/* Cloud Sync Status Card */}
            <View className="p-4 rounded-3xl bg-card border border-border shadow-xs gap-3">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-3">
                  <View className="w-10 h-10 rounded-2xl bg-background-element border border-border items-center justify-center">
                    <Cloud size={18} color={colors.text} />
                  </View>
                  <View>
                    <ThemedText className="text-sm font-bold text-text">
                      Cloud Sync
                    </ThemedText>
                    <Text className="text-xs text-text-secondary">
                      {syncStatus === 'syncing'
                        ? 'Syncing changes...'
                        : syncStatus === 'offline'
                        ? 'Offline • Saved on device'
                        : pendingCount > 0
                        ? `${pendingCount} pending change${pendingCount > 1 ? 's' : ''}`
                        : lastSyncedAt
                        ? `Synced ${new Date(lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                        : 'All changes synced'}
                    </Text>
                  </View>
                </View>

                <Pressable
                  onPress={() => {
                    if (hapticsEnabled) {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                    syncManager.sync().catch(() => {});
                  }}
                  disabled={syncStatus === 'syncing'}
                  className="px-3 py-1.5 rounded-xl bg-background-element border border-border flex-row items-center gap-1.5 active:opacity-70">
                  <RefreshCw
                    size={12}
                    color={colors.primary}
                  />
                  <Text className="text-xs font-semibold text-text">
                    {syncStatus === 'syncing' ? 'Syncing...' : 'Sync Now'}
                  </Text>
                </Pressable>
              </View>

              {/* Direct Link inside Sync Card */}
              <View className="pt-2 border-t border-border/60 flex-row items-center justify-between">
                <Text className="text-[11px] text-text-secondary">
                  Inspect delivery ledger & outbox
                </Text>
                <Pressable
                  onPress={handleOpenSyncOutbox}
                  className="flex-row items-center gap-1 active:opacity-70">
                  <Text className="text-xs font-semibold text-text">
                    View Outbox
                  </Text>
                  <ChevronRight size={13} color={colors.textSecondary} />
                </Pressable>
              </View>
            </View>
          </>
        ) : (
          /* Guest Value Proposition Card */
          <View className="p-5 rounded-3xl bg-card border border-border shadow-xs">
            <View className="flex-row items-center gap-3.5 mb-3">
              <View className="w-12 h-12 rounded-2xl bg-background-element border border-border items-center justify-center">
                <Sparkles size={22} color={colors.primary} />
              </View>
              <View className="flex-1">
                <ThemedText className="text-base font-bold text-text">
                  Unlock Cloud Backup
                </ThemedText>
                <Text className="text-xs text-text-secondary mt-0.5">
                  Sign in to protect and sync your notes across devices.
                </Text>
              </View>
            </View>

            <Pressable
              onPress={handleOpenAuth}
              className="w-full h-11 rounded-xl bg-background-element border border-border items-center justify-center active:opacity-80 mt-2 shadow-xs">
              <Text className="text-text font-semibold text-sm">
                Sign In or Register
              </Text>
            </Pressable>
          </View>
        )}

        {/* 🎨 Theme & Appearance Settings */}
        <View className="gap-2.5">
          <Text className="text-xs font-semibold uppercase tracking-wider text-text-secondary ml-1">
            Appearance
          </Text>

          <View className="p-2 rounded-2xl bg-card border border-border flex-row gap-2">
            {/* System Theme Option */}
            <Pressable
              onPress={() => handleThemeChange('system')}
              className={`flex-1 p-3 rounded-xl border flex-row items-center justify-center gap-2 ${
                theme === 'system'
                  ? 'bg-background-element border-foreground/30 shadow-xs'
                  : 'border-transparent bg-transparent'
              }`}>
              <Laptop
                size={16}
                color={theme === 'system' ? colors.text : colors.textSecondary}
              />
              <Text
                className={`text-xs font-bold ${
                  theme === 'system' ? 'text-text' : 'text-text-secondary'
                }`}>
                System
              </Text>
            </Pressable>

            {/* Light Theme Option */}
            <Pressable
              onPress={() => handleThemeChange('light')}
              className={`flex-1 p-3 rounded-xl border flex-row items-center justify-center gap-2 ${
                theme === 'light'
                  ? 'bg-background-element border-foreground/30 shadow-xs'
                  : 'border-transparent bg-transparent'
              }`}>
              <Sun
                size={16}
                color={theme === 'light' ? colors.text : colors.textSecondary}
              />
              <Text
                className={`text-xs font-bold ${
                  theme === 'light' ? 'text-text' : 'text-text-secondary'
                }`}>
                Light
              </Text>
            </Pressable>

            {/* Dark Theme Option */}
            <Pressable
              onPress={() => handleThemeChange('dark')}
              className={`flex-1 p-3 rounded-xl border flex-row items-center justify-center gap-2 ${
                theme === 'dark'
                  ? 'bg-background-element border-foreground/30 shadow-xs'
                  : 'border-transparent bg-transparent'
              }`}>
              <Moon
                size={16}
                color={theme === 'dark' ? colors.text : colors.textSecondary}
              />
              <Text
                className={`text-xs font-bold ${
                  theme === 'dark' ? 'text-text' : 'text-text-secondary'
                }`}>
                Dark
              </Text>
            </Pressable>
          </View>
        </View>

        {/* ⚙️ Customizations & App Preferences */}
        <View className="gap-2.5">
          <Text className="text-xs font-semibold uppercase tracking-wider text-text-secondary ml-1">
            Customizations
          </Text>

          <View className="rounded-2xl bg-card border border-border overflow-hidden">
            {/* Note Sort Order */}
            <Pressable
              onPress={handleSortCycle}
              className="p-3.5 flex-row items-center justify-between active:bg-background-element">
              <View className="flex-row items-center gap-3">
                <ArrowUpDown size={17} color={colors.textSecondary} />
                <Text className="text-sm font-medium text-text">
                  Default Note Sort
                </Text>
              </View>
              <View className="flex-row items-center gap-1.5">
                <Text className="text-xs text-text-secondary font-mono">
                  {sortLabel}
                </Text>
                <ChevronRight size={14} color={colors.textSecondary} />
              </View>
            </Pressable>

            <View className="h-px bg-border/60 mx-3.5" />

            {/* Haptic Vibrations Toggle */}
            <View className="p-3.5 flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <Vibrate size={17} color={colors.textSecondary} />
                <View>
                  <Text className="text-sm font-medium text-text">
                    Haptic Feedback
                  </Text>
                  <Text className="text-[11px] text-text-secondary">
                    Tactile clicks on gestures and actions
                  </Text>
                </View>
              </View>
              <Host matchContents>
                <Switch
                  value={hapticsEnabled}
                  onCheckedChange={(val) => {
                    if (val) Haptics.selectionAsync();
                    setHapticsEnabled(val);
                  }}
                />
              </Host>
            </View>

            <View className="h-px bg-border/60 mx-3.5" />

            {/* Sync on Mobile Data Toggle */}
            <View className="p-3.5 flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <Wifi size={17} color={colors.textSecondary} />
                <View>
                  <Text className="text-sm font-medium text-text">
                    Sync on Cellular
                  </Text>
                  <Text className="text-[11px] text-text-secondary">
                    Sync changes when Wi-Fi is unavailable
                  </Text>
                </View>
              </View>
              <Host matchContents>
                <Switch
                  value={autoSyncOnCellular}
                  onCheckedChange={(val) => {
                    if (hapticsEnabled) Haptics.selectionAsync();
                    setAutoSyncOnCellular(val);
                  }}
                />
              </Host>
            </View>
          </View>
        </View>

        {/* 💾 Local Storage Metrics Section (With Pending Syncs) */}
        <View className="gap-2.5">
          <Text className="text-xs font-semibold uppercase tracking-wider text-text-secondary ml-1">
            Local Storage
          </Text>

          <View className="p-4 rounded-2xl bg-card border border-border gap-3">
            {/* Total Notes */}
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2.5">
                <View className="w-8 h-8 rounded-lg bg-background-element items-center justify-center">
                  <FileText size={16} color={colors.text} />
                </View>
                <Text className="text-sm font-medium text-text">Total Notes</Text>
              </View>
              <Text className="text-sm font-bold text-text font-mono">
                {notes.length}
              </Text>
            </View>

            <View className="h-px bg-border/60" />

            {/* Folders */}
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2.5">
                <View className="w-8 h-8 rounded-lg bg-background-element items-center justify-center">
                  <Folder size={16} color={colors.text} />
                </View>
                <Text className="text-sm font-medium text-text">Folders</Text>
              </View>
              <Text className="text-sm font-bold text-text font-mono">
                {folders.length}
              </Text>
            </View>

            <View className="h-px bg-border/60" />

            {/* Pinned Notes */}
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2.5">
                <View className="w-8 h-8 rounded-lg bg-background-element items-center justify-center">
                  <Pin size={16} color={colors.text} />
                </View>
                <Text className="text-sm font-medium text-text">Pinned Notes</Text>
              </View>
              <Text className="text-sm font-bold text-text font-mono">
                {pinnedCount}
              </Text>
            </View>

            <View className="h-px bg-border/60" />

            {/* 🔄 Pending Syncs (Local SQLite Outbox Count) */}
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2.5">
                <View className="w-8 h-8 rounded-lg bg-background-element items-center justify-center">
                  <RefreshCw size={16} color={pendingCount > 0 ? '#f59e0b' : colors.text} />
                </View>
                <View>
                  <Text className="text-sm font-medium text-text">Pending Syncs</Text>
                  <Text className="text-[10px] text-text-secondary">Queued outbox mutations</Text>
                </View>
              </View>
              <View
                className="px-2 py-0.5 rounded-full border"
                style={{
                  backgroundColor:
                    pendingCount > 0
                      ? 'rgba(245, 158, 11, 0.1)'
                      : colors.backgroundElement,
                  borderColor:
                    pendingCount > 0
                      ? 'rgba(245, 158, 11, 0.3)'
                      : colors.border,
                }}>
                <Text
                  className="text-xs font-bold font-mono"
                  style={{
                    color: pendingCount > 0 ? '#f59e0b' : colors.textSecondary,
                  }}>
                  {pendingCount > 0 ? `${pendingCount} queued` : '0 (Clean)'}
                </Text>
              </View>
            </View>
          </View>

          {/* 🔗 Dedicated Interactive Link to Sync Outbox Page */}
          <Pressable
            onPress={handleOpenSyncOutbox}
            className="p-4 rounded-2xl bg-card border border-border flex-row items-center justify-between active:bg-background-element shadow-xs">
            <View className="flex-row items-center gap-3">
              <View className="w-10 h-10 rounded-xl bg-background-element border border-border items-center justify-center">
                <HardDrive size={18} color={colors.text} />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-bold text-text">
                  Sync Outbox & Delivery Ledger
                </Text>
                <Text className="text-xs text-text-secondary mt-0.5">
                  Inspect SQLite queue, delivery status, and retry logs
                </Text>
              </View>
            </View>
            <ChevronRight size={16} color={colors.textSecondary} />
          </Pressable>
        </View>

        {/* Security & Settings Section */}
        <View className="gap-2.5">
          <Text className="text-xs font-semibold uppercase tracking-wider text-text-secondary ml-1">
            Security & Protection
          </Text>

          <View className="rounded-2xl bg-card border border-border overflow-hidden">
            <Pressable
              onPress={() => {
                if (hapticsEnabled) Haptics.selectionAsync();
                Alert.alert(
                  'Folder Passcode',
                  'Manage folder PIN codes directly inside folder cards.'
                );
              }}
              className="p-3.5 flex-row items-center justify-between active:bg-background-element">
              <View className="flex-row items-center gap-3">
                <Lock size={17} color={colors.textSecondary} />
                <Text className="text-sm font-medium text-text">
                  Folder PIN Protection
                </Text>
              </View>
              <ChevronRight size={14} color={colors.textSecondary} />
            </Pressable>

            <View className="h-px bg-border/60 mx-3.5" />

            <Pressable
              onPress={() => {
                if (hapticsEnabled) Haptics.selectionAsync();
                Alert.alert(
                  'Cloud Encryption',
                  'All synchronized data is securely stored with user-level isolation.'
                );
              }}
              className="p-3.5 flex-row items-center justify-between active:bg-background-element">
              <View className="flex-row items-center gap-3">
                <ShieldCheck size={17} color={colors.textSecondary} />
                <Text className="text-sm font-medium text-text">
                  Privacy & Data Security
                </Text>
              </View>
              <ChevronRight size={14} color={colors.textSecondary} />
            </Pressable>
          </View>
        </View>

        {/* App Info Card */}
        <View className="p-4 rounded-2xl bg-background-element border border-border/70 flex-row items-center justify-between">
          <View className="flex-row items-center gap-2.5">
            <Info size={16} color={colors.textSecondary} />
            <Text className="text-xs text-text-secondary">iKeen Notes</Text>
          </View>
          <Text className="text-xs text-text-secondary font-mono">v1.0.0</Text>
        </View>

        {/* Sign Out Action (When Authenticated) */}
        {isAuthenticated && (
          <Pressable
            onPress={handleSignOut}
            className="w-full h-12 rounded-2xl border border-red-500/20 bg-red-500/5 flex-row items-center justify-center gap-2 active:opacity-75">
            <LogOut size={16} color="#ef4444" />
            <Text className="text-red-500 font-semibold text-sm">
              Sign Out
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}
