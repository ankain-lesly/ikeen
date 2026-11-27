import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import {
  AlertCircle,
  ArrowLeft,
  CheckSquare,
  CopyPlus,
  FileText,
  Lock,
  Square,
} from "lucide-react-native";
import type { PublicSharedNote } from "@repo/types/shares";
import { useTheme } from "@/hooks/use-theme";
import { useAuthStore } from "@/lib/auth/auth-store";
import { toast } from "@/lib/toast";
import { ApiError } from "@/lib/api/api-client";
import {
  useForkPublicShare,
  usePublicShare,
  useUnlockPublicShare,
} from "@/lib/api/shares.api";

export default function SharedNoteScreen() {
  const colors = useTheme();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [shareToken, setShareToken] = useState<string | undefined>(undefined);
  const [passcode, setPasscode] = useState("");
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);

  const { data: state, isPending } = usePublicShare(slug, shareToken);
  const unlockMutation = useUnlockPublicShare(slug ?? "");
  const forkMutation = useForkPublicShare();

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)/notes");
    }
  }, []);

  const handleUnlock = useCallback(() => {
    if (!slug || !passcode.trim()) return;
    setUnlockError(null);
    unlockMutation.mutate(passcode, {
      onSuccess: ({ token }) => {
        setShareToken(token);
        setPasscode("");
      },
      onError: () => {
        setUnlockError("Incorrect passcode. Please try again.");
      },
    });
  }, [slug, passcode, unlockMutation]);

  const handleFork = useCallback(
    (note: PublicSharedNote) => {
      if (!isAuthenticated) {
        toast.info("Sign in to save a copy to your workspace");
        router.push("/(auth)/login");
        return;
      }

      setCopyError(null);
      forkMutation.mutate(
        { slug: note.slug, shareToken },
        {
          onSuccess: (res) => {
            toast.success("Saved to your iKeen notes");
            router.replace({
              pathname: "/notes/[id]",
              params: { id: res.noteId },
            });
          },
          onError: (err) => {
            if (err instanceof ApiError && err.status === 403) {
              setCopyError(
                "The author has disabled saving copies of this shared note.",
              );
              return;
            }
            const message =
              err instanceof Error
                ? err.message
                : "Could not save a copy of this note. Please try again.";
            setCopyError(message);
          },
        },
      );
    },
    [isAuthenticated, shareToken, forkMutation],
  );

  if (slug && isPending) {
    return (
      <View className="flex-1 bg-background pt-safe pb-safe items-center justify-center">
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  if (!slug || !state || state.status === "not_found") {
    return (
      <View className="flex-1 bg-background pt-safe pb-safe items-center justify-center px-6 gap-3">
        <Text className="text-lg font-semibold text-text">
          Shared note unavailable
        </Text>
        <Text className="text-xs text-center text-text-secondary">
          This link may have expired, been rotated, or been revoked by its
          owner.
        </Text>
        <Pressable
          onPress={handleBack}
          className="mt-2 px-4 py-2 rounded-xl border border-border bg-background-element active:opacity-75"
        >
          <Text className="text-xs font-medium text-text">Go back</Text>
        </Pressable>
      </View>
    );
  }

  if (state.status === "locked") {
    return (
      <View className="flex-1 bg-background pt-safe pb-safe px-6">
        <View className="flex-row items-center py-3">
          <Pressable onPress={handleBack} hitSlop={8} className="p-1">
            <ArrowLeft size={20} color={colors.text} />
          </Pressable>
        </View>

        <View className="flex-1 justify-center gap-4 pb-16">
          <View className="items-center gap-2">
            <View className="w-11 h-11 rounded-full items-center justify-center border border-border bg-background-element">
              <Lock size={18} color={colors.primary} />
            </View>
            <Text className="text-xl font-bold text-text">Protected note</Text>
            <Text className="text-xs text-center text-text-secondary">
              Enter the passcode shared by the author to view this note.
            </Text>
          </View>

          <TextInput
            value={passcode}
            onChangeText={setPasscode}
            placeholder="Enter passcode"
            placeholderTextColor={colors.textSecondary}
            secureTextEntry
            autoFocus
            editable={!unlockMutation.isPending}
            onSubmitEditing={handleUnlock}
            className="rounded-xl border border-border bg-background-element px-4 py-3 text-sm text-text"
          />
          {unlockError && (
            <Text className="text-xs text-red-500">{unlockError}</Text>
          )}
          <Pressable
            onPress={handleUnlock}
            disabled={unlockMutation.isPending || !passcode.trim()}
            className="items-center justify-center rounded-xl py-3 active:opacity-80"
            style={{
              backgroundColor: colors.primary,
              opacity: !passcode.trim() ? 0.5 : 1,
            }}
          >
            {unlockMutation.isPending ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text className="text-sm font-semibold text-white">
                Unlock note
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    );
  }

  const note = state.data;

  return (
    <View className="flex-1 bg-background pt-safe pb-safe">
      {/* Top Bar */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
        <View className="flex-row items-center gap-3 flex-1 pr-2">
          <Pressable onPress={handleBack} hitSlop={8} className="p-1">
            <ArrowLeft size={20} color={colors.text} />
          </Pressable>
          <View className="flex-1">
            <Text numberOfLines={1} className="text-xs font-medium text-text">
              {note.author.firstName} @{note.author.username}
            </Text>
            <Text className="text-[11px] text-text-secondary">
              Updated {new Date(note.updatedAt).toLocaleDateString()}
            </Text>
          </View>
        </View>

        <Pressable
          onPress={() => handleFork(note)}
          disabled={forkMutation.isPending}
          className="flex-row items-center gap-1.5 rounded-xl px-3 py-1.5 active:opacity-80"
          style={{ backgroundColor: colors.primary }}
        >
          {forkMutation.isPending ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <CopyPlus size={14} color="#ffffff" />
              <Text className="text-xs font-semibold text-white">
                Save Copy
              </Text>
            </>
          )}
        </Pressable>
      </View>

      {/* Read-only Content */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20, gap: 18, paddingBottom: 48 }}
      >
        {copyError && (
          <View className="flex-row items-start gap-2.5 rounded-xl border border-red-500/40 bg-red-500/10 px-3.5 py-3">
            <AlertCircle
              size={16}
              color="#ef4444"
              style={{ marginTop: 2 }}
            />
            <View className="flex-1 gap-0.5">
              <Text className="text-xs font-semibold text-red-500">
                Could not save copy
              </Text>
              <Text className="text-xs leading-4 text-red-500/90">
                {copyError}
              </Text>
            </View>
          </View>
        )}

        <View className="gap-2">
          <Text className="text-2xl font-bold text-text">
            {note.title || "Untitled"}
          </Text>
          {note.tags.length > 0 && (
            <View className="flex-row flex-wrap gap-2">
              {note.tags.map((tag) => (
                <Text
                  key={tag}
                  className="text-xs font-mono text-text-secondary"
                >
                  #{tag}
                </Text>
              ))}
            </View>
          )}
        </View>

        {note.content?.trim() ? (
          <Text selectable className="text-[15px] leading-6 text-text">
            {note.content}
          </Text>
        ) : null}

        {note.blocks.length === 0 && !note.content?.trim() ? (
          <Text className="text-sm italic text-text-secondary">
            This note has no content yet.
          </Text>
        ) : (
          note.blocks.map((block) => {
            if (block.type === "text") {
              return (
                <Text
                  key={block.id}
                  selectable
                  className="text-[15px] leading-6 text-text"
                >
                  {block.content}
                </Text>
              );
            }

            if (block.type === "list") {
              return (
                <View key={block.id} className="gap-2">
                  {block.header && (
                    <Text className="text-sm font-semibold text-text">
                      {block.header}
                    </Text>
                  )}
                  <View className="gap-1.5">
                    {block.content.map((item, idx) => (
                      <View
                        key={item.id}
                        className="flex-row items-start gap-2.5"
                      >
                        {block.listType === "checkbox" ? (
                          item.checked ? (
                            <CheckSquare
                              size={16}
                              color={colors.primary}
                              style={{ marginTop: 3 }}
                            />
                          ) : (
                            <Square
                              size={16}
                              color={colors.textSecondary}
                              style={{ marginTop: 3 }}
                            />
                          )
                        ) : block.listType === "ordered" ? (
                          <Text className="text-xs font-mono text-text-secondary mt-1 min-w-[18px]">
                            {idx + 1}.
                          </Text>
                        ) : (
                          <View
                            className="w-1.5 h-1.5 rounded-full mt-2.5"
                            style={{ backgroundColor: colors.textSecondary }}
                          />
                        )}
                        <Text
                          selectable
                          className="flex-1 text-[15px] leading-6"
                          style={{
                            color:
                              block.listType === "checkbox" && item.checked
                                ? colors.textSecondary
                                : colors.text,
                            textDecorationLine:
                              block.listType === "checkbox" && item.checked
                                ? "line-through"
                                : "none",
                          }}
                        >
                          {item.content}
                        </Text>
                      </View>
                    ))}
                  </View>
                  {block.footer && (
                    <Text className="text-xs text-text-secondary">
                      {block.footer}
                    </Text>
                  )}
                </View>
              );
            }

            if (block.type === "media") {
              const items = block.content.filter((i) => Boolean(i.url));
              if (items.length === 0) return null;

              return (
                <View key={block.id} className="gap-3">
                  {items.map((item) => (
                    <View key={item.id} className="gap-1.5">
                      {item.mediaType === "image" && item.url ? (
                        <Image
                          source={{ uri: item.url }}
                          style={{
                            width: "100%",
                            height: 240,
                            borderRadius: 12,
                          }}
                          contentFit="contain"
                        />
                      ) : item.url ? (
                        <Pressable
                          onPress={() => void Linking.openURL(item.url!)}
                          className="flex-row items-center gap-2 rounded-xl border border-border bg-background-element px-3 py-2.5 active:opacity-75"
                        >
                          <FileText size={16} color={colors.textSecondary} />
                          <Text
                            numberOfLines={1}
                            className="flex-1 text-xs font-medium text-text"
                          >
                            {item.name ?? "Open attachment"}
                          </Text>
                        </Pressable>
                      ) : null}
                      {item.caption && (
                        <Text className="text-xs text-text-secondary">
                          {item.caption}
                        </Text>
                      )}
                    </View>
                  ))}
                </View>
              );
            }

            return null;
          })
        )}
      </ScrollView>
    </View>
  );
}
