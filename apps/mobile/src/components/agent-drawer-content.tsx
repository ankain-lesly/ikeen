import { useCallback, useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { DrawerContentScrollView } from "expo-router/drawer";
import { useNavigation, useRouter, useLocalSearchParams } from "expo-router";
import { DrawerActions } from "expo-router/build/react-navigation";
import { FileText, Plus, RefreshCw, Sparkles } from "lucide-react-native";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ui/themed-text";
import { useTheme } from "@/hooks/use-theme";
import { HeaderGradient, useHeaderInset } from "@/hooks/use-header-inset";
import {
  useDeleteConversationMutation,
  useInfiniteConversations,
} from "@/lib/queries/agents";
import { ConversationDrawerItem } from "@/components/chat";
import { formatTimeAgo } from "@repo/utils/date";
import { useAgentSession } from "@/hooks/use-agent-session";
import { DrawerNavItemProps, DrawerNavSection } from "./drawer-nav-items";
import { hex2RGBA } from "@repo/utils";

export function AgentDrawerContent(props: any) {
  const colors = useTheme();
  const router = useRouter();
  const navigation = useNavigation();
  const { conversationId: paramConversationId } = useLocalSearchParams<{
    conversationId?: string;
  }>();

  const sessionConversationId = useAgentSession((s) => s.session.id);
  const resetSession = useAgentSession((s) => s.resetSession);
  const activeConversationId = paramConversationId || sessionConversationId;

  // Header insets & gradient
  const { insets, insetHeight, height } = useHeaderInset(40);

  // Native Infinite Query for chat history
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
  } = useInfiniteConversations(20);

  const conversations = useMemo(() => {
    return data?.pages.flatMap((page) => page.conversations ?? []) ?? [];
  }, [data]);

  const deleteMutation = useDeleteConversationMutation();

  // Scroll pagination trigger near bottom
  const handleScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { layoutMeasurement, contentOffset, contentSize } =
        event.nativeEvent;
      const paddingToBottom = 80;
      const isNearBottom =
        layoutMeasurement.height + contentOffset.y >=
        contentSize.height - paddingToBottom;

      if (isNearBottom && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage],
  );

  const closeDrawer = useCallback(() => {
    if (typeof props.navigation?.closeDrawer === "function") {
      props.navigation.closeDrawer();
    } else if (props.navigation?.dispatch) {
      props.navigation.dispatch(DrawerActions.closeDrawer());
    } else {
      navigation.dispatch(DrawerActions.closeDrawer());
    }
  }, [props.navigation, navigation]);

  const handleNewChat = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    closeDrawer();
    resetSession();
    router.setParams({ conversationId: undefined });
  }, [router, closeDrawer, resetSession]);

  const handleSelectConversation = useCallback(
    (id: string) => {
      Haptics.selectionAsync();
      closeDrawer();
      router.setParams({ conversationId: id });
    },
    [router, closeDrawer],
  );

  const handleDeleteConversation = useCallback(
    (id: string, title: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      Alert.alert(
        "Delete Conversation",
        `Are you sure you want to delete "${title || "this conversation"}"?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => {
              deleteMutation.mutate(
                { id, title },
                {
                  onSuccess: () => {
                    if (activeConversationId === id) {
                      handleNewChat();
                    }
                  },
                },
              );
            },
          },
        ],
      );
    },
    [deleteMutation, activeConversationId, handleNewChat],
  );

  // Navigation Items
  const navItems: DrawerNavItemProps[] = useMemo(
    () => [
      {
        name: "New Chat",
        icon: Plus,
        onPress: handleNewChat,
      },
      {
        name: "Notes",
        icon: FileText,
        path: "/notes",
      },
    ],
    [handleNewChat],
  );
  return (
    <View className="flex-1 bg-background">
      {/* Clean Header: Brainstorm + Gradient */}
      <View className="absolute top-0 w-full z-20 pt-safe">
        <HeaderGradient
          featherOffset={2}
          colors={[colors.background, colors.background, "transparent"]}
          locations={[0.0, 0.35, 1]}
        />
        <View
          className="px-5 flex-row items-center justify-between relative"
          style={{ height }}>
          <View className="flex-row items-center gap-2">
            <Sparkles size={18} color={colors.primary} />
            <ThemedText type="title" className="font-normal">
              iKeen Agent
            </ThemedText>
          </View>
        </View>
      </View>

      <DrawerContentScrollView
        {...props}
        onScrollEndDrag={handleScrollEnd}
        onMomentumScrollEnd={handleScrollEnd}
        scrollEventThrottle={16}
        contentContainerStyle={{
          paddingTop: insetHeight + 8,
          paddingBottom: 120,
        }}
        showsVerticalScrollIndicator={false}
        className="flex-1">
        {/* Nav Items */}
        <View className="px-2 pt-4">
          <DrawerNavSection title="Browse" items={navItems} />
        </View>

        {/* History Section Header */}
        <View className="px-2 pt-3 pb-2 flex-row items-center justify-between">
          <ThemedText type="subtitle">Recent Chats</ThemedText>
        </View>
        {/* Conversation List */}
        {isError && conversations.length === 0 ? (
          <View className="py-8 px-4 items-center justify-center gap-3">
            <Text className="text-xs text-text-secondary text-center">
              Unable to load conversation history.
            </Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => refetch()}
              className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-lg bg-background-element border border-border active:opacity-80">
              <RefreshCw size={13} color={colors.text} />
              <Text className="text-xs font-medium text-text">Retry</Text>
            </TouchableOpacity>
          </View>
        ) : isLoading && conversations.length === 0 ? (
          <View className="py-8 px-4 w-full">
            <ActivityIndicator size="small" color={colors.textSecondary} />
          </View>
        ) : conversations.length === 0 ? (
          <View className="py-8 px-4 items-center justify-center">
            <Text className="text-xs text-text-secondary text-center">
              No conversations yet. Start a new chat!
            </Text>
          </View>
        ) : (
          <View className="gap-1">
            {conversations.map((item) => (
              <ConversationDrawerItem
                key={item.id}
                conversation={item}
                isActive={activeConversationId === item.id}
                onSelect={handleSelectConversation}
                onDelete={handleDeleteConversation}
              />
            ))}

            {/* Pagination Loading Indicator */}
            {isFetchingNextPage && (
              <View className="py-3 items-center justify-center">
                <ActivityIndicator size="small" color={colors.textSecondary} />
              </View>
            )}

            {/* Pagination Error Retry */}
            {isError && conversations.length > 0 && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => fetchNextPage()}
                className="py-2.5 items-center justify-center">
                <Text className="text-xs text-primary font-medium">
                  Failed to load more. Tap to retry.
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </DrawerContentScrollView>
      <View
        style={{
          position: "absolute",
          width: "100%",
          bottom: 0,
          height: insets.bottom + 30,
          zIndex: 50,
        }}>
        <HeaderGradient
          colors={[
            "transparent",
            hex2RGBA(colors.background, 0.75),
            hex2RGBA(colors.background, 0.85),
          ]}
          style={{
            ...StyleSheet.absoluteFill,
          }}
        />
      </View>
    </View>
  );
}
