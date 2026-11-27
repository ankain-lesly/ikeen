import { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Pressable,
  RefreshControl,
  Platform,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { ThemedText } from "@/components/ui/themed-text";
import { useTheme } from "@/hooks/use-theme";
import { toast } from "@/lib/toast";
import {
  Haptics,
  ImpactFeedbackStyle,
  NotificationFeedbackType,
} from "@/lib/haptics";
import { OptionSheet } from "@/components/ui/option-sheet";
import {
  Search,
  ChevronRight,
  X,
  AlertCircle,
  Database,
  User,
  Clock,
  ArrowDown,
  ArrowUp,
  Copy,
} from "lucide-react-native";

import {
  type AuditSeverity,
  type AuditLog,
  type AuditLogFilters,
  SEVERITY_COLORS,
  SEVERITY_LABELS,
  RESOURCE_TYPES,
  useAuditLogsQuery,
} from "@/lib/api/audit.api";
import { formatDate, formatTimeAgo } from "@repo/utils/date";
import { Stack } from "expo-router";
import { BottomSheet } from "@expo/ui";
import { RNHostView } from "@expo/ui/jetpack-compose";
import FilterIcon from "@expo/material-symbols/filter_list.xml";

function SeverityBadge({ severity }: { severity: AuditSeverity }) {
  return (
    <View
      className="px-2 py-0.5 rounded-full border"
      style={{
        backgroundColor: `${SEVERITY_COLORS[severity]}20`,
        borderColor: SEVERITY_COLORS[severity],
      }}>
      <Text
        className="text-xs font-semibold font-mono lowercase"
        style={{
          color: SEVERITY_COLORS[severity],
        }}>
        {SEVERITY_LABELS[severity]}
      </Text>
    </View>
  );
}

function ResourceBadge({
  type,
  id,
}: {
  type?: string | null;
  id?: string | null;
}) {
  const colors = useTheme();
  if (!type) return null;
  return (
    <View
      className="px-2 py-0.5 rounded-full border"
      style={{
        backgroundColor: colors.backgroundElement,
        borderColor: colors.border,
      }}>
      <Text
        className="text-[10px] font-mono"
        style={{
          color: colors.textSecondary,
        }}>
        {type}
        {id ? `·${id.slice(0, 8)}` : ""}
      </Text>
    </View>
  );
}

function LogCard({ log, onPress }: { log: AuditLog; onPress: () => void }) {
  const colors = useTheme();
  const isSystem = log.isSystem;

  return (
    <Pressable
      onPress={onPress}
      className="mb-2"
      accessibilityRole="button"
      accessibilityLabel={`Audit log: ${log.action}`}
      android_ripple={{ color: colors.backgroundElement }}
      style={{
        borderRadius: 18,
        overflow: "hidden",
        backgroundColor: colors.card,
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
      }}>
      <View className="flex-row items-center pl-3 pr-4 py-4">
        {/* Severity accent dot */}
        <View
          style={{
            width: 10,
            height: 10,
            borderRadius: 5,
            marginRight: 14,
            backgroundColor: SEVERITY_COLORS[log.severity] ?? colors.primary,
          }}
        />

        {/* Main log content */}
        <View className="flex-1">
          {/* Top: Action */}
          <Text
            className="font-mono text-base font-bold"
            numberOfLines={1}
            style={{ color: colors.text }}>
            {log.action}
          </Text>

          {/* Middle: Details */}
          <Text
            className="mt-1 text-[13px] leading-[20px]"
            numberOfLines={2}
            ellipsizeMode="tail"
            style={{ color: colors.textSecondary, opacity: 0.95 }}>
            {log.details || (
              <Text
                style={{
                  fontStyle: "italic",
                  color: colors.textSecondary,
                  opacity: 0.66,
                }}>
                No details
              </Text>
            )}
          </Text>

          {/* Bottom: Time, Resource, Severity */}
          <View className="flex-row items-center gap-3 mt-2">
            {/* Timestamp */}
            <View className="flex-row items-center gap-1">
              <Clock size={11} color={colors.textSecondary} />
              <Text
                className="text-xs font-mono"
                style={{ color: colors.textSecondary }}>
                {formatTimeAgo(log.createdAt)}
              </Text>
            </View>
            {/* ResourceBadge, but id is removed */}
            {log.resourceType && (
              <View className="pl-2">
                <ResourceBadge type={log.resourceType} id={null} />
              </View>
            )}
            {/* Severity as an outlined badge */}
            <View className="pl-2">
              <View
                className="px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: `${SEVERITY_COLORS[log.severity]}14`,
                  borderWidth: 1,
                  borderColor: SEVERITY_COLORS[log.severity],
                  alignSelf: "flex-start",
                }}>
                <Text
                  style={{
                    color: SEVERITY_COLORS[log.severity],
                    fontWeight: "bold",
                    fontSize: 10,
                    textTransform: "capitalize",
                  }}>
                  {SEVERITY_LABELS[log.severity]}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Chevron right */}
        <View className="pl-3">
          <ChevronRight size={18} color={colors.textSecondary} />
        </View>
      </View>
    </Pressable>
  );
}

function EmptyState({
  onClearFilters,
  hasFilters,
}: {
  onClearFilters?: () => void;
  hasFilters: boolean;
}) {
  const colors = useTheme();
  return (
    <View className="flex-1 items-center justify-center px-10 min-h-[300px] bg-background">
      <View
        className="w-16 h-16 rounded-full items-center justify-center border"
        style={{
          backgroundColor: colors.backgroundElement,
          borderColor: colors.border,
        }}>
        <Database size={32} color={colors.textSecondary} />
      </View>
      <ThemedText
        type="subtitle"
        className="mt-4"
        style={{ color: colors.text }}>
        {hasFilters ? "No matching logs" : "No audit logs yet"}
      </ThemedText>
      <ThemedText
        type="default"
        className="mt-1"
        style={{ color: colors.textSecondary }}>
        {hasFilters
          ? "Try adjusting your filters to see more results."
          : "Audit logs will appear here when system activity occurs."}
      </ThemedText>
      {hasFilters && onClearFilters && (
        <Pressable
          onPress={onClearFilters}
          className="flex-row items-center gap-1.5 px-4 py-2.5 rounded-2xl border mt-4"
          style={{
            backgroundColor: colors.backgroundElement,
            borderColor: colors.border,
          }}>
          <X size={14} color={colors.text} />
          <Text style={{ color: colors.text }}>Clear filters</Text>
        </Pressable>
      )}
    </View>
  );
}

function ErrorBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <View
      className="flex-row justify-between items-center p-3 rounded-xl border mb-4"
      style={{
        backgroundColor: "#ef444415",
        borderColor: "#ef444440",
      }}>
      <View className="flex-row items-center gap-2 flex-1">
        <AlertCircle size={16} color="#ef4444" />
        <Text style={{ color: "#ef4444", flex: 1 }}>{message}</Text>
      </View>
      <Pressable
        onPress={onRetry}
        className="flex-row items-center gap-1 px-3 py-1.5 rounded-xl">
        <ArrowUp size={12} color="#ef4444" />
        <Text style={{ color: "#ef4444" }}>Retry</Text>
      </Pressable>
    </View>
  );
}

interface FilterSheetProps {
  isPresented: boolean;
  onDismiss: () => void;
  filters: AuditLogFilters;
  onFiltersChange: (filters: AuditLogFilters) => void;
  hasFilters: boolean;
}

function FilterSheet({
  isPresented,
  onDismiss,
  filters,
  onFiltersChange,
  hasFilters,
}: FilterSheetProps) {
  const colors = useTheme();
  const [localFilters, setLocalFilters] = useState<AuditLogFilters>(filters);

  const handleApply = () => {
    onFiltersChange({ ...localFilters, page: 1 });
    onDismiss();
    Haptics.impactAsync(ImpactFeedbackStyle.Medium);
  };

  const handleReset = () => {
    setLocalFilters({});
    Haptics.notificationAsync(NotificationFeedbackType.Warning);
  };

  const severityOptions: { value: AuditSeverity; label: string }[] = [
    { value: "INFO", label: "Info" },
    { value: "WARN", label: "Warning" },
    { value: "ERROR", label: "Error" },
    { value: "CRITICAL", label: "Critical" },
  ];

  return (
    <OptionSheet
      isPresented={isPresented}
      onDismiss={onDismiss}
      title="Filter Logs"
      actions={[]}
      snapPoints={["half", "full"]}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20, gap: 24 }}>
        {/* Header with reset */}
        <View className="flex-row justify-between items-center pb-4 border-b border-border">
          <ThemedText type="subtitle" style={{ color: colors.text }}>
            Filters
          </ThemedText>
          {hasFilters && (
            <Pressable
              onPress={handleReset}
              className="flex-row items-center gap-1 px-3 py-1.5 rounded-lg">
              <ArrowDown size={12} color={colors.textSecondary} />
              <Text style={{ color: colors.textSecondary }}>Reset</Text>
            </Pressable>
          )}
        </View>
        {/* Search */}
        <View className="gap-2">
          <ThemedText
            type="default"
            style={{ color: colors.textSecondary, marginBottom: 8 }}>
            Search
          </ThemedText>
          <View
            className="flex-row items-center px-3 py-3 rounded-xl border"
            style={{
              backgroundColor: colors.backgroundElement,
              borderColor: colors.border,
            }}>
            <Search
              size={18}
              color={colors.textSecondary}
              style={{ marginRight: 8 }}
            />
            <TextInput
              style={{ flex: 1, color: colors.text, fontSize: 16 }}
              placeholder="Search actions, details, resources..."
              placeholderTextColor={colors.textSecondary}
              value={localFilters.search || ""}
              onChangeText={(text) =>
                setLocalFilters({
                  ...localFilters,
                  search: text || undefined,
                })
              }
            />
          </View>
        </View>
        {/* Severity */}
        <View className="gap-2">
          <ThemedText
            type="default"
            style={{ color: colors.textSecondary, marginBottom: 8 }}>
            Severity
          </ThemedText>
          <View className="flex-row flex-wrap gap-2">
            {severityOptions.map((opt) => {
              const isSelected = localFilters.severity === opt.value;
              const color = SEVERITY_COLORS[opt.value];
              return (
                <Pressable
                  key={opt.value}
                  onPress={() =>
                    setLocalFilters({
                      ...localFilters,
                      severity: isSelected ? undefined : opt.value,
                    })
                  }
                  className={`flex-row items-center gap-1 px-3 py-2 rounded-full border`}
                  style={
                    isSelected
                      ? {
                          backgroundColor: `${color}20`,
                          borderColor: color,
                        }
                      : {
                          backgroundColor: colors.backgroundElement,
                          borderColor: colors.border,
                        }
                  }>
                  <View
                    className="w-2 h-2 rounded-full border"
                    style={{
                      backgroundColor: isSelected ? color : "transparent",
                      borderColor: isSelected ? "transparent" : color,
                    }}
                  />
                  <Text
                    style={{
                      color: isSelected ? color : colors.textSecondary,
                    }}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        {/* Resource Type */}
        <View className="gap-2">
          <ThemedText
            type="default"
            style={{ color: colors.textSecondary, marginBottom: 8 }}>
            Resource Type
          </ThemedText>
          <View className="flex-row flex-wrap gap-2">
            {RESOURCE_TYPES.map((opt) => {
              const isSelected = localFilters.resourceType === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() =>
                    setLocalFilters({
                      ...localFilters,
                      resourceType: isSelected ? undefined : opt.value,
                    })
                  }
                  className="flex-row items-center gap-1 px-3 py-2 rounded-full border"
                  style={
                    isSelected
                      ? {
                          backgroundColor: `${colors.primary}20`,
                          borderColor: colors.primary,
                        }
                      : {
                          backgroundColor: colors.backgroundElement,
                          borderColor: colors.border,
                        }
                  }>
                  <Text
                    style={{
                      color: isSelected ? colors.primary : colors.textSecondary,
                    }}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        {/* Apply Button */}
        <Pressable
          onPress={handleApply}
          className="py-3.5 rounded-xl items-center mt-2"
          style={{
            backgroundColor: colors.primary,
          }}>
          <ThemedText
            type="default"
            style={{ color: colors.background, fontWeight: "600" }}>
            Apply Filters
          </ThemedText>
        </Pressable>
      </ScrollView>
    </OptionSheet>
  );
}

interface DetailSheetProps {
  isPresented: boolean;
  onDismiss: () => void;
  log: AuditLog | null;
  onCopyId?: (id: string) => void;
}

function DetailSheet({
  isPresented,
  onDismiss,
  log,
  onCopyId,
}: DetailSheetProps) {
  const colors = useTheme();

  if (!isPresented || !log) return null;

  return (
    <BottomSheet
      isPresented={isPresented}
      onDismiss={onDismiss}
      showDragIndicator
      // snapPoints={snapPoints}
      containerColor={colors.card}>
      <RNHostView>
        <ScrollView className="flex-1 w-full p-4" contentContainerClassName="pb-10" showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View className="flex-row items-center justify-between mb-4">
            <ThemedText type="default">Log Details</ThemedText>
          </View>

          <View className="gap-4 w-full">
            <View className="flex-row justify-between items-start">
              <ThemedText
                type="default"
                style={{ color: colors.textSecondary }}>
                ID
              </ThemedText>
              <View className="flex-row items-center gap-2 flex-1 justify-end">
                <Text
                  className="font-mono text-xs text-right max-w-[70%]"
                  style={{
                    color: colors.text,
                    fontFamily: "monospace",
                  }}>
                  {log.id.slice(0, 8)}...
                </Text>
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(ImpactFeedbackStyle.Light);
                    onCopyId?.(log.id);
                  }}
                  className="p-1">
                  <Copy size={14} color={colors.textSecondary} />
                </Pressable>
              </View>
            </View>
            <View className="flex-row justify-between items-start">
              <ThemedText
                type="default"
                style={{ color: colors.textSecondary }}>
                Action
              </ThemedText>
              <Text
                className="font-mono text-xs text-right max-w-[70%]"
                style={{
                  color: colors.text,
                  fontFamily: "monospace",
                }}>
                {log.action}
              </Text>
            </View>
            <View className="flex-row justify-between items-start">
              <ThemedText
                type="default"
                style={{ color: colors.textSecondary }}>
                Severity
              </ThemedText>
              <SeverityBadge severity={log.severity} />
            </View>
            <View className="flex-row justify-between items-start">
              <ThemedText
                type="default"
                style={{ color: colors.textSecondary }}>
                Created
              </ThemedText>
              <Text
                className="text-xs text-right max-w-[70%]"
                style={{
                  color: colors.text,
                }}>
                {formatDate(log.createdAt)}
              </Text>
            </View>
            <View className="flex-row justify-between items-start">
              <ThemedText
                type="default"
                style={{ color: colors.textSecondary }}>
                System
              </ThemedText>
              <Text
                className="text-xs text-right max-w-[70%]"
                style={{
                  color: colors.text,
                }}>
                {log.isSystem ? "Yes" : "No"}
              </Text>
            </View>
            {log.user && (
              <View className="flex-row justify-between items-start">
                <ThemedText
                  type="default"
                  style={{ color: colors.textSecondary }}>
                  User
                </ThemedText>
                <View className="flex-row items-center gap-2 justify-end flex-1">
                  <View
                    className="w-7 h-7 rounded-full items-center justify-center"
                    style={{
                      backgroundColor: `${colors.primary}20`,
                    }}>
                    <Text
                      style={{
                        color: colors.primary,
                        fontWeight: "bold",
                      }}>
                      {log.user.firstName?.[0] ||
                        log.user.username?.[0] ||
                        log.user.email?.[0] ||
                        "U"}
                    </Text>
                  </View>
                  <View>
                    <Text
                      className="font-mono text-xs text-right"
                      style={{
                        color: colors.text,
                      }}>
                      {log.user.username || log.user.email}
                    </Text>
                    {log.user.firstName && (
                      <Text
                        className="text-[12px]"
                        style={{
                          color: colors.textSecondary,
                          fontSize: 12,
                        }}>
                        {log.user.firstName} {log.user.lastName || ""}
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            )}
            {log.resourceType && (
              <View className="flex-row justify-between items-start">
                <ThemedText
                  type="default"
                  style={{ color: colors.textSecondary }}>
                  Resource
                </ThemedText>
                <View className="flex-row items-center gap-2 flex-1 justify-end">
                  <Text
                    className="font-mono font-bold text-xs text-right"
                    style={{
                      color: colors.primary,
                    }}>
                    {log.resourceType}
                  </Text>
                  {log.resourceId && (
                    <View className="flex-row items-center gap-2 justify-end">
                      <Text
                        className="font-mono text-xs text-right"
                        style={{
                          color: colors.text,
                          fontFamily: "monospace",
                        }}>
                        {log.resourceId.slice(0, 8)}...
                      </Text>
                      <Pressable
                        onPress={() => {
                          Haptics.impactAsync(ImpactFeedbackStyle.Light);
                          onCopyId?.(log.resourceId || "");
                        }}
                        className="p-1">
                        <Copy size={14} color={colors.textSecondary} />
                      </Pressable>
                    </View>
                  )}
                </View>
              </View>
            )}
            <View className="flex-row justify-between items-start">
              <ThemedText
                type="default"
                style={{ color: colors.textSecondary }}>
                Status
              </ThemedText>
              <View className="flex-row items-center gap-2 flex-1 justify-end">
                <View
                  className="w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: log.success ? "#22c55e" : "#ef4444",
                  }}
                />
                <Text
                  className="font-mono text-xs text-right"
                  style={{
                    color: colors.text,
                  }}>
                  {log.success ? "Success" : "Failed"}
                </Text>
              </View>
            </View>
            {log.errorMessage && (
              <View className="flex-row justify-between items-start">
                <ThemedText
                  type="default"
                  style={{ color: colors.textSecondary }}>
                  Error
                </ThemedText>
                <Text
                  className="font-mono text-xs text-right"
                  style={{
                    color: "#ef4444",
                  }}>
                  {log.errorMessage}
                </Text>
              </View>
            )}
            {log.requestPath && (
              <View className="flex-row justify-between items-start">
                <ThemedText
                  type="default"
                  style={{ color: colors.textSecondary }}>
                  Request
                </ThemedText>
                <Text
                  className="font-mono text-xs text-right"
                  style={{
                    color: colors.text,
                  }}>
                  {log.requestMethod} {log.requestPath}
                </Text>
              </View>
            )}
            {log.ipAddress && (
              <View className="flex-row justify-between items-start">
                <ThemedText
                  type="default"
                  style={{ color: colors.textSecondary }}>
                  IP Address
                </ThemedText>
                <Text
                  className="font-mono text-xs text-right"
                  style={{
                    color: colors.text,
                  }}>
                  {log.ipAddress}
                </Text>
              </View>
            )}
            {log.metadata && log.metadata.apiKey && (
              <View className="flex-row justify-between items-start">
                <ThemedText
                  type="default"
                  style={{ color: colors.textSecondary }}>
                  API Key
                </ThemedText>
                <Text
                  className="font-mono text-xs text-right"
                  style={{
                    color: colors.text,
                  }}>
                  {(
                    log.metadata.apiKey as { name?: string; keyPrefix?: string }
                  ).name || "Unnamed key"}
                  {" · "}
                  {(
                    log.metadata.apiKey as { name?: string; keyPrefix?: string }
                  ).keyPrefix || ""}
                </Text>
              </View>
            )}
            {log.details && (
              <View className="flex-row justify-between items-start gap-4 mt-2 pt-2 border-t border-border">
                <ThemedText
                  type="default"
                  style={{ color: colors.textSecondary }}>
                  Details
                </ThemedText>
                <Text
                  className="font-mono text-xs text-right flex-1"
                  style={{
                    color: colors.text,
                  }}>
                  {log.details}
                </Text>
              </View>
            )}
            {log.metadata && Object.keys(log.metadata).length > 0 && (
              <View className="mt-2 pt-2 border-t border-border">
                <ThemedText
                  type="default"
                  style={{ color: colors.textSecondary }}>
                  Metadata
                </ThemedText>
                <ScrollView
                  horizontal
                  className="w-full"
                  showsHorizontalScrollIndicator={false}>
                  <Text
                    className="font-mono text-[11px]"
                    style={{
                      color: colors.text,
                      fontFamily: "monospace",
                      fontSize: 11,
                    }}>
                    {JSON.stringify(log.metadata, null, 2)}
                  </Text>
                </ScrollView>
              </View>
            )}
            {log.changes && Object.keys(log.changes).length > 0 && (
              <View className="mt-2 pt-2 border-t border-border">
                <ThemedText
                  type="default"
                  style={{ color: colors.textSecondary }}>
                  Changes
                </ThemedText>
                <ScrollView
                  horizontal
                  className="w-full"
                  showsHorizontalScrollIndicator={false}>
                  <Text
                    className="font-mono text-[11px]"
                    style={{
                      color: colors.text,
                      fontFamily: "monospace",
                      fontSize: 11,
                    }}>
                    {JSON.stringify(log.changes, null, 2)}
                  </Text>
                </ScrollView>
              </View>
            )}
          </View>
        </ScrollView>
      </RNHostView>
    </BottomSheet>
  );
}

export default function AuditLogsScreen() {
  const colors = useTheme();
  const [filters, setFilters] = useState<AuditLogFilters>({});
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);
  const [detailSheetVisible, setDetailSheetVisible] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [scrolledToBottom, setScrolledToBottom] = useState(false);

  const hasFilters = useMemo(
    () =>
      !!filters.search ||
      !!filters.severity ||
      !!filters.resourceType ||
      !!filters.userId,
    [filters],
  );

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error,
    refetch,
  } = useAuditLogsQuery(filters);

  const logs = useMemo(
    () => (data ? data.pages.flatMap((page) => page.data) : []),
    [data],
  );
  const totalCount = data?.pages?.[0]?.meta.total ?? 0;

  const handleRefresh = useCallback(() => {
    Haptics.impactAsync(ImpactFeedbackStyle.Light);
    refetch();
  }, [refetch]);

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      Haptics.impactAsync(ImpactFeedbackStyle.Light);
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleFilterChange = useCallback((newFilters: AuditLogFilters) => {
    setFilters(newFilters);
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({});
    setFilterSheetVisible(false);
    Haptics.impactAsync(ImpactFeedbackStyle.Medium);
  }, []);

  const handleLogPress = useCallback((log: AuditLog) => {
    setSelectedLog(log);
    setDetailSheetVisible(true);
    Haptics.impactAsync(ImpactFeedbackStyle.Light);
  }, []);

  const handleCopyId = useCallback(async (id: string) => {
    try {
      await Clipboard.setStringAsync(id);
      toast.success("ID copied to clipboard");
    } catch {
      toast.error("Failed to copy ID");
    }
  }, []);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const layoutHeight = event.nativeEvent.layoutMeasurement.height;
      const contentOffset = event.nativeEvent.contentOffset.y;
      const contentHeight = event.nativeEvent.contentSize.height;
      setScrolledToBottom(layoutHeight + contentOffset >= contentHeight - 40);
    },
    [],
  );

  const handleMomentumScrollEnd = useCallback(() => {
    if (scrolledToBottom && hasNextPage && !isFetchingNextPage) {
      Haptics.impactAsync(ImpactFeedbackStyle.Light);
      fetchNextPage();
    }
  }, [scrolledToBottom, hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-background p-safe">
        <ActivityIndicator color={colors.text} size="large" />
      </View>
    );
  }

  if (error && logs.length === 0) {
    return (
      <View className="flex-1 justify-center items-center px-10 bg-background p-safe">
        <View
          className="w-16 h-16 rounded-full items-center justify-center border"
          style={{
            backgroundColor: colors.backgroundElement,
            borderColor: colors.border,
          }}>
          <AlertCircle size={32} color="#ef4444" />
        </View>
        <ThemedText
          type="subtitle"
          style={{ color: colors.text, marginTop: 16 }}>
          Failed to load audit logs
        </ThemedText>
        <ThemedText
          type="default"
          style={{
            color: colors.textSecondary,
            marginTop: 4,
            textAlign: "center",
          }}>
          {error instanceof Error ? error.message : "Unknown error"}
        </ThemedText>
        <Pressable
          onPress={handleRefresh}
          className="flex-row items-center gap-1.5 px-4 py-2.5 rounded-2xl mt-4"
          style={{ backgroundColor: colors.primary }}>
          <ArrowUp size={14} color={colors.background} />
          <Text style={{ color: colors.background, fontWeight: "600" }}>
            Retry
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      {/* Header */}

      <Stack screenOptions={{ title: "Audit logs", headerShown: true }} />

      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon={Platform.OS === "android" ? FilterIcon : "ellipsis.circle"}
          onPress={() => {
            Haptics.selectionAsync();
            setFilterSheetVisible(true);
          }}
        />
      </Stack.Toolbar>

      {/* <View className="pt-safe px-5 flex-row justify-between items-center border-b border-border">
        <ThemedText type="title" style={{ color: colors.text }}>
          Audit Logs
        </ThemedText>
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            setFilterSheetVisible(true);
          }}
          className="p-2 rounded-xl relative">
          <Sliders size={20} color={colors.text} />
          {hasFilters && (
            <View
              className="absolute top-1 right-1 w-2 h-2 rounded-full"
              style={{
                backgroundColor: "#20c659",
              }}
            />
          )}
        </Pressable>
      </View> */}
      {/* Filter Sheet */}
      <FilterSheet
        isPresented={filterSheetVisible}
        onDismiss={() => setFilterSheetVisible(false)}
        filters={filters}
        onFiltersChange={handleFilterChange}
        hasFilters={hasFilters}
      />
      {/* Detail Sheet */}
      <DetailSheet
        isPresented={detailSheetVisible}
        onDismiss={() => setDetailSheetVisible(false)}
        // log={logs[0]}
        log={selectedLog}
        onCopyId={handleCopyId}
      />
      {/* Content */}
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={isFetchingNextPage && !hasNextPage}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            progressBackgroundColor={colors.background}
          />
        }
        onScroll={handleScroll}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        showsVerticalScrollIndicator={false}
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: 100,
        }}>
        {error && logs.length > 0 && (
          <ErrorBanner
            message={
              error instanceof Error ? error.message : "Failed to load page"
            }
            onRetry={handleRefresh}
          />
        )}
        {logs.length === 0 ? (
          <EmptyState
            onClearFilters={hasFilters ? handleClearFilters : undefined}
            hasFilters={hasFilters}
          />
        ) : (
          <>
            {logs.map((log) => (
              <LogCard
                key={log.id}
                log={log}
                onPress={() => handleLogPress(log)}
              />
            ))}
            {hasNextPage && (
              <View className="py-4 items-center">
                {isFetchingNextPage ? (
                  <ActivityIndicator color={colors.text} className="mb-2" />
                ) : (
                  <Pressable
                    onPress={handleLoadMore}
                    className="flex-row items-center gap-2">
                    <ThemedText type="default" style={{ color: colors.text }}>
                      Load more logs
                    </ThemedText>
                    <ArrowDown size={16} color={colors.text} />
                  </Pressable>
                )}
              </View>
            )}
            <View className="py-6 items-center">
              <ThemedText
                type="default"
                style={{ color: colors.textSecondary }}>
                Showing {logs.length} of {totalCount} logs
              </ThemedText>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
