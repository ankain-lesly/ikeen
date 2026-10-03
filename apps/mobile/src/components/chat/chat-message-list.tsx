import React, { useRef, useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, Share, Platform } from 'react-native';
import type { UIMessage } from '@ai-sdk/react';
import { Sparkles, Copy, Check, Share2 } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { MenuView } from '@expo/ui/community/menu';
import { useTheme } from '@/hooks/use-theme';
import { toast } from '@/lib/toast';
import { ChatToolPart } from './chat-tool-part';

interface MessageListProps {
  messages: UIMessage[];
  isLoading: boolean;
  ListEmptyComponent?: React.ReactElement;
  onEditMessage?: (text: string) => void;
}

interface ExtractedTool {
  toolCallId: string;
  toolName: string;
  args?: Record<string, unknown>;
  result?: unknown;
  state?: string;
}

function getMessageText(message: UIMessage): string {
  if (Array.isArray(message.parts)) {
    const textParts = message.parts
      .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
      .map((p) => p.text);
    if (textParts.length > 0) {
      return textParts.join('');
    }
  }
  return ((message as unknown as Record<string, unknown>).content as string) || '';
}

function getToolInvocations(message: UIMessage): ExtractedTool[] {
  const tools: ExtractedTool[] = [];

  if (Array.isArray(message.parts)) {
    for (const part of message.parts) {
      const p = part as Record<string, unknown>;
      if (typeof p.type === 'string' && p.type.startsWith('tool-')) {
        const toolName = p.type.replace(/^tool-/, '');
        tools.push({
          toolCallId: (p.toolCallId as string) || (p.id as string) || '',
          toolName,
          args: (p.input as Record<string, unknown>) ?? (p.args as Record<string, unknown>),
          result: p.output ?? p.result,
          state: p.state as string | undefined,
        });
      } else if (p.toolInvocation) {
        const inv = p.toolInvocation as Record<string, unknown>;
        tools.push({
          toolCallId: (inv.toolCallId as string) || '',
          toolName: (inv.toolName as string) || '',
          args: inv.args as Record<string, unknown> | undefined,
          result: inv.result,
          state: inv.state as string | undefined,
        });
      }
    }
  }

  const legacyInvocations = (message as unknown as Record<string, unknown>).toolInvocations;
  if (Array.isArray(legacyInvocations)) {
    tools.push(...(legacyInvocations as ExtractedTool[]));
  }

  return tools;
}

export function ChatMessageList({
  messages,
  isLoading,
  ListEmptyComponent,
  onEditMessage,
}: MessageListProps) {
  const colors = useTheme();
  const listRef = useRef<FlatList>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Auto-scroll to bottom on new chunks or messages
  useEffect(() => {
    if (messages.length > 0) {
      const timer = setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: true });
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [messages, isLoading]);

  const handleCopy = async (text: string, id?: string) => {
    try {
      Haptics.selectionAsync();
      await Clipboard.setStringAsync(text);
      if (id) {
        setCopiedId(id);
        setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 2000);
      }
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleShare = async (text: string) => {
    try {
      Haptics.selectionAsync();
      await Share.share({
        message: text,
      });
    } catch (error) {
      console.log('Share error:', error);
    }
  };

  const renderItem = ({ item, index }: { item: UIMessage; index: number }) => {
    const isUser = item.role === 'user';
    const textContent = getMessageText(item);
    const toolInvocations = getToolInvocations(item);
    const isLastMessage = index === messages.length - 1;
    const isStreamingThis = isLastMessage && isLoading;

    if (isUser) {
      const bubbleContent = (
        <View className="min-w-0 px-4 py-2.5 rounded-2xl rounded-tr-xs bg-background-element border border-border/80">
          <Text className="shrink text-sm font-normal text-text leading-relaxed">
            {textContent}
          </Text>
        </View>
      );

      // On iOS and Android, use native @expo/ui MenuView with shouldOpenOnLongPress
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        return (
          <View className="mb-4 w-full flex-row justify-end px-4">
            <View className="max-w-[85%] shrink min-w-0">
            <MenuView
              title="Message"
              shouldOpenOnLongPress={true}
              onPressAction={({ nativeEvent }) => {
                if (nativeEvent.event === 'copy') {
                  handleCopy(textContent);
                } else if (nativeEvent.event === 'edit') {
                  onEditMessage?.(textContent);
                }
              }}
              actions={[
                {
                  id: 'copy',
                  title: 'Copy',
                  image: Platform.OS === 'ios' ? 'doc.on.doc' : undefined,
                },
                {
                  id: 'edit',
                  title: 'Edit',
                  image: Platform.OS === 'ios' ? 'pencil' : undefined,
                },
              ]}>
              {bubbleContent}
            </MenuView>
            </View>
          </View>
        );
      }

      // Web fallback
      return (
        <View className="mb-4 w-full flex-row justify-end px-4">
          <Pressable
            className="max-w-[85%] shrink min-w-0"
            onLongPress={() => handleCopy(textContent)}
            delayLongPress={400}>
            {bubbleContent}
          </Pressable>
        </View>
      );
    }

    // Assistant Message
    return (
      <View className="mb-6 w-full min-w-0 px-4">
        {/* Assistant Header Avatar */}
        <View className="flex-row items-center gap-2 mb-2">
          <View className="w-5 h-5 rounded-full bg-background-element border border-border/80 items-center justify-center">
            <Sparkles size={11} color={colors.primary} />
          </View>
          <Text className="text-xs font-medium text-text-secondary tracking-tight">
            iKeen
          </Text>
        </View>

        {/* Tool Invocations (if any) */}
        {toolInvocations.length > 0 && (
          <View className="mb-2.5 pl-7 min-w-0">
            {toolInvocations.map((t, idx) => (
              <ChatToolPart
                key={t.toolCallId || `${item.id}-tool-${idx}`}
                toolName={t.toolName}
                args={t.args}
                result={t.result}
                state={t.state}
              />
            ))}
          </View>
        )}

        {/* Text Content */}
        {textContent ? (
          <View className="pl-7 pr-2 w-full min-w-0">
            <Text className="text-sm font-normal text-text leading-relaxed">
              {textContent}
            </Text>
          </View>
        ) : null}

        {/* Action Row below Agent Message (Copy, Share) */}
        {textContent && !isStreamingThis ? (
          <View className="flex-row items-center gap-1 pl-7 mt-2">
            <Pressable
              onPress={() => handleCopy(textContent, item.id)}
              hitSlop={8}
              accessibilityLabel="Copy message"
              className="w-7 h-7 rounded-lg items-center justify-center bg-transparent active:bg-background-element border border-transparent active:border-border/60">
              {copiedId === item.id ? (
                <Check size={13} color={colors.primary} />
              ) : (
                <Copy size={13} color={colors.textSecondary} />
              )}
            </Pressable>

            <Pressable
              onPress={() => handleShare(textContent)}
              hitSlop={8}
              accessibilityLabel="Share message"
              className="w-7 h-7 rounded-lg items-center justify-center bg-transparent active:bg-background-element border border-transparent active:border-border/60">
              <Share2 size={13} color={colors.textSecondary} />
            </Pressable>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <FlatList
      ref={listRef}
      data={messages}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      className="flex-1 min-w-0"
      contentContainerStyle={{
        flexGrow: 1,
        paddingTop: 16,
        paddingBottom: 20,
      }}
      ListEmptyComponent={ListEmptyComponent}
      ListFooterComponent={
        isLoading && messages[messages.length - 1]?.role === 'user' ? (
          <View className="flex-row items-center gap-2 px-6 py-2">
            <View className="w-5 h-5 rounded-full bg-background-element border border-border/80 items-center justify-center">
              <Sparkles size={11} color={colors.primary} />
            </View>
            <View className="flex-row items-center gap-1.5 ml-1">
              <View className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <Text className="text-xs text-text-secondary">
                Thinking...
              </Text>
            </View>
          </View>
        ) : null
      }
      showsVerticalScrollIndicator={false}
      keyboardDismissMode="interactive"
      keyboardShouldPersistTaps="always"
    />
  );
}
