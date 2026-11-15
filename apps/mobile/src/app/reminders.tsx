import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Bell, ChevronLeft, SquarePen } from "lucide-react-native";

import DrawerLeft from "@/assets/svg/drawer-left.svg";

import { ThemedText } from "@/components/ui/themed-text";
import { useTheme } from "@/hooks/use-theme";
import { useLiveNotes } from "@/lib/queries/notes";
import { NoteGridContainer } from "@/components/notes/notes-grid-container";
import { useDrawerActions } from "@/components/drawer-nav-items";
import * as Haptics from "@/lib/haptics";

function ReminderEmptyState() {
  const router = useRouter();
  const colors = useTheme();

  const handleCreateNote = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/notes/create");
  };

  return (
    <View className="py-20 items-center justify-center text-center gap-3 px-6">
      <Bell size={78} color={colors.textSecondary} strokeWidth={1} />

      <Text className="text-base text-text-secondary text-center max-w-64 leading-relaxed">
        Notes with scheduled reminders will appear here.
      </Text>
      <Pressable
        onPress={handleCreateNote}
        accessibilityRole="button"
        accessibilityLabel="Create Note"
        className="mt-3 px-5 py-2.5 rounded-xl bg-foreground flex-row items-center gap-2 active:opacity-75">
        <SquarePen size={18} color={colors.background} />
        <Text className="text-sm font-bold text-background">Create a Note</Text>
      </Pressable>
    </View>
  );
}

export default function RemindersScreen() {
  const colors = useTheme();
  const router = useRouter();
  const { openDrawer } = useDrawerActions();

  // Query notes with active, uncompleted reminders
  const { data: notes = [], isLoading } = useLiveNotes({
    remindersOnly: true,
    withBlocks: true,
  });

  // const handleCreateNote = () => {
  //   Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  //   router.push("/notes/create");
  // };

  const handleBackOrDrawer = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (router.canGoBack()) {
      router.back();
    } else {
      openDrawer();
    }
  };

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <View className="pt-safe px-4 pb-2 border-b border-border bg-background">
        <View className="flex-row items-center justify-between h-12">
          {/* Left: Nav Back or Drawer */}
          <View className="flex-row items-center gap-2.5">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Navigation back"
              onPress={handleBackOrDrawer}
              hitSlop={8}
              className="items-center justify-center">
              {router.canGoBack() ? (
                <ChevronLeft size={20} color={colors.text} />
              ) : (
                <DrawerLeft width={20} height={20} color={colors.text} />
              )}
            </Pressable>

            {/* Title & Badge */}
            <View className="flex-row items-center gap-2">
              <ThemedText className="text-lg font-semibold text-text">
                Reminders
              </ThemedText>
              {notes.length > 0 && (
                <View className="px-2 py-0.5 rounded-full bg-primary/15">
                  <Text className="text-[11px] font-bold text-primary">
                    {notes.length}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Right: Quick Note Action */}
          {/* <Pressable
            accessibilityRole="button"
            accessibilityLabel="New Note"
            onPress={handleCreateNote}
            hitSlop={8}
            className="w-10 h-10 items-center justify-center rounded-full bg-primary active:opacity-85 shadow-xs">
            <SquarePen size={18} color="#ffffff" />
          </Pressable> */}
        </View>
      </View>

      {/* Loading state or Grid Container */}
      {isLoading && notes.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <NoteGridContainer data={notes} empty={<ReminderEmptyState />} />
      )}
    </View>
  );
}
