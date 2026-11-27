import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
} from "react-native";
import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { DefaultChatTransport } from "ai";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { DrawerActions } from "expo-router/build/react-navigation";
import * as Haptics from "expo-haptics";
import { Plus, WifiOff } from "lucide-react-native";
import DrawerLeft from "@/assets/svg/drawer-left.svg";
import { useTheme } from "@/hooks/use-theme";
import { useAuthStore } from "@/lib/auth/auth-store";
import { agentApi } from "@/lib/api/agent.api";
import { useAgentSession } from "@/hooks/use-agent-session";
import {
  ChatMessageList,
  ChatInputBar,
  ChatEmptyState,
  AGENT_HEADER_HEIGHT,
} from "@/components/chat";
import { toast } from "@/lib/toast";

import { fetch as expoFetch } from "expo/fetch";
import { KeyboardGradualAnimation } from "@/components/keyboard-gradual-animation";
import { API_BASE_URL } from "@/lib/api/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { agentQueryKeys } from "@/lib/queries/agents";
import { useNetInfo } from "@react-native-community/netinfo";
import { ThemedText } from "@/components/ui/themed-text";
import { Card } from "@/components/ui/card";
import { HeaderGradient } from "@/hooks/use-header-inset";

interface ChatSessionProps {
  conversationId: string;
  initialMessages: UIMessage[];
  initialInput?: string;
  token: string;
  onTitleUpdate: (title: string) => void;
  onMessagesUpdate: (messages: UIMessage[]) => void;
  onInputChange: (input: string) => void;
  onStatusChange?: (isLoading: boolean) => void;
  initialPrompt?: string;
}

function ChatSessionContent({
  conversationId,
  initialMessages,
  initialInput,
  token,
  onTitleUpdate,
  onMessagesUpdate,
  onInputChange,
  onStatusChange,
  initialPrompt,
}: ChatSessionProps) {
  const [input, setInput] = useState(initialInput || "");

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        fetch: (async (reqInput, init) => {
          const res = await (expoFetch as unknown as typeof globalThis.fetch)(
            reqInput,
            init,
          );
          const headerTitle = res.headers.get("X-Agent-Conversation-Title");
          if (headerTitle) {
            try {
              onTitleUpdate(decodeURIComponent(headerTitle));
            } catch {
              // ignore decode failure
            }
          }
          return res;
        }) as typeof globalThis.fetch,
        api: `${API_BASE_URL}/agent/chat`,
        headers: { Authorization: `Bearer ${token}` },
        prepareSendMessagesRequest: ({ messages, body }) => {
          const rest = { ...(body ?? {}) } as Record<string, unknown>;
          delete rest.id;
          const latestUser = [...messages]
            .reverse()
            .find((m) => m.role === "user");

          return {
            body: {
              ...rest,
              conversationId,
              messages: latestUser ? [latestUser] : messages.slice(-1),
            },
          };
        },
      }),
    [token, conversationId, onTitleUpdate],
  );

  const { messages, sendMessage, status, stop } = useChat({
    transport,
    id: conversationId,
    messages: initialMessages,
    onError: (error: Error) => {
      console.log("[Agent Chat Error]:", error);
      toast.error("Failed to get response from iKeen");
    },
  });

  const isLoading = status === "streaming" || status === "submitted";

  useEffect(() => {
    onStatusChange?.(isLoading);
  }, [isLoading, onStatusChange]);

  // Keep in-memory store in sync with active messages
  useEffect(() => {
    if (messages.length > 0) {
      onMessagesUpdate(messages);
    }
  }, [messages, onMessagesUpdate]);

  const handleInputChange = (text: string) => {
    setInput(text);
    onInputChange(text);
  };

  const handleSendText = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed || isLoading) return;
    setInput("");
    onInputChange("");
    try {
      await sendMessage({ text: trimmed });
    } catch {
      toast.error("Could not send message");
    }
  };

  const handleSelectPrompt = (prompt: string, autoSubmit?: boolean) => {
    if (autoSubmit) {
      handleSendText(prompt);
    } else {
      setInput(prompt);
      onInputChange(prompt);
    }
  };

  useEffect(() => {
    if (initialPrompt && typeof initialPrompt === "string") {
      setTimeout(() => {
        setInput(initialPrompt);
        onInputChange(initialPrompt);
      }, 0);
    }
  }, [initialPrompt, onInputChange]);

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}>
      <ChatMessageList
        messages={messages}
        isLoading={isLoading}
        onEditMessage={handleInputChange}
        ListEmptyComponent={
          <ChatEmptyState onSelectPrompt={handleSelectPrompt} />
        }
      />

      <ChatInputBar
        input={input}
        onChangeText={handleInputChange}
        onSubmit={() => handleSendText(input)}
        isLoading={isLoading}
        onStop={stop}
      />
      <KeyboardGradualAnimation />
    </KeyboardAvoidingView>
  );
}

export default function AgentScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const colors = useTheme();
  const { token } = useAuthStore();
  const { prompt: initialPrompt, conversationId: paramConversationId } =
    useLocalSearchParams<{ prompt?: string; conversationId?: string }>();

  useEffect(() => {
    if (!token) {
      router.replace("/(auth)/login");
    }
  }, [token, router]);

  const { isConnected, isInternetReachable } = useNetInfo();
  const isOnline = isConnected && isInternetReachable;

  // In-memory active session store (preserves session across screen unmount/navigation)
  const {
    session,
    setSession,
    updateTitle,
    updateMessages,
    setInput: setDraftInput,
    setIsStreaming,
    resetSession,
  } = useAgentSession();

  const [isSwitching, setIsSwitching] = useState(false);

  const queryClient = useQueryClient();

  const handleTitleUpdate = useCallback(
    (newTitle: string) => {
      updateTitle(newTitle);
      queryClient.invalidateQueries({
        queryKey: agentQueryKeys.conversations(),
      });
    },
    [queryClient, updateTitle],
  );

  const handleStatusChange = useCallback(
    (loading: boolean) => {
      setIsStreaming(loading);
    },
    [setIsStreaming],
  );

  const handleSelectConversation = useCallback(
    async (id: string) => {
      if (id === session.id) return;

      try {
        setIsSwitching(true);
        const detail = await agentApi.getConversation(id, token);
        const loadedMessages = (detail.messages ||
          (detail as unknown as { uiMessages?: unknown[] }).uiMessages ||
          []) as UIMessage[];

        setSession({
          id: detail.id,
          title: detail.title || "Untitled Chat",
          messages: Array.isArray(loadedMessages) ? loadedMessages : [],
          input: "",
        });
      } catch (error) {
        console.log("[🚨] Failed to load selected conversation:", error);
        toast.error("Failed to load selected conversation");
      } finally {
        setIsSwitching(false);
      }
    },
    [session.id, token, setSession],
  );

  const handleNewChat = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    resetSession();
    router.setParams({ conversationId: undefined });
  }, [resetSession, router]);

  // Listen for conversation selection or new chat trigger from sidebar drawer
  useEffect(() => {
    if (!paramConversationId) return;

    if (paramConversationId === "new") {
      handleNewChat();
      return;
    }

    if (paramConversationId !== session.id && token) {
      void handleSelectConversation(paramConversationId);
    }
  }, [
    handleNewChat,
    handleSelectConversation,
    paramConversationId,
    session.id,
    token,
  ]);

  const handleOpenDrawer = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.dispatch(DrawerActions.openDrawer());
  };

  if (!token) {
    return null;
  }

  return (
    <View className="flex-1 bg-background pt-safe relative">
      {/* 🧭 Header with Drawer Button & New Chat */}

      <View
        className="z-50 px-4 _py-2.5 flex-row items-center absolute top-safe w-full justify-start gap-4"
        style={{ height: AGENT_HEADER_HEIGHT }}>
        <HeaderGradient
          featherOffset={2}
          colors={[colors.background, colors.background, "transparent"]}
          locations={[0.0, 0.35, 1]}
        />

        {/* Left: Drawer Trigger (similar to HomeHeader) */}
        <View className="flex-row items-center gap-3">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open conversations drawer"
            hitSlop={8}
            onPress={handleOpenDrawer}
            className="flex-row gap-2 items-center justify-center active:bg-background-element">
            <DrawerLeft width={20} height={20} color={colors.text} />
            <ThemedText type="title" className="text-xl font-semibold">
              Chats
            </ThemedText>
          </Pressable>
        </View>

        {/* Center: Live Status & Conversation Title */}
        {session.title && (
          <View className="flex-row items-center gap-2 flex-1">
            <Text
              className="font-medium text-base text-text-secondary"
              numberOfLines={1}>
              {session.title}
            </Text>
          </View>
        )}

        {/* Right: New Chat Action */}
        <View className="ml-auto">
          <Pressable
            onPress={handleNewChat}
            hitSlop={8}
            accessibilityLabel="New Conversation">
            <Card className="flex-row items-center px-2.5 py-1.5 rounded-full">
              <Plus size={20} color={colors.text} />
            </Card>
          </Pressable>
        </View>
      </View>

      {!isOnline && !session.messages.length && (
        <View className="absolute w-full top-safe-offset-16 px-5 py-2">
          <View className="bg-background-selected p-8 rounded-4xl flex-row gap-6 items-center">
            <WifiOff color={colors.textSecondary} size={24} />
            <ThemedText className="text-[13px] flex-1">
              Sorry. Ikeen chat is not available at the moment. Please check
              your connection and try again
            </ThemedText>
          </View>
        </View>
      )}
      {/* 💬 Active Keyed Chat Session */}
      {isSwitching ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.text} />
        </View>
      ) : (
        <ChatSessionContent
          key={session.id}
          conversationId={session.id}
          initialMessages={session.messages}
          initialInput={session.input}
          token={token}
          onTitleUpdate={handleTitleUpdate}
          onMessagesUpdate={updateMessages}
          onInputChange={setDraftInput}
          onStatusChange={handleStatusChange}
          initialPrompt={
            typeof initialPrompt === "string" ? initialPrompt : undefined
          }
        />
      )}
    </View>
  );
}
