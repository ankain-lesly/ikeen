import React, { useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  ArrowRight,
  Cloud,
  FileText,
  Folder,
  Pin,
  Plus,
  Search,
  Sparkles,
} from 'lucide-react-native';

import { ThemedText } from '@/components/ui/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/lib/auth/auth-store';
import { useSyncStore } from '@/lib/sync/use-sync';
import { useLiveNotes, createNote, togglePinNote } from '@/lib/queries/notes';
import { useLiveFolders } from '@/lib/queries/folders';
import { NotebookHeroIllustration, EmptyNotesIllustration } from '@/components/illustrations';
import { formatTimeAgo } from '@repo/utils/date';
import { toast } from '@/lib/toast';

export default function HomeScreen() {
  const colors = useTheme();
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { status: syncStatus, pendingCount } = useSyncStore();

  const { data: allNotes = [] } = useLiveNotes();
  const { data: folders = [] } = useLiveFolders();

  // Compute stats & recent slices
  const pinnedNotes = useMemo(
    () => allNotes.filter((n) => n.isPinned),
    [allNotes]
  );
  const recentNotes = useMemo(
    () => allNotes.slice(0, 5),
    [allNotes]
  );

  // Time-based greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const formattedDate = useMemo(() => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  }, []);

  const userDisplayName = user?.firstName
    ? user.firstName
    : isAuthenticated
    ? 'Creator'
    : 'Guest';

  const userInitials = user
    ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || 'U'
    : 'G';

  const handleCreateNote = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const newNote = await createNote();
      router.push({
        pathname: '/notes/[id]',
        params: { id: newNote.id },
      });
    } catch {
      toast.error('Could not create note');
    }
  };

  const handleNotePress = (id: string) => {
    Haptics.selectionAsync();
    router.push({
      pathname: '/notes/[id]',
      params: { id },
    });
  };

  const handleTogglePin = async (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await togglePinNote(id);
    } catch {
      toast.error('Failed to update pin');
    }
  };

  const syncStatusText = useMemo(() => {
    if (syncStatus === 'syncing') return 'Syncing...';
    if (syncStatus === 'offline') return 'Offline';
    if (pendingCount > 0) return `${pendingCount} Pending`;
    return 'All Synced';
  }, [syncStatus, pendingCount]);

  return (
    <View className="flex-1 bg-background pt-safe">
      {/* 🚀 Header: Greeting, Date & Profile Avatar */}
      <View className="px-5 pb-3 border-b border-border/60 flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            {formattedDate}
          </Text>
          <ThemedText className="font-bold text-2xl text-text tracking-tight mt-0.5">
            {greeting}, {userDisplayName}
          </ThemedText>
        </View>

        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            router.push('/(tabs)/profile');
          }}
          className="w-10 h-10 rounded-full bg-background-element border border-border items-center justify-center active:opacity-75">
          <Text className="text-xs font-bold text-text font-mono">
            {userInitials}
          </Text>
          {/* Subtle Sync Indicator Dot */}
          <View
            className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background"
            style={{
              backgroundColor:
                syncStatus === 'syncing'
                  ? '#3b82f6'
                  : syncStatus === 'offline'
                  ? '#94a3b8'
                  : pendingCount > 0
                  ? '#f59e0b'
                  : colors.primary,
            }}
          />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-1 px-5 pt-4 pb-safe"
        contentContainerClassName="gap-6 pb-20">
        {/* 🎨 Hero Illustration Banner */}
        <View className="p-5 rounded-3xl bg-card border border-border flex-row items-center justify-between shadow-xs overflow-hidden">
          <View className="flex-1 pr-3">
            <View className="flex-row items-center gap-1.5 mb-1.5">
              <Sparkles size={14} color={colors.primary} />
              <Text className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Daily Focus
              </Text>
            </View>
            <ThemedText className="text-base font-bold text-text leading-tight mb-3">
              Capture ideas and drafts seamlessly.
            </ThemedText>

            <Pressable
              onPress={handleCreateNote}
              className="self-start px-3.5 py-2 rounded-xl bg-background-element border border-border flex-row items-center gap-2 active:opacity-70">
              <Plus size={14} color={colors.primary} />
              <Text className="text-xs font-bold text-text">New Note</Text>
            </Pressable>
          </View>

          {/* SVG Vector Graphic */}
          <View className="items-center justify-center">
            <NotebookHeroIllustration width={120} height={95} />
          </View>
        </View>

        {/* 🔍 Search Input Trigger Card */}
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            router.push('/search');
          }}
          className="h-12 px-4 rounded-2xl bg-background-element border border-border flex-row items-center justify-between active:opacity-75">
          <View className="flex-row items-center gap-3">
            <Search size={18} color={colors.textSecondary} />
            <Text className="text-sm text-text-secondary">
              Search notes, tags, or folders...
            </Text>
          </View>
          <View className="px-2 py-0.5 rounded-md bg-background-selected border border-border/80">
            <Text className="text-[10px] font-mono text-text-secondary">
              FIND
            </Text>
          </View>
        </Pressable>

        {/* 🤖 Brainstorm with iKeen Quick Trigger */}
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            router.push('/(tabs)/agent');
          }}
          className="p-3.5 rounded-2xl bg-card border border-border flex-row items-center justify-between active:bg-background-element">
          <View className="flex-row items-center gap-3 flex-1 mr-2">
            <View className="w-8 h-8 rounded-xl bg-background-element border border-border items-center justify-center">
              <Sparkles size={16} color={colors.primary} />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-bold text-text">
                Brainstorm with iKeen
              </Text>
              <Text className="text-xs text-text-secondary" numberOfLines={1}>
                Synthesize notes, extract action items, or plan ideas
              </Text>
            </View>
          </View>
          <View className="px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20">
            <Text className="text-xs font-semibold text-primary">Chat</Text>
          </View>
        </Pressable>

        {/* 📊 Executive Glances Grid (Focused on Foreground/Background) */}
        <View className="gap-2.5">
          <Text className="text-xs font-semibold uppercase tracking-wider text-text-secondary ml-1">
            Overview
          </Text>

          <View className="flex-row flex-wrap gap-3">
            {/* Total Notes */}
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                router.push('/(tabs)/notes');
              }}
              className="flex-1 min-w-[45%] p-4 rounded-2xl bg-card border border-border active:bg-background-element">
              <View className="flex-row items-center justify-between mb-2">
                <View className="w-8 h-8 rounded-lg bg-background-element items-center justify-center">
                  <FileText size={16} color={colors.text} />
                </View>
                <ArrowRight size={14} color={colors.textSecondary} />
              </View>
              <Text className="text-2xl font-bold text-text font-mono">
                {allNotes.length}
              </Text>
              <Text className="text-xs text-text-secondary mt-0.5">
                Total Notes
              </Text>
            </Pressable>

            {/* Pinned Notes */}
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                router.push('/(tabs)/notes');
              }}
              className="flex-1 min-w-[45%] p-4 rounded-2xl bg-card border border-border active:bg-background-element">
              <View className="flex-row items-center justify-between mb-2">
                <View className="w-8 h-8 rounded-lg bg-background-element items-center justify-center">
                  <Pin size={16} color={colors.text} />
                </View>
                <ArrowRight size={14} color={colors.textSecondary} />
              </View>
              <Text className="text-2xl font-bold text-text font-mono">
                {pinnedNotes.length}
              </Text>
              <Text className="text-xs text-text-secondary mt-0.5">
                Pinned Notes
              </Text>
            </Pressable>

            {/* Folders */}
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                router.push('/(tabs)/notes/folders');
              }}
              className="flex-1 min-w-[45%] p-4 rounded-2xl bg-card border border-border active:bg-background-element">
              <View className="flex-row items-center justify-between mb-2">
                <View className="w-8 h-8 rounded-lg bg-background-element items-center justify-center">
                  <Folder size={16} color={colors.text} />
                </View>
                <ArrowRight size={14} color={colors.textSecondary} />
              </View>
              <Text className="text-2xl font-bold text-text font-mono">
                {folders.length}
              </Text>
              <Text className="text-xs text-text-secondary mt-0.5">
                Folders
              </Text>
            </Pressable>

            {/* Cloud Sync Status */}
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                router.push('/(tabs)/profile/sync-outbox');
              }}
              className="flex-1 min-w-[45%] p-4 rounded-2xl bg-card border border-border active:bg-background-element">
              <View className="flex-row items-center justify-between mb-2">
                <View className="w-8 h-8 rounded-lg bg-background-element items-center justify-center">
                  <Cloud size={16} color={colors.text} />
                </View>
                <View
                  className="w-2 h-2 rounded-full"
                  style={{
                    backgroundColor:
                      pendingCount > 0
                        ? '#f59e0b'
                        : syncStatus === 'offline'
                        ? '#94a3b8'
                        : colors.primary,
                  }}
                />
              </View>
              <Text className="text-sm font-bold text-text font-mono" numberOfLines={1}>
                {syncStatusText}
              </Text>
              <Text className="text-xs text-text-secondary mt-0.5">
                Sync Engine
              </Text>
            </Pressable>
          </View>
        </View>

        {/* 📌 Pinned Highlights (If Any) */}
        {pinnedNotes.length > 0 && (
          <View className="gap-2.5">
            <View className="flex-row items-center justify-between px-1">
              <Text className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Pinned Notes
              </Text>
              <Text className="text-xs text-text-secondary font-mono">
                {pinnedNotes.length} pinned
              </Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerClassName="gap-3">
              {pinnedNotes.map((note) => (
                <Pressable
                  key={note.id}
                  onPress={() => handleNotePress(note.id)}
                  className="w-56 p-4 rounded-2xl bg-card border border-border active:bg-background-element justify-between">
                  <View>
                    <View className="flex-row items-center justify-between mb-2">
                      <Pin size={13} color={colors.primary} />
                      <Text className="text-[10px] text-text-secondary font-mono">
                        {formatTimeAgo(note.updatedAt)}
                      </Text>
                    </View>
                    <Text
                      className="text-sm font-bold text-text mb-1"
                      numberOfLines={1}>
                      {note.title.trim() || 'Untitled Note'}
                    </Text>
                    <Text
                      className="text-xs text-text-secondary leading-relaxed"
                      numberOfLines={2}>
                      {note.content.trim() || 'No preview available'}
                    </Text>
                  </View>

                  <View className="flex-row items-center justify-between mt-3 pt-2 border-t border-border/50">
                    <Text className="text-[10px] text-text-secondary uppercase">
                      Open Note
                    </Text>
                    <ArrowRight size={12} color={colors.textSecondary} />
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* 📝 Recent Notes Feed */}
        <View className="gap-2.5">
          <View className="flex-row items-center justify-between px-1">
            <Text className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
              Recent Notes
            </Text>
            {allNotes.length > 0 && (
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  router.push('/(tabs)/notes');
                }}
                className="flex-row items-center gap-1 active:opacity-70">
                <Text className="text-xs font-semibold text-text">See All</Text>
                <ArrowRight size={12} color={colors.text} />
              </Pressable>
            )}
          </View>

          {recentNotes.length === 0 ? (
            /* Illustrated Empty State */
            <View className="p-8 rounded-3xl bg-card border border-border items-center justify-center text-center gap-3">
              <EmptyNotesIllustration width={140} height={110} />
              <ThemedText className="text-base font-bold text-text mt-2">
                Your canvas is empty
              </ThemedText>
              <Text className="text-xs text-text-secondary text-center max-w-[240px]">
                Capture meeting thoughts, daily tasks, or creative sparks in iKeen.
              </Text>
              <Pressable
                onPress={handleCreateNote}
                className="mt-2 px-5 py-2.5 rounded-xl bg-background-element border border-border flex-row items-center gap-2 active:opacity-75">
                <Plus size={15} color={colors.primary} />
                <Text className="text-xs font-bold text-text">
                  Create First Note
                </Text>
              </Pressable>
            </View>
          ) : (
            recentNotes.map((note) => (
              <Pressable
                key={note.id}
                onPress={() => handleNotePress(note.id)}
                className="p-4 rounded-2xl bg-card border border-border flex-row items-center justify-between active:bg-background-element">
                <View className="flex-1 pr-3">
                  <View className="flex-row items-center gap-2 mb-1">
                    <Text
                      className="text-sm font-bold text-text flex-1"
                      numberOfLines={1}>
                      {note.title.trim() || 'Untitled Note'}
                    </Text>
                    {note.isPinned && (
                      <Pin size={12} color={colors.primary} />
                    )}
                  </View>
                  <Text
                    className="text-xs text-text-secondary"
                    numberOfLines={1}>
                    {note.content.trim() || 'Empty note'}
                  </Text>
                </View>

                <View className="items-end gap-1">
                  <Text className="text-[11px] font-mono text-text-secondary">
                    {formatTimeAgo(note.updatedAt)}
                  </Text>
                  <ArrowRight size={13} color={colors.textSecondary} />
                </View>
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}