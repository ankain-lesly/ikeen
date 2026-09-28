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
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import * as Crypto from "expo-crypto";
import { ChevronLeft, Clock, Plus, WifiOff } from "lucide-react-native";
import { useTheme } from "@/hooks/use-theme";
import { useAuthStore } from "@/lib/auth/auth-store";
import { agentApi } from "@/lib/api/agent-api";
import {
  ChatMessageList,
  ChatInputBar,
  ChatEmptyState,
  ConversationDrawer,
} from "@/components/chat";
import { toast } from "@/lib/toast";
import { fetch as expoFetch } from "expo/fetch";
import { KeyboardGradualAnimation } from "@/components/keyboard-gradual-animation";
import { API_BASE_URL } from "@/lib/api/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { agentQueryKeys } from "@/lib/queries/agents";
import { useNetInfo } from "@react-native-community/netinfo";
import { ThemedText } from "@/components/ui/themed-text";

interface ActiveSession {
  id: string;
  title: string;
  initialMessages: UIMessage[];
}

interface ChatSessionProps {
  conversationId: string;
  initialMessages: UIMessage[];
  token: string | null;
  onTitleUpdate: (title: string) => void;
  onStatusChange?: (isLoading: boolean) => void;
  initialPrompt?: string;
}

function ChatSessionContent({
  conversationId,
  initialMessages,
  token,
  onTitleUpdate,
  onStatusChange,
  initialPrompt,
}: ChatSessionProps) {
  const [input, setInput] = useState("");

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
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        prepareSendMessagesRequest: ({ messages, body }) => {
          const rest = { ...(body ?? {}) } as Record<string, unknown>;
          delete rest.id;
          return {
            body: {
              ...rest,
              conversationId,
              messages,
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

  const handleSendText = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed || isLoading) return;
    setInput("");
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
    }
  };

  useEffect(() => {
    if (initialPrompt && typeof initialPrompt === "string") {
      setTimeout(() => {
        setInput(initialPrompt);
      }, 0);
    }
  }, [initialPrompt]);

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}>
      <ChatMessageList
        messages={messages}
        isLoading={isLoading}
        onEditMessage={setInput}
        ListEmptyComponent={
          <ChatEmptyState onSelectPrompt={handleSelectPrompt} />
        }
      />

      <ChatInputBar
        input={input}
        onChangeText={setInput}
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
  const colors = useTheme();
  const { token } = useAuthStore();
  const { prompt: initialPrompt } = useLocalSearchParams<{ prompt?: string }>();

  const { isConnected, isInternetReachable } = useNetInfo();
  const isOnline = isConnected && isInternetReachable;

  const [session, setSession] = useState<ActiveSession>(() => ({
    id: Crypto.randomUUID(),
    title: "Brainstorm",
    initialMessages: [],
  }));
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);

  const queryClient = useQueryClient();

  const handleTitleUpdate = useCallback(
    (newTitle: string) => {
      setSession((prev) => ({ ...prev, title: newTitle }));
      queryClient.invalidateQueries({
        queryKey: agentQueryKeys.conversations(),
      });
    },
    [queryClient],
  );

  const handleStatusChange = useCallback((loading: boolean) => {
    setIsStreaming(loading);
  }, []);

  const handleSelectConversation = async (id: string) => {
    setIsDrawerVisible(false);
    if (id === session.id) return;

    try {
      setIsSwitching(true);
      const detail = await agentApi.getConversation(id, token);
      const loadedMessages = (detail.messages ||
        (detail as unknown as { uiMessages?: unknown[] }).uiMessages ||
        []) as UIMessage[];

      setSession({
        id: detail.id,
        title: detail.title || "Brainstorm",
        initialMessages: Array.isArray(loadedMessages) ? loadedMessages : [],
      });
    } catch (error) {
      console.error("Failed to load selected conversation:", error);
      toast.error("Failed to load selected conversation");
    } finally {
      setIsSwitching(false);
    }
  };

  const handleNewChat = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsDrawerVisible(false);
    setSession({
      id: Crypto.randomUUID(),
      title: "Brainstorm",
      initialMessages: [],
    });
  };

  return (
    <View className="flex-1 bg-background pt-safe">
      {/* 🧭 Minimal Deep-Focused Header */}
      <View className="px-4 py-2.5 flex-row items-center justify-between bg-background">
        {/* Left: Back Button */}
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            router.back();
          }}
          hitSlop={10}
          className="w-9 h-9 rounded-full items-center justify-center bg-background-element border border-border/80 active:bg-background-selected">
          <ChevronLeft size={20} color={colors.text} />
        </Pressable>

        {/* Center: Title & Live Status */}
        <View className="flex-row items-center gap-2 max-w-[55%]">
          <View
            className={`w-2 h-2 rounded-full ${
              isStreaming ? "bg-primary animate-pulse" : "bg-primary"
            }`}
          />
          <Text
            className="text-sm font-semibold text-text tracking-tight"
            numberOfLines={1}>
            {session.title}
          </Text>
        </View>

        {/* Right: History & New Chat Actions */}
        <View className="flex-row items-center gap-1.5">
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              setIsDrawerVisible(true);
            }}
            hitSlop={8}
            accessibilityLabel="Chat History"
            className="w-9 h-9 rounded-full items-center justify-center">
            <Clock size={16} color={colors.text} />
          </Pressable>

          <Pressable
            onPress={handleNewChat}
            hitSlop={8}
            accessibilityLabel="New Conversation"
            className="w-9 h-9 rounded-full items-center justify-center">
            <Plus size={17} color={colors.text} />
          </Pressable>
        </View>
      </View>

      {!isOnline && !session.initialMessages.length && (
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
          <ActivityIndicator size="small" color={colors.primary} />
          <Text className="text-xs text-text-secondary mt-2">
            Loading conversation...
          </Text>
        </View>
      ) : (
        <ChatSessionContent
          key={session.id}
          conversationId={session.id}
          initialMessages={session.initialMessages}
          token={token}
          onTitleUpdate={handleTitleUpdate}
          onStatusChange={handleStatusChange}
          initialPrompt={
            typeof initialPrompt === "string" ? initialPrompt : undefined
          }
        />
      )}

      {/* 📁 Slide-over Conversation Drawer (@expo/ui Host + BottomSheet) */}
      <ConversationDrawer
        isVisible={isDrawerVisible}
        // isVisible={true}
        onClose={() => setIsDrawerVisible(false)}
        activeConversationId={session.id}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
      />
    </View>
  );
}
