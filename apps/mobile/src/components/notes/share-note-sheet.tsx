import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Share,
  Text,
  TextInput,
  View,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { router } from "expo-router";
import {
  Check,
  Copy,
  Globe,
  Link2,
  Lock,
  RefreshCw,
  Share2,
  Trash2,
} from "lucide-react-native";
import * as Haptics from "@/lib/haptics";
import { useTheme } from "@/hooks/use-theme";
import { useAuthStore } from "@/lib/auth/auth-store";
import { toast } from "@/lib/toast";
import { OptionSheet } from "@/components/ui/option-sheet";
import { AppSwitch } from "@/components/ui/app-switch";
import {
  computeExpiryIso,
  useNoteShare,
  useRevokeShare,
  useUpdateShare,
  useUpsertShare,
  type ShareExpiryPreset,
} from "@/lib/api/shares.api";

interface ShareNoteSheetProps {
  noteId: string;
  noteTitle?: string;
  onShareText?: () => void;
  onCopyText?: () => void;
  isLockedFolder?: boolean;
  isPresented: boolean;
  onDismiss: () => void;
}

const EXPIRY_OPTIONS: Array<{ key: ShareExpiryPreset; label: string }> = [
  { key: "never", label: "Never" },
  { key: "24h", label: "24h" },
  { key: "7d", label: "7d" },
  { key: "30d", label: "30d" },
];

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

function inferExpiryPreset(expiresAt: string | null): ShareExpiryPreset {
  if (!expiresAt) return "never";
  const remainingMs = Date.parse(expiresAt) - Date.now();
  if (Number.isNaN(remainingMs) || remainingMs <= 0) return "never";
  if (remainingMs <= 36 * HOUR_MS) return "24h";
  if (remainingMs <= 10 * DAY_MS) return "7d";
  return "30d";
}

function formatDisplayUrl(url: string): string {
  return url.replace(/^https?:\/\//i, "");
}

export function ShareNoteSheet({
  noteId,
  noteTitle,
  onShareText,
  onCopyText,
  isLockedFolder = false,
  isPresented,
  onDismiss,
}: ShareNoteSheetProps) {
  const colors = useTheme();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const { data: share = null, isLoading } = useNoteShare(
    noteId,
    isPresented && isAuthenticated && !isLockedFolder,
  );
  const upsertShare = useUpsertShare(noteId);
  const updateShare = useUpdateShare(noteId);
  const revokeShare = useRevokeShare(noteId);

  const isBusy =
    upsertShare.isPending || updateShare.isPending || revokeShare.isPending;

  const [optimisticExpiry, setOptimisticExpiry] =
    useState<ShareExpiryPreset | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  // Progressive passcode UI: hidden until switch is enabled or "Change" is tapped
  const [showPasscodeInput, setShowPasscodeInput] = useState(false);
  const [passcodeDraft, setPasscodeDraft] = useState("");

  const selectedExpiry =
    optimisticExpiry ?? inferExpiryPreset(share?.expiresAt ?? null);

  const handleDismiss = useCallback(() => {
    setShowPasscodeInput(false);
    setPasscodeDraft("");
    setOptimisticExpiry(null);
    onDismiss();
  }, [onDismiss]);

  const handleCopyUrl = useCallback(async (url: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Clipboard.setStringAsync(url);
    setCopied(true);
    toast.success("Share link copied");
    setTimeout(() => setCopied(false), 1800);
  }, []);

  const handleShareLinkExternal = useCallback(
    async (url: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      try {
        await Share.share({
          title: noteTitle || "Shared Note",
          message: noteTitle ? `${noteTitle}\n${url}` : url,
          url,
        });
      } catch {
        // User dismissed OS share sheet
      }
    },
    [noteTitle],
  );

  const handleShareNoteText = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onShareText?.();
  }, [onShareText]);

  const handleCopyNoteText = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onCopyText?.();
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 1800);
  }, [onCopyText]);

  const handleCreate = useCallback(() => {
    upsertShare.mutate(
      { access: "view" },
      {
        onSuccess: (created) => {
          setOptimisticExpiry(null);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          void handleCopyUrl(created.url);
        },
        onError: (err) => {
          const msg =
            err instanceof Error ? err.message : "Failed to create share link";
          toast.error(msg);
        },
      },
    );
  }, [upsertShare, handleCopyUrl]);

  const handleToggleAllowCopy = useCallback(
    (allowCopy: boolean) => {
      if (!share) return;
      updateShare.mutate(
        { access: allowCopy ? "copy" : "view" },
        {
          onSuccess: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          },
          onError: () => toast.error("Failed to update permissions"),
        },
      );
    },
    [share, updateShare],
  );

  const handleTogglePasscode = useCallback(
    (enabled: boolean) => {
      if (!share) return;
      if (enabled) {
        setPasscodeDraft("");
        setShowPasscodeInput(true);
        return;
      }

      setShowPasscodeInput(false);
      setPasscodeDraft("");
      if (!share.hasPassword) return;

      updateShare.mutate(
        { password: null },
        {
          onSuccess: () => toast.success("Passcode removed"),
          onError: () => toast.error("Failed to remove passcode"),
        },
      );
    },
    [share, updateShare],
  );

  const handleSavePasscode = useCallback(() => {
    const trimmed = passcodeDraft.trim();
    if (trimmed.length < 4) {
      toast.error("Passcode must be at least 4 characters");
      return;
    }

    updateShare.mutate(
      { password: trimmed },
      {
        onSuccess: () => {
          setPasscodeDraft("");
          setShowPasscodeInput(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          toast.success("Passcode saved");
        },
        onError: () => toast.error("Failed to save passcode"),
      },
    );
  }, [passcodeDraft, updateShare]);

  const handleExpiryPreset = useCallback(
    (preset: ShareExpiryPreset) => {
      if (!share) return;
      setOptimisticExpiry(preset);
      updateShare.mutate(
        { expiresAt: computeExpiryIso(preset) },
        {
          onSuccess: () => {
            setOptimisticExpiry(null);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            toast.success(
              preset === "never" ? "Expiration cleared" : `Expires in ${preset}`,
            );
          },
          onError: () => {
            setOptimisticExpiry(null);
            toast.error("Failed to update expiration");
          },
        },
      );
    },
    [share, updateShare],
  );

  const handleRotate = useCallback(() => {
    if (!share) return;
    updateShare.mutate(
      { rotateSlug: true },
      {
        onSuccess: (updated) => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          toast.success("Link rotated");
          void handleCopyUrl(updated.url);
        },
        onError: () => toast.error("Failed to rotate link"),
      },
    );
  }, [share, updateShare, handleCopyUrl]);

  const handleRevoke = useCallback(() => {
    Alert.alert(
      "Revoke share link",
      "Anyone with the current link will no longer be able to view this note.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Revoke",
          style: "destructive",
          onPress: () => {
            revokeShare.mutate(undefined, {
              onSuccess: () => {
                setOptimisticExpiry(null);
                setShowPasscodeInput(false);
                setPasscodeDraft("");
                Haptics.notificationAsync(
                  Haptics.NotificationFeedbackType.Success,
                );
                toast.success("Share link revoked");
              },
              onError: () => toast.error("Failed to revoke link"),
            });
          },
        },
      ],
    );
  }, [revokeShare]);

  const passcodeSwitchOn = Boolean(share?.hasPassword) || showPasscodeInput;

  const rightHeaderAction =
    onCopyText || onShareText ? (
      <View className="flex-row items-center gap-3">
        {onCopyText && (
          <Pressable
            onPress={handleCopyNoteText}
            accessibilityRole="button"
            accessibilityLabel="Copy note text"
            hitSlop={8}
            className="w-10 h-10 rounded-full items-center justify-center bg-background-element active:opacity-75"
          >
            {copiedText ? (
              <Check size={22} color={colors.primary} />
            ) : (
              <Copy size={22} color={colors.text} />
            )}
          </Pressable>
        )}
        {onShareText && (
          <Pressable
            onPress={handleShareNoteText}
            accessibilityRole="button"
            accessibilityLabel="Share note text"
            hitSlop={8}
            className="w-10 h-10 rounded-full items-center justify-center bg-background-element active:opacity-75"
          >
            <Share2 size={22} color={colors.text} />
          </Pressable>
        )}
      </View>
    ) : undefined;

  return (
    <OptionSheet
      isPresented={isPresented}
      onDismiss={handleDismiss}
      title="Share Note"
      rightHeader={rightHeaderAction}
      snapPoints={["half", "full"]}
    >
      {!isAuthenticated ? (
        <View className="rounded-2xl border border-border bg-background-element p-4 gap-3.5">
          <View className="flex-row items-center gap-3">
            <View
              className="w-9 h-9 rounded-full items-center justify-center"
              style={{ backgroundColor: `${colors.primary}1A` }}
            >
              <Globe size={18} color={colors.primary} />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-semibold text-text">
                Share via live link
              </Text>
              <Text className="text-xs text-text-secondary">
                Sign in to generate web & mobile links, or use the icons above.
              </Text>
            </View>
          </View>
          <Pressable
            onPress={() => {
              handleDismiss();
              router.push("/(auth)/login");
            }}
            className="items-center justify-center rounded-xl py-2.5 active:opacity-80"
            style={{ backgroundColor: colors.primary }}
          >
            <Text className="text-sm font-semibold text-white">Sign in</Text>
          </Pressable>
        </View>
      ) : isLockedFolder ? (
        <View className="flex-row items-start gap-3 rounded-2xl border border-border bg-background-element p-4">
          <Lock size={18} color={colors.textSecondary} />
          <View className="flex-1 gap-0.5">
            <Text className="text-sm font-semibold text-text">
              Locked folder
            </Text>
            <Text className="text-xs leading-5 text-text-secondary">
              Move this note out of its locked folder to create a share link.
            </Text>
          </View>
        </View>
      ) : isLoading ? (
        <View className="items-center justify-center py-10">
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : !share ? (
        <View className="rounded-2xl border border-border bg-background-element p-4 gap-4">
          <View className="flex-row items-center gap-3">
            <View
              className="w-10 h-10 rounded-full items-center justify-center"
              style={{ backgroundColor: `${colors.primary}1A` }}
            >
              <Link2 size={18} color={colors.primary} />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-semibold text-text">
                Share a live link
              </Text>
              <Text className="text-xs text-text-secondary">
                Anyone with the link can read updates in real time.
              </Text>
            </View>
          </View>

          <Pressable
            onPress={handleCreate}
            disabled={isBusy}
            className="flex-row items-center justify-center gap-2 rounded-xl py-3 active:opacity-80"
            style={{ backgroundColor: colors.primary }}
          >
            {upsertShare.isPending ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Link2 size={15} color="#ffffff" />
                <Text className="text-sm font-semibold text-white">
                  Create share link
                </Text>
              </>
            )}
          </Pressable>
        </View>
      ) : (
        <View className="gap-4 pb-3">
          {/* Share Link Row (matches desktop/web UI) */}
          <View className="gap-2">
            <Text className="text-xs font-medium text-text-secondary">
              Share link
            </Text>
            <View className="flex-row items-center gap-2">
              <Pressable
                onPress={() => void handleCopyUrl(share.url)}
                className="flex-1 rounded-xl border border-border bg-background-element px-3 py-2.5 active:opacity-80"
              >
                <Text
                  numberOfLines={1}
                  ellipsizeMode="middle"
                  className="text-xs font-mono text-text"
                >
                  {formatDisplayUrl(share.url)}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => void handleCopyUrl(share.url)}
                accessibilityRole="button"
                accessibilityLabel="Copy share link"
                className="w-10 h-10 rounded-xl items-center justify-center border border-border bg-background-element active:opacity-75"
              >
                {copied ? (
                  <Check size={16} color={colors.primary} />
                ) : (
                  <Copy size={16} color={colors.text} />
                )}
              </Pressable>

              <Pressable
                onPress={() => void handleShareLinkExternal(share.url)}
                accessibilityRole="button"
                accessibilityLabel="Share link"
                className="w-10 h-10 rounded-xl items-center justify-center border border-border bg-card active:opacity-75"
              >
                <Share2 size={16} color={colors.text} />
              </Pressable>
            </View>

            <Text className="text-[11px] text-text-secondary">
              {share.viewCount} {share.viewCount === 1 ? "view" : "views"}
              {share.expiresAt
                ? ` · Expires ${new Date(share.expiresAt).toLocaleDateString()}`
                : " · Never expires"}
              {share.hasPassword ? " · Passcode protected" : ""}
            </Text>
          </View>

          {/* Grouped Settings Card */}
          <View className="rounded-2xl border border-border bg-background-element overflow-hidden">
            {/* Allow Copy */}
            <View className="flex-row items-center justify-between px-3.5 py-3">
              <View className="flex-1 pr-3">
                <Text className="text-sm font-medium text-text">
                  Allow copy
                </Text>
                <Text className="text-[11px] text-text-secondary">
                  Let recipients fork to their workspace
                </Text>
              </View>
              <AppSwitch
                value={share.access === "copy"}
                onValueChange={handleToggleAllowCopy}
                disabled={isBusy}
              />
            </View>

            <View className="h-[1px] bg-border mx-3.5" />

            {/* Passcode Protection */}
            <View className="px-3.5 py-3 gap-2.5">
              <View className="flex-row items-center justify-between">
                <View className="flex-1 pr-3">
                  <Text className="text-sm font-medium text-text">
                    Passcode
                  </Text>
                  <Text className="text-[11px] text-text-secondary">
                    {share.hasPassword
                      ? "Required to view this note"
                      : "Protect link with a passcode"}
                  </Text>
                </View>
                <View className="flex-row items-center gap-3">
                  {share.hasPassword && !showPasscodeInput && (
                    <Pressable
                      onPress={() => {
                        setPasscodeDraft("");
                        setShowPasscodeInput(true);
                      }}
                      disabled={isBusy}
                      hitSlop={6}
                    >
                      <Text
                        className="text-xs font-medium"
                        style={{ color: colors.primary }}
                      >
                        Change
                      </Text>
                    </Pressable>
                  )}
                  <AppSwitch
                    value={passcodeSwitchOn}
                    onValueChange={handleTogglePasscode}
                    disabled={isBusy}
                  />
                </View>
              </View>

              {showPasscodeInput && (
                <View className="flex-row items-center gap-2">
                  <TextInput
                    value={passcodeDraft}
                    onChangeText={setPasscodeDraft}
                    placeholder="Min 4 characters"
                    placeholderTextColor={colors.textSecondary}
                    secureTextEntry
                    autoFocus
                    editable={!isBusy}
                    onSubmitEditing={handleSavePasscode}
                    className="flex-1 rounded-xl border border-border bg-card px-3 py-2 text-sm text-text"
                  />
                  <Pressable
                    onPress={handleSavePasscode}
                    disabled={isBusy || passcodeDraft.trim().length < 4}
                    className="rounded-xl px-3.5 py-2.5 active:opacity-80"
                    style={{
                      backgroundColor: colors.primary,
                      opacity: passcodeDraft.trim().length < 4 ? 0.45 : 1,
                    }}
                  >
                    <Text className="text-xs font-semibold text-white">
                      Save
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>

            <View className="h-[1px] bg-border mx-3.5" />

            {/* Link Expiration Segmented Bar */}
            <View className="px-3.5 py-3 gap-2">
              <Text className="text-xs font-medium text-text-secondary">
                Expires
              </Text>
              <View className="flex-row rounded-xl bg-card p-1 gap-1 border border-border/60">
                {EXPIRY_OPTIONS.map((opt) => {
                  const isSelected = selectedExpiry === opt.key;
                  return (
                    <Pressable
                      key={opt.key}
                      onPress={() => handleExpiryPreset(opt.key)}
                      disabled={isBusy}
                      className="flex-1 items-center rounded-lg py-1.5 active:opacity-75"
                      style={{
                        backgroundColor: isSelected
                          ? `${colors.primary}20`
                          : "transparent",
                        borderWidth: 1,
                        borderColor: isSelected
                          ? colors.primary
                          : "transparent",
                      }}
                    >
                      <Text
                        className="text-xs font-semibold"
                        style={{
                          color: isSelected
                            ? colors.primary
                            : colors.textSecondary,
                        }}
                      >
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>

          {/* Quiet Footer Actions */}
          <View className="flex-row items-center justify-between px-1">
            <Pressable
              onPress={handleRotate}
              disabled={isBusy}
              className="flex-row items-center gap-1.5 py-1.5 px-2 rounded-lg active:opacity-70"
            >
              <RefreshCw size={14} color={colors.textSecondary} />
              <Text className="text-xs font-medium text-text-secondary">
                Rotate link
              </Text>
            </Pressable>

            <Pressable
              onPress={handleRevoke}
              disabled={isBusy}
              className="flex-row items-center gap-1.5 py-1.5 px-2 rounded-lg active:opacity-70"
            >
              <Trash2 size={14} color="#ef4444" />
              <Text className="text-xs font-medium text-red-500">Revoke</Text>
            </Pressable>
          </View>
        </View>
      )}
    </OptionSheet>
  );
}
