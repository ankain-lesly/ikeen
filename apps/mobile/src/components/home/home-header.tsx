import React, { useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Cloud, Search } from "lucide-react-native";
import * as Haptics from "expo-haptics";

import DrawerLeft from "@/assets/svg/drawer-left.svg";
import { ThemedText } from "@/components/ui/themed-text";
import { useDrawerActions } from "@/components/drawer-nav-items";
import { useAuthStore } from "@/lib/auth/auth-store";
import { useSyncStore } from "@/lib/sync/use-sync";
import { useTheme } from "@/hooks/use-theme";
import { HeaderGradient, useHeaderInset } from "@/hooks/use-header-inset";

export const HEADER_HEIGHT = 44;

export function HomeHeader() {
  const colors = useTheme();
  const router = useRouter();
  const { openDrawer } = useDrawerActions();
  const { user, isAuthenticated } = useAuthStore();
  const { status: syncStatus } = useSyncStore();

  const { height } = useHeaderInset(HEADER_HEIGHT);

  const userInitials = useMemo(() => {
    if (user?.firstName) {
      return `${user.firstName[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase();
    }
    return isAuthenticated ? "U" : "G";
  }, [user, isAuthenticated]);

  const syncDotColor = useMemo(() => {
    if (syncStatus === "syncing") return "#3b82f6";
    if (syncStatus === "offline") return "#94a3b8";
    return "#10b981"; // Emerald green for synced
  }, [syncStatus]);

  // Clean sync status label (no counts)
  const syncStatusText = useMemo(() => {
    if (syncStatus === "syncing") return "Syncing";
    if (syncStatus === "offline") return "Offline";
    return "Synced";
  }, [syncStatus]);

  const handleOpenDrawer = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    openDrawer();
  };

  const handleOpenSearch = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/search");
  };

  const handleOpenProfile = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/(tabs)/profile");
  };

  return (
    <View className="absolute top-0 w-full z-10 pt-safe">
      {/* Gradient */}
      <HeaderGradient />
      {/* Header */}
      <View
        style={{ height }}
        className="px-4 py-2 flex-row items-center justify-between">
        {/* Left: Drawer Trigger + Brand */}
        <View className="flex-row items-center gap-3">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open navigation drawer"
            hitSlop={8}
            onPress={handleOpenDrawer}
            className="flex-row gap-2 items-center justify-center active:bg-background-element">
            <DrawerLeft width={20} height={20} color={colors.text} />
            <ThemedText
              type="title"
              className="text-xl font-semibold tracking-tight">
              iKeen
            </ThemedText>
          </Pressable>
        </View>

        <View className="flex-row items-center gap-1.5 px-2.5 py-1 rounded-full bg-card_border_border-border">
          <Cloud color={syncDotColor} size={16} />
          <Text className="text-xs font-mono text-text-secondary leading-none">
            {syncStatusText}
          </Text>
        </View>

        {/* Right: Search + Profile Avatar */}
        <View className="flex-row items-center gap-4">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Search notes"
            hitSlop={8}
            onPress={handleOpenSearch}>
            <Search size={20} color={colors.textSecondary} />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open profile"
            hitSlop={8}
            onPress={handleOpenProfile}
            className="w-10 h-10 rounded-full bg-background-element border-2 border-text-secondary items-center justify-center active:opacity-75">
            <Text className="text-xs font-bold text-text font-mono">
              {userInitials}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
