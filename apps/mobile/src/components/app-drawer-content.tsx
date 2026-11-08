import { useCallback, useMemo } from "react";
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { DrawerContentScrollView } from "expo-router/drawer";
import {
  FileText,
  Folder,
  Moon,
  Search,
  Sparkles,
  Sun,
} from "lucide-react-native";

import {
  DrawerNavItemProps,
  DrawerNavSection,
} from "@/components/drawer-nav-items";
import { ThemedText } from "@/components/ui/themed-text";
import { useSettingsStore } from "@/lib/settings/settings-store";
import { useTheme } from "@/hooks/use-theme";
import { useLiveFolders } from "@/lib/queries/folders";
import { useInfiniteRecentNotes, useNotesStats } from "@/lib/queries/notes";
import { RecentNotes } from "@/components/recent-notes";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { hex2RGBA, log } from "@repo/utils";
import { HeaderGradient, useHeaderInset } from "@/hooks/use-header-inset";

export function AppDrawerContent(props: any) {
  const colors = useTheme();
  const { theme, setTheme } = useSettingsStore();

  // Optimized, lightweight reactive queries
  const { activeCount } = useNotesStats();
  const { data: folders = [] } = useLiveFolders();
  const foldersCount = folders.length;

  // Progressive infinite recent notes feed
  const recentNotesPagination = useInfiniteRecentNotes(15);

  // Trigger pagination on user drag release or momentum settle near bottom
  const handleScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { layoutMeasurement, contentOffset, contentSize } =
        event.nativeEvent;
      const paddingToBottom = 80;
      const isNearBottom =
        layoutMeasurement.height + contentOffset.y >=
        contentSize.height - paddingToBottom;

      if (
        isNearBottom &&
        recentNotesPagination.hasMore &&
        !recentNotesPagination.isLoadingMore
      ) {
        recentNotesPagination.loadMore();
      }
    },
    [recentNotesPagination],
  );

  // Navigation Items
  const navItems: DrawerNavItemProps[] = useMemo(
    () => [
      {
        name: "Notes",
        icon: FileText,
        path: "/notes",
        badge: activeCount,
      },
      {
        name: "Folders",
        icon: Folder,
        path: "/folders",
        badge: foldersCount,
      },
      {
        name: "Chat",
        icon: Sparkles,
        path: "/agent",
        badge: "AI",
      },
      {
        name: "Search",
        icon: Search,
        path: "/search",
      },
      // {
      //   name: "Recycle Bin",
      //   icon: Trash2,
      //   path: "/notes/trash",
      //   badge: trashNotesCount > 0 ? trashNotesCount : undefined,
      // },
    ],
    [activeCount, foldersCount],
  );
 
  const { insetHeight, height } = useHeaderInset(40);

  return (
    <View className="flex-1 bg-background">
      {/* Clean Header: iKeen only, no border, no version, no sparkle */}
      <View className="absolute top-0 w-full z-20 pt-safe">
        {/* Gradient */}
        <HeaderGradient
          featherOffset={2}
          colors={[colors.background, colors.background, "transparent"]}
          locations={[0.0, 0.35, 1]}
        />
        {/* Header */}
        <View
          className="px-5 flex-row items-center justify-between relative"
          style={{
            height,
          }}>
          <ThemedText type="title" className="font-normal">
            iKeen
          </ThemedText>

          <View className="px-3 flex-row items-center gap-4 rounded-full">
            {/* Theme Toggle Button */}
            <TouchableOpacity
              onPress={() => {
                const nextTheme = theme === "dark" ? "light" : "dark";
                setTheme(nextTheme);
              }}
              hitSlop={8}
              accessibilityLabel="Toggle Theme">
              {theme === "dark" ? (
                <Sun size={20} color={colors.text} />
              ) : (
                <Moon size={20} color={colors.text} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <DrawerContentScrollView
        {...props}
        onScrollEndDrag={handleScrollEnd}
        onMomentumScrollEnd={handleScrollEnd}
        scrollEventThrottle={16}
        contentContainerStyle={{
          paddingTop: insetHeight,
          paddingBottom: 100,
        }}
        showsVerticalScrollIndicator={false}
        className="flex-1">
        {/* Navigation Section */}
        <View className="px-2 pt-4">
          <DrawerNavSection title="Browse" items={navItems} />
        </View>

        {/* Dedicated Recent Notes Component with Infinite Rendering */}
        <RecentNotes pagination={recentNotesPagination} />
      </DrawerContentScrollView>
    </View>
  );
}
