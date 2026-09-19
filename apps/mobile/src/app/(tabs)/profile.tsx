import React from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  CheckCircle2,
  ChevronRight,
  Cloud,
  FileText,
  Folder,
  HardDrive,
  Info,
  Lock,
  LogOut,
  Moon,
  Pin,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  User,
  UserCheck,
} from 'lucide-react-native';

import { ThemedText } from '@/components/ui/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/lib/auth/auth-store';
import { useLiveNotes } from '@/lib/queries/notes';
import { useLiveFolders } from '@/lib/queries/folders';
import { useSyncStore } from '@/lib/sync/use-sync';
import { syncManager } from '@/lib/sync/sync-manager';

export default function ProfileScreen() {
  const colors = useTheme();
  const { isAuthenticated, user, logout } = useAuthStore();
  const { status: syncStatus, pendingCount, lastSyncedAt } = useSyncStore();

  const { data: notes = [] } = useLiveNotes({ includeArchived: true });
  const { data: folders = [] } = useLiveFolders();

  const pinnedCount = notes.filter((n) => n.isPinned).length;

  const handleOpenAuth = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/(auth)/login');
  };

  const handleSignOut = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
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
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  const userInitials = user
    ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || 'U'
    : 'G';

  return (
    <View className="flex-1 bg-background pt-safe">
      {/* Top Navigation Header */}
      <View className="px-5 pb-3 border-b border-border/70 flex-row items-center justify-between">
        <ThemedText className="font-bold text-2xl text-text tracking-tight">
          Profile
        </ThemedText>
        {isAuthenticated ? (
          <View className="flex-row items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <CheckCircle2 size={12} color="#10b981" />
            <Text className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              Active
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
        contentContainerClassName="gap-5">
        {/* User Identity Card */}
        {isAuthenticated && user ? (
          <>
            <View className="p-5 rounded-3xl bg-card border border-border shadow-xs">
              <View className="flex-row items-center gap-4">
                <View className="w-16 h-16 rounded-2xl bg-primary items-center justify-center shadow-sm">
                  <Text className="text-white text-2xl font-bold font-mono">
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
                  <View className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 items-center justify-center">
                    <Cloud size={20} color={colors.primary} />
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
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    syncManager.sync().catch(() => {});
                  }}
                  disabled={syncStatus === 'syncing'}
                  className="px-3 py-1.5 rounded-xl bg-background-element border border-border flex-row items-center gap-1.5 active:opacity-70">
                  <RefreshCw
                    size={13}
                    color={colors.primary}
                  />
                  <Text className="text-xs font-semibold text-primary">
                    {syncStatus === 'syncing' ? 'Syncing...' : 'Sync Now'}
                  </Text>
                </Pressable>
              </View>
            </View>
          </>
        ) : (
          /* Guest Value Proposition Card */
          <View className="p-5 rounded-3xl bg-card border border-border shadow-xs">
            <View className="flex-row items-center gap-3.5 mb-3">
              <View className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 items-center justify-center">
                <Sparkles size={24} color={colors.primary} />
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
              className="w-full h-11 rounded-xl bg-primary items-center justify-center active:opacity-90 mt-2 shadow-xs">
              <Text className="text-white font-semibold text-sm">
                Sign In or Register
              </Text>
            </Pressable>
          </View>
        )}

        {/* Local Storage Metrics Section */}
        <View className="gap-2.5">
          <Text className="text-xs font-semibold uppercase tracking-wider text-text-secondary ml-1">
            Local Storage
          </Text>

          <View className="p-4 rounded-2xl bg-card border border-border gap-3">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2.5">
                <View className="w-8 h-8 rounded-lg bg-background-element items-center justify-center">
                  <FileText size={16} color={colors.primary} />
                </View>
                <Text className="text-sm font-medium text-text">Total Notes</Text>
              </View>
              <Text className="text-sm font-bold text-text font-mono">
                {notes.length}
              </Text>
            </View>

            <View className="h-px bg-border/60" />

            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2.5">
                <View className="w-8 h-8 rounded-lg bg-background-element items-center justify-center">
                  <Folder size={16} color={colors.primary} />
                </View>
                <Text className="text-sm font-medium text-text">Folders</Text>
              </View>
              <Text className="text-sm font-bold text-text font-mono">
                {folders.length}
              </Text>
            </View>

            <View className="h-px bg-border/60" />

            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2.5">
                <View className="w-8 h-8 rounded-lg bg-background-element items-center justify-center">
                  <Pin size={16} color={colors.primary} />
                </View>
                <Text className="text-sm font-medium text-text">Pinned Notes</Text>
              </View>
              <Text className="text-sm font-bold text-text font-mono">
                {pinnedCount}
              </Text>
            </View>
          </View>
        </View>

        {/* Security & Settings Section */}
        <View className="gap-2.5">
          <Text className="text-xs font-semibold uppercase tracking-wider text-text-secondary ml-1">
            Security & Preferences
          </Text>

          <View className="rounded-2xl bg-card border border-border overflow-hidden">
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                Alert.alert('Folder Passcode', 'Manage folder PIN codes directly inside folder cards.');
              }}
              className="p-3.5 flex-row items-center justify-between active:bg-background-element">
              <View className="flex-row items-center gap-3">
                <Lock size={18} color={colors.textSecondary} />
                <Text className="text-sm font-medium text-text">
                  Folder PIN Protection
                </Text>
              </View>
              <ChevronRight size={16} color={colors.textSecondary} />
            </Pressable>

            <View className="h-px bg-border/60 mx-3.5" />

            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                Alert.alert('Cloud Encryption', 'All synchronized data is securely stored with user-level isolation.');
              }}
              className="p-3.5 flex-row items-center justify-between active:bg-background-element">
              <View className="flex-row items-center gap-3">
                <ShieldCheck size={18} color={colors.textSecondary} />
                <Text className="text-sm font-medium text-text">
                  Privacy & Data Security
                </Text>
              </View>
              <ChevronRight size={16} color={colors.textSecondary} />
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
            className="w-full h-12 rounded-2xl border border-red-500/30 bg-red-500/10 flex-row items-center justify-center gap-2 active:opacity-80 mb-6">
            <LogOut size={18} color="#ef4444" />
            <Text className="text-red-500 font-semibold text-sm">
              Sign Out
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}
