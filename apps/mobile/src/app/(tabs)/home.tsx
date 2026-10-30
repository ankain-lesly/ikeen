import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { ArrowRight, Sparkles } from "lucide-react-native";

import { Card } from "@/components/ui/card";
import { ThemedText } from "@/components/ui/themed-text";
import { useTheme } from "@/hooks/use-theme";
import { useAuthStore } from "@/lib/auth/auth-store";
import { useLiveNotes } from "@/lib/queries/notes";
import { NoteCard } from "@/components/notes/note-card";
import { NoteEmptyCard } from "@/components/notes/note-empty-card";
import { HomeHeader } from "@/components/home/home-header";
import { QuickCaptureBar } from "@/components/home/quick-capture-bar";
import { HomeGlancePills } from "@/components/home/home-glance-pills";

export default function HomeScreen() {
  const colors = useTheme();
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  // Reactive note queries
  // const { data: pinnedNotes = []} = useLiveNotes({
  //   pinnedOnly: true,
  //   limit: 6,
  // });

  const { data: recentNotes = [], isLoading: isRecentLoading } = useLiveNotes({
    limit: 8,
    pinnedFirst: false,
    withBlocks: true,
  });

  // Editorial time-based greeting & localized date (no uppercase)
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  const formattedDate = useMemo(() => {
    return new Date().toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
  }, []);

  const userDisplayName = useMemo(() => {
    if (user?.firstName) return user.firstName;
    return isAuthenticated ? "Creator" : "there";
  }, [user, isAuthenticated]);

  return (
    <View className="flex-1 bg-background">
      {/* 1. Sticky Navigation Header */}
      <HomeHeader />

      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-1"
        contentContainerClassName="gap-5 pt-3 pb-28">
        {/* 2. Editorial Greeting & Date (clean sentence case, no uppercase) */}
        <View className="px-4">
          <Text className="text-xs font-medium text-text-secondary">
            {formattedDate}
          </Text>
          <ThemedText className="font-bold text-2xl text-text mt-0.5 tracking-tight">
            {greeting}, {userDisplayName}
          </ThemedText>
        </View>

        {/* 3. Quick Capture Action Bar (uniform icons, no color variations, uses Card) */}
        <QuickCaptureBar />

        {/* 4. Brainstorm with iKeen Card (exact match to image) */}
        <View className="px-4">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Brainstorm with iKeen"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/agent");
            }}
            className="active:opacity-90">
            <Card className="p-5 rounded-3xl bg-primary/70 dark:bg-primary/15 border-2 border-primary/60 dark:border-primary/20 relative overflow-hidden">
              {/* Decorative Large Sparkle on Top-Right */}
              <View className="absolute top-4 right-4 pointer-events-none">
                <Sparkles size={28} color={colors.primary} />
              </View>

              {/* Main Content */}
              <View className="gap-3.5">
                {/* Sparkle Icon + 2-Line Headline */}
                <View className="flex-row items-start gap-2.5">
                  <View className="mt-0.5">
                    <Sparkles size={16} color={colors.primary} />
                  </View>
                  <View>
                    <ThemedText className="font-bold text-2xl text-text leading-tight">
                      Brainstorm
                    </ThemedText>
                    <ThemedText className="font-bold text-2xl text-text leading-tight">
                      with iKeen
                    </ThemedText>
                    {/* Sub-Pill: AI Chat */}
                    <View className="mt-3 self-start flex-row items-center gap-1.5 px-3 py-1 rounded-full bg-card border border-border shadow-2xs">
                      <Text className="text-xs font-bold text-text">AI</Text>
                      {/* <Sparkles size={11} color={colors.primary} /> */}
                      <Text className="text-xs font-medium text-text">
                        Chat
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </Card>
          </Pressable>
        </View>

        {/* 5. Stats Pills (exact match to image: [ 📄 Notes ] [ 📁 Folders ], uses Card) */}
        <HomeGlancePills />

        {/* 6. Pinned Highlights Carousel */}
        {/* {pinnedNotes.length > 0 && (
          <View className="gap-2.5">
            <View className="px-5 flex-row items-center justify-between">
              <ThemedText className="font-bold text-lg text-text">
                Pinned Highlights
              </ThemedText>
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  router.push("/(tabs)/notes");
                }}
                className="flex-row items-center gap-1 active:opacity-70">
                <Text className="text-xs font-medium text-text-secondary">
                  See all
                </Text>
                <ArrowRight size={12} color={colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerClassName="gap-3 px-4">
              {pinnedNotes.map((note) => (
                <NoteCard note={note} key={note.id} className="w-60" />
              ))}
            </ScrollView>
          </View>
        )} */}

        {/* 7. Recent Activity Feed (dynamic loading without blocking full screen) */}
        <View className="gap-2.5 px-4">
          <View className="flex-row items-center justify-between px-1">
            <ThemedText className="font-bold text-lg text-text">
              Recent Activity
            </ThemedText>
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                router.push("/(tabs)/notes");
              }}
              className="flex-row items-center gap-1 active:opacity-70">
              <Text className="text-xs font-medium text-text-secondary">
                See all
              </Text>
              <ArrowRight size={12} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* Loader only reacts on dynamic values */}
          {isRecentLoading && recentNotes.length === 0 ? (
            <View className="py-8 items-center justify-center">
              <ActivityIndicator size="small" color={colors.textSecondary} />
            </View>
          ) : recentNotes.length === 0 ? (
            <NoteEmptyCard hide={false} />
          ) : (
            <View className="gap-2.5">
              {recentNotes.map((note) => (
                <NoteCard note={note} key={note.id} layout="list" />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
