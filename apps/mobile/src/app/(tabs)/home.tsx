import React, { useMemo } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import {
  ArrowRight,
  Cloud,
  FileText,
  Folder,
  Pin,
  Plus,
  Sparkles,
} from "lucide-react-native";

import { ThemedText } from "@/components/ui/themed-text";
import { useTheme } from "@/hooks/use-theme";
import { useAuthStore } from "@/lib/auth/auth-store";
import { useSyncStore } from "@/lib/sync/use-sync";
import { useLiveNotes,  } from "@/lib/queries/notes";
import { useLiveFolders } from "@/lib/queries/folders";
import { NotebookHeroIllustration } from "@/components/illustrations";
import { NoteCard } from "@/components/notes/note-card";
import { NoteEmptyCard } from "@/components/notes/note-empty-card";

export default function HomeScreen() {
  const colors = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();
  const { status: syncStatus, pendingCount } = useSyncStore();

  const { data: allNotes = [] } = useLiveNotes();
  const { data: folders = [] } = useLiveFolders();
  // const allNotes = [];

  // Sort notes by pinned first, then by other criteria if needed
  // Compute stats & recent slices
  const recentNotes = useMemo(
    () =>
      allNotes
        .sort((a, b) => {
          if (a.isPinned === b.isPinned) return 0;
          return a.isPinned ? -1 : 1;
        })
        .slice(0, 5),
    [allNotes],
  );

  const pinnedNotesCount = useMemo(
    () => allNotes.filter((n) => n.isPinned).slice(0, 5).length,
    [allNotes],
  );

  // // Time-based greeting
  // const greeting = useMemo(() => {
  //   const hour = new Date().getHours();
  //   if (hour < 12) return "Good morning";
  //   if (hour < 18) return "Good afternoon";
  //   return "Good evening";
  // }, []);

  // const formattedDate = useMemo(() => {
  //   return new Date().toLocaleDateString("en-US", {
  //     weekday: "long",
  //     month: "short",
  //     day: "numeric",
  //   });
  // }, []);

  // const userDisplayName = user?.firstName
  //   ? user.firstName
  //   : isAuthenticated
  //     ? "Creator"
  //     : "Guest";

  // const userInitials = user
  //   ? `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase() ||
  //     "U"
  //   : "G";

  const handleCreateNote =  () => {
    router.push("/notes/create")
  };

  const syncStatusText = useMemo(() => {
    if (syncStatus === "syncing") return "Syncing...";
    if (syncStatus === "offline") return "Offline";
    if (pendingCount > 0) return `${pendingCount} Pending`;
    return "All Synced";
  }, [syncStatus, pendingCount]);

  return (
    <View className="flex-1 bg-background pt-safe">
      {/* 🚀 Header: Greeting, Date & Profile Avatar */}
      {/* TODO: --- Design better and large header */}
      {/* <View className="px-5 pb-3 border-b border-border/60 flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            {formattedDate}
          </Text>
          <ThemedText className="font-bold text-2xl text-text mt-0.5">
            {greeting}, {userDisplayName}
          </ThemedText>
        </View>

        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            router.push("/(tabs)/profile");
          }}
          className="w-10 h-10 rounded-full bg-background-element border border-border items-center justify-center active:opacity-75">
          <Text className="text-xs font-bold text-text font-mono">
            {userInitials}
          </Text>
        // Subtle Sync Indicator Dot 
          <View
            className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background"
            style={{
              backgroundColor:
                syncStatus === "syncing"
                  ? "#3b82f6"
                  : syncStatus === "offline"
                    ? "#94a3b8"
                    : pendingCount > 0
                      ? "#f59e0b"
                      : colors.primary,
            }}
          />
        </Pressable>
      </View> */}

      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-1 pt-4 pb-safe"
        contentContainerClassName="gap-6 pb-20">
        {/* 🎨 Hero Illustration Banner */}
        <View className="px-5">
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
                className="self-start px-3.5 py-2 rounded-xl bg-foreground flex-row items-center gap-2 active:opacity-70">
                <Plus size={16} color={colors.background} />
                <Text className="text-sm font-bold text-background">
                  Add a note
                </Text>
              </Pressable>
            </View>

            {/* SVG Vector Graphic */}
            <View className="items-center justify-center">
              <NotebookHeroIllustration width={120} height={95} />
            </View>
          </View>
        </View>

        {/* 🤖 Brainstorm with iKeen Quick Trigger */}
        <View className="gap-2.5 px-8">
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              router.push("/agent");
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
                <Text className="text-xs text-text-secondary">
                  Synthesize notes, extract action items, or plan ideas
                </Text>
              </View>
            </View>
            <View className="px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20">
              <Text className="text-xs font-semibold text-primary">Chat</Text>
            </View>
          </Pressable>
        </View>

        {/* 📊 Executive Glances Grid (Focused on Foreground/Background) */}
        {allNotes.length > 0 && (
          <View className="gap-2.5 px-5">
            <ThemedText type="smallBold">Overview</ThemedText>

            <View className="flex-row flex-wrap gap-3">
              {/* Total Notes */}
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  router.push("/(tabs)/notes");
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
                  router.push("/(tabs)/notes");
                }}
                className="flex-1 min-w-[45%] p-4 rounded-2xl bg-card border border-border active:bg-background-element">
                <View className="flex-row items-center justify-between mb-2">
                  <View className="w-8 h-8 rounded-lg bg-background-element items-center justify-center">
                    <Pin size={16} color={colors.text} />
                  </View>
                  <ArrowRight size={14} color={colors.textSecondary} />
                </View>
                <Text className="text-2xl font-bold text-text font-mono">
                  {pinnedNotesCount}
                </Text>
                <Text className="text-xs text-text-secondary mt-0.5">
                  Pinned Notes
                </Text>
              </Pressable>

              {/* Folders */}
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  router.push("/(tabs)/notes/folders");
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
                onPress={user?.type ==="admin" ? () => {
                  Haptics.selectionAsync();
                  router.push("/(tabs)/profile/sync-outbox");
                } : undefined}
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
                          ? "#f59e0b"
                          : syncStatus === "offline"
                            ? "#94a3b8"
                            : colors.primary,
                    }}
                  />
                </View>
                <Text
                  className="text-sm font-bold text-text font-mono"
                  numberOfLines={1}>
                  {syncStatusText}
                </Text>
                <Text className="text-xs text-text-secondary mt-0.5">
                  Sync Engine
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* 📌 Pinned Highlights (If Any) */}
        {allNotes.length > 0 && (
          <View className="gap-2.5">
            <View className="px-6 flex-row items-center justify-between">
              <ThemedText type="smallBold">Recent Notes</ThemedText>
              <View className="flex-row gap-2 items-center">
                {pinnedNotesCount > 0 && (
                  <Text className="text-xs text-text-secondary font-mono">
                    {pinnedNotesCount} pinned
                  </Text>
                )}

                <Pressable
                  onPress={() => {
                    Haptics.selectionAsync();
                    router.push("/(tabs)/notes");
                  }}
                  className="flex-row items-center gap-1 active:opacity-70">
                  <Text className="text-xs font-semibold text-text">
                    See All
                  </Text>
                  <ArrowRight size={12} color={colors.text} />
                </Pressable>
              </View>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerClassName="gap-3 px-5">
              {recentNotes.map((note) => (
                <NoteCard note={note} key={note.id} className="w-56" />
              ))}
            </ScrollView>
          </View>
        )}
        {/* 📝 Recent Notes Feed */}
        <NoteEmptyCard hide={allNotes.length > 0} />
      </ScrollView>
    </View>
  );
}
