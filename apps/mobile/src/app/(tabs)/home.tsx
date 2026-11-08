import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { ArrowRight, Sparkles } from "lucide-react-native";

import { Card } from "@/components/ui/card";
import { ThemedText } from "@/components/ui/themed-text";
import { useTheme } from "@/hooks/use-theme";
import { useAuthStore } from "@/lib/auth/auth-store";
import { useLiveNotes } from "@/lib/queries/notes";
import { NoteEmptyCard } from "@/components/notes/note-empty-card";
import { HEADER_HEIGHT, HomeHeader } from "@/components/home/home-header";
import { QuickCaptureBar } from "@/components/home/quick-capture-bar";
import { HomeGlancePills } from "@/components/home/home-glance-pills";
import AppIcon from "@/assets/images/icon.png";
import { NoteGridContainer } from "@/components/notes/notes-grid-container";
import { useHeaderInset } from "@/hooks/use-header-inset";

export default function HomeScreen() {
  const colors = useTheme();
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  const { data: recentNotes = [], isLoading: isRecentLoading } = useLiveNotes({
    limit: 10,
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

  const {insetHeight} = useHeaderInset(HEADER_HEIGHT)
  
  return (
    <View className="flex-1 bg-background">
      {/* 1. Sticky Navigation Header */}
      <HomeHeader  />
      <NoteGridContainer
        data={recentNotes}
        hideControls={true}
        contentStyle={{paddingTop: insetHeight}}
        empty={
          isRecentLoading && recentNotes.length === 0 ? (
            <View className="py-8 items-center justify-center">
              <ActivityIndicator size="small" color={colors.textSecondary} />
            </View>
          ) : (
            <NoteEmptyCard />
          )
        }
        header={
          <View>
            {/* 2. Editorial Greeting & Date (clean sentence case, no uppercase) */}
            <View className="px-4 pt-4">
              <Text className="text-xs font-medium text-text-secondary">
                {formattedDate}
              </Text>
              <ThemedText className="text-2xl text-text mt-2 tracking-tight">
                Hey, {userDisplayName}
              </ThemedText>
              <ThemedText className="font- text-base text-text mt-1 tracking-tight">
                {greeting}
              </ThemedText>
            </View>

            <View className="py-4 gap-4">
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
                  <Card className="p-5 rounded-3xl bg-card border-2 border-primary/60 dark:border-primary/10 relative overflow-hidden">
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
                        <View className="relative rounded-3xl overflow-hidden mr2 h-20 w-20">
                          <Image
                            source={AppIcon}
                            style={{
                              width: "100%",
                              height: "100%",
                            }}
                          />
                        </View>
                        <View>
                          <ThemedText className="font-semibold text-2xl text-text leading-tight">
                            Brainstorm
                          </ThemedText>
                          <ThemedText className="font-semibold text-2xl text-text leading-tight">
                            with iKeen
                          </ThemedText>
                          {/* Sub-Pill: AI Chat */}
                          <View className="mt-3 self-start flex-row items-center gap-1.5 px-3 py-1 rounded-full bg-card border border-border shadow-2xs">
                            <Text className="text-xs font-bold text-text">
                              AI
                            </Text>
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

            <View className="flex-row items-center justify-between px-3 pt-4">
              <ThemedText type="default">
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
          </View>
        }
      />
    </View>
  );
}