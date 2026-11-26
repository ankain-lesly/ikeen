import React, { useState, useMemo, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  useWindowDimensions,
  Modal,
  TouchableWithoutFeedback,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { desc } from "drizzle-orm";
import { syncOutbox, type SyncOutboxItem } from "@/db/schema";
import { db } from "@/db/client";
import { router } from "expo-router";
import {
  ChevronLeft,
  Trash2,
  RefreshCw,
  Send,
  Search,
  Copy,
  Check,
  AlertCircle,
  LogIn,
  X,
  Code2,
} from "lucide-react-native";
import { clearSuccessfulOutbox, retryFailedOutbox } from "@/lib/sync/outbox";
import { syncManager } from "@/lib/sync/sync-manager";
import { useSyncStore } from "@/lib/sync/use-sync";
import { useAuthStore } from "@/lib/auth/auth-store";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "@/lib/haptics";

type StatusFilter = "all" | "pending" | "in_flight" | "failed" | "success";

export default function SyncMonitorPage() {
  const { width } = useWindowDimensions();
  const isLargeScreen = width > 768;

  // 1. Fetch live reactive rows chronologically
  const { data: outboxRows } = useLiveQuery(
    db.select().from(syncOutbox).orderBy(desc(syncOutbox.createdAt)),
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [syncFeedback, setSyncFeedback] = useState<{
    type: "error" | "success";
    message: string;
  } | null>(null);

  const syncStatus = useSyncStore((s) => s.status);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // 2. Computed Ledger Metrics Calculations
  const metrics = useMemo(() => {
    const counts = { pending: 0, in_flight: 0, failed: 0, success: 0 };
    outboxRows?.forEach((row) => {
      if (row.status in counts) {
        counts[row.status as keyof typeof counts]++;
      }
    });
    return counts;
  }, [outboxRows]);

  // 3. Filtered rows by status & search
  const filteredRows = useMemo(() => {
    if (!outboxRows) return [];
    return outboxRows.filter((row) => {
      if (statusFilter !== "all" && row.status !== statusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesEntity = row.entity.toLowerCase().includes(q);
        const matchesAction = row.action.toLowerCase().includes(q);
        const matchesEntityId = row.entityId.toLowerCase().includes(q);
        const matchesMutationId = row.mutationId.toLowerCase().includes(q);
        if (!matchesEntity && !matchesAction && !matchesEntityId && !matchesMutationId) {
          return false;
        }
      }
      return true;
    });
  }, [outboxRows, statusFilter, searchQuery]);

  const activeRow = useMemo(
    () => outboxRows?.find((r) => r.id === selectedId) || null,
    [selectedId, outboxRows],
  );

  const handleClearSuccessful = async () => {
    Haptics.selectionAsync();
    await clearSuccessfulOutbox();
    if (activeRow?.status === "success") setSelectedId(null);
  };

  const handleRetryFailed = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSyncFeedback(null);
    await retryFailedOutbox();
    try {
      await syncManager.sync();
      setSyncFeedback({ type: "success", message: "Failed items reset and sync dispatched." });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setSyncFeedback({ type: "error", message: `Retry failed: ${msg}` });
    }
  };

  const handleTriggerSync = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSyncFeedback(null);
    if (!isAuthenticated) {
      setSyncFeedback({
        type: "error",
        message: "Sign in required to push offline mutations to the cloud.",
      });
      return;
    }

    try {
      await syncManager.sync();
      setSyncFeedback({ type: "success", message: "Sync cycle finished successfully." });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setSyncFeedback({ type: "error", message: `Sync error: ${msg}` });
    }
  };

  const copyToClipboard = async (text: string, fieldId: string) => {
    Haptics.selectionAsync();
    await Clipboard.setStringAsync(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <View style={styles.screen}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={20} color="#FFFFFF" />
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Sync Outbox Ledger</Text>
        <View style={styles.headerActions}>
          <Text style={styles.totalBadge}>
            {outboxRows?.length ?? 0} records
          </Text>
        </View>
      </View>

      {/* Sync Feedback Banner */}
      {syncFeedback && (
        <View
          style={[
            styles.feedbackBanner,
            syncFeedback.type === "error"
              ? styles.feedbackError
              : styles.feedbackSuccess,
          ]}>
          <View style={styles.feedbackLeft}>
            <AlertCircle
              size={15}
              color={syncFeedback.type === "error" ? "#FF7D87" : "#52E0C4"}
            />
            <Text
              style={[
                styles.feedbackText,
                { color: syncFeedback.type === "error" ? "#FFB8BC" : "#A3F7E4" },
              ]}>
              {syncFeedback.message}
            </Text>
          </View>
          {!isAuthenticated && (
            <Pressable
              onPress={() => router.push("/(auth)/login")}
              style={styles.signInBtn}>
              <LogIn size={13} color="#FFFFFF" />
              <Text style={styles.signInBtnText}>Sign In</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Interactive Metrics Cards */}
      <View style={styles.metricsBar}>
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            setStatusFilter(statusFilter === "pending" ? "all" : "pending");
          }}
          style={[
            styles.metricCard,
            { backgroundColor: "#2A2010" },
            statusFilter === "pending" && styles.metricCardActivePending,
          ]}>
          <Text style={[styles.metricCount, { color: "#FF9500" }]}>
            {metrics.pending}
          </Text>
          <Text style={[styles.metricLabel, { color: "#E09015" }]}>Pending</Text>
        </Pressable>

        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            setStatusFilter(statusFilter === "in_flight" ? "all" : "in_flight");
          }}
          style={[
            styles.metricCard,
            { backgroundColor: "#10223A" },
            statusFilter === "in_flight" && styles.metricCardActiveInFlight,
          ]}>
          <Text style={[styles.metricCount, { color: "#007AFF" }]}>
            {metrics.in_flight}
          </Text>
          <Text style={[styles.metricLabel, { color: "#54A0FF" }]}>In Flight</Text>
        </Pressable>

        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            setStatusFilter(statusFilter === "failed" ? "all" : "failed");
          }}
          style={[
            styles.metricCard,
            { backgroundColor: "#2D1518" },
            statusFilter === "failed" && styles.metricCardActiveFailed,
          ]}>
          <Text style={[styles.metricCount, { color: "#FF3B30" }]}>
            {metrics.failed}
          </Text>
          <Text style={[styles.metricLabel, { color: "#FF7D87" }]}>Failed</Text>
        </Pressable>

        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            setStatusFilter(statusFilter === "success" ? "all" : "success");
          }}
          style={[
            styles.metricCard,
            { backgroundColor: "#11261B" },
            statusFilter === "success" && styles.metricCardActiveSuccess,
          ]}>
          <Text style={[styles.metricCount, { color: "#34C759" }]}>
            {metrics.success}
          </Text>
          <Text style={[styles.metricLabel, { color: "#61D883" }]}>Success</Text>
        </Pressable>
      </View>

      {/* Action Toolbar */}
      <View style={styles.actionToolbar}>
        {/* Search box */}
        <View style={styles.searchBox}>
          <Search size={14} color="#718096" />
          <TextInput
            placeholder="Search entity, ID..."
            placeholderTextColor="#718096"
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery("")} hitSlop={6}>
              <X size={14} color="#718096" />
            </Pressable>
          )}
        </View>

        {/* Action Buttons Row */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.actionButtonsScroll}>
          {statusFilter !== "all" && (
            <Pressable
              onPress={() => setStatusFilter("all")}
              style={styles.clearFilterBtn}>
              <Text style={styles.clearFilterText}>
                Filter: {statusFilter} ✕
              </Text>
            </Pressable>
          )}

          {metrics.failed > 0 && (
            <Pressable
              onPress={handleRetryFailed}
              style={styles.retryBtn}>
              <RefreshCw size={13} color="#FF7D87" />
              <Text style={styles.retryBtnText}>
                Retry ({metrics.failed})
              </Text>
            </Pressable>
          )}

          {metrics.success > 0 && (
            <Pressable
              onPress={handleClearSuccessful}
              style={styles.clearSuccessBtn}>
              <Trash2 size={13} color="#A0AEC0" />
              <Text style={styles.clearSuccessText}>
                Clear Clean ({metrics.success})
              </Text>
            </Pressable>
          )}

          <Pressable
            onPress={handleTriggerSync}
            disabled={syncStatus === "syncing"}
            style={[
              styles.syncNowBtn,
              syncStatus === "syncing" && { opacity: 0.7 },
            ]}>
            {syncStatus === "syncing" ? (
              <ActivityIndicator size="small" color="#000000" />
            ) : (
              <Send size={13} color="#000000" />
            )}
            <Text style={styles.syncNowBtnText}>
              {syncStatus === "syncing" ? "Syncing..." : "Sync Now"}
            </Text>
          </Pressable>
        </ScrollView>
      </View>

      {/* Main List Container */}
      <View
        style={[
          styles.mainLayout,
          { flexDirection: isLargeScreen ? "row" : "column" },
        ]}>
        <ScrollView style={[styles.listPane, isLargeScreen && { flex: 1.2 }]}>
          <View style={styles.listHeaderRow}>
            <Text style={styles.sectionTitle}>
              Outbox Ledger Stream
            </Text>
            <Text style={styles.recordsCountText}>
              Showing {filteredRows.length} of {outboxRows?.length ?? 0}
            </Text>
          </View>

          {filteredRows.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {searchQuery || statusFilter !== "all"
                  ? "No mutations match the active filter criteria."
                  : "Outbox queue clear. All local changes are synced."}
              </Text>
            </View>
          ) : (
            filteredRows.map((row) => (
              <Pressable
                key={row.id}
                onPress={() => {
                  Haptics.selectionAsync();
                  setSelectedId(row.id);
                }}
                style={[
                  styles.rowCard,
                  selectedId === row.id && styles.selectedRowCard,
                ]}>
                <View style={styles.rowTop}>
                  <View style={styles.entityTag}>
                    <Text style={styles.entityText}>
                      {row.entity.toUpperCase()}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.actionBadge,
                      row.action === "delete"
                        ? styles.badgeDelete
                        : styles.badgeUpsert,
                    ]}>
                    {row.action}
                  </Text>
                  <View style={styles.statusBadgeWrap}>
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: getStatusColor(row.status) },
                      ]}
                    />
                    <Text
                      style={[
                        styles.statusTag,
                        { color: getStatusColor(row.status) },
                      ]}>
                      {row.status.replace("_", " ")}
                    </Text>
                  </View>
                </View>

                <View style={styles.rowDetails}>
                  <Text style={styles.idText} numberOfLines={1}>
                    ID: {row.entityId}
                  </Text>
                  <Text style={styles.dateText}>
                    {new Date(row.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </Text>
                </View>

                {row.lastError ? (
                  <Text style={styles.rowErrorSummary} numberOfLines={1}>
                    Error: {row.lastError}
                  </Text>
                ) : row.retryCount > 0 ? (
                  <Text style={styles.rowRetrySummary}>
                    Retries: {row.retryCount}x
                  </Text>
                ) : null}
              </Pressable>
            ))
          )}
        </ScrollView>
      </View>

      {/* Mutation Payload Inspector Modal */}
      <Modal
        visible={!!activeRow}
        animationType="slide"
        transparent
        statusBarTranslucent={true}
        onRequestClose={() => setSelectedId(null)}>
        <TouchableWithoutFeedback onPress={() => setSelectedId(null)}>
          <View style={styles.modalBackdrop} />
        </TouchableWithoutFeedback>
        <View style={styles.modalCenteredWrap}>
          <View style={styles.modalSheet}>
            {/* Modal Header */}
            <View style={styles.inspectorHeader}>
              <View style={styles.inspectorHeaderLeft}>
                <Code2 size={18} color="#52E0C4" />
                <Text style={styles.inspectorTitle}>Mutation Inspector</Text>
              </View>
              <Pressable
                style={styles.closeBtn}
                onPress={() => setSelectedId(null)}>
                <X size={18} color="#A0AEC0" />
              </Pressable>
            </View>

            {activeRow && (
              <ScrollView
                style={{ maxHeight: 520 }}
                contentContainerStyle={{ gap: 12, paddingBottom: 16 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={true}>
                {/* Status Strip */}
                <View style={styles.inspectorMetaGrid}>
                  <View style={styles.inspectorMetaCell}>
                    <Text style={styles.metaLabelText}>STATUS</Text>
                    <Text
                      style={[
                        styles.metaValueText,
                        { color: getStatusColor(activeRow.status), fontWeight: "700" },
                      ]}>
                      {activeRow.status.toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.inspectorMetaCell}>
                    <Text style={styles.metaLabelText}>TARGET</Text>
                    <Text style={styles.metaValueText}>
                      {activeRow.entity.toUpperCase()} • {activeRow.action}
                    </Text>
                  </View>
                  <View style={styles.inspectorMetaCell}>
                    <Text style={styles.metaLabelText}>RETRIES</Text>
                    <Text style={styles.metaValueText}>
                      {activeRow.retryCount} attempts
                    </Text>
                  </View>
                  <View style={styles.inspectorMetaCell}>
                    <Text style={styles.metaLabelText}>TIME</Text>
                    <Text style={styles.metaValueText}>
                      {new Date(activeRow.createdAt).toLocaleTimeString()}
                    </Text>
                  </View>
                </View>

                {/* Entity ID with Copy */}
                <View style={styles.idCopyRow}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.copyFieldLabel}>Entity ID</Text>
                    <Text style={styles.copyFieldValue} numberOfLines={1}>
                      {activeRow.entityId}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => copyToClipboard(activeRow.entityId, "entityId")}
                    style={styles.copyBtn}>
                    {copiedField === "entityId" ? (
                      <Check size={14} color="#52E0C4" />
                    ) : (
                      <Copy size={14} color="#A0AEC0" />
                    )}
                  </Pressable>
                </View>

                {/* Mutation ID with Copy */}
                <View style={styles.idCopyRow}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.copyFieldLabel}>Mutation ID</Text>
                    <Text style={styles.copyFieldValue} numberOfLines={1}>
                      {activeRow.mutationId}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => copyToClipboard(activeRow.mutationId, "mutationId")}
                    style={styles.copyBtn}>
                    {copiedField === "mutationId" ? (
                      <Check size={14} color="#52E0C4" />
                    ) : (
                      <Copy size={14} color="#A0AEC0" />
                    )}
                  </Pressable>
                </View>

                {/* Execution Error Log */}
                {activeRow.lastError && (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorTitle}>Last Sync Error:</Text>
                    <Text style={styles.errorText}>{activeRow.lastError}</Text>
                  </View>
                )}

                {/* Formatted JSON Payload Box */}
                <View>
                  <View style={styles.payloadHeaderRow}>
                    <Text style={styles.codeTitle}>Mutation Body Payload:</Text>
                    <Pressable
                      onPress={() => {
                        let text = activeRow.payload;
                        try {
                          text = JSON.stringify(JSON.parse(activeRow.payload), null, 2);
                        } catch {}
                        copyToClipboard(text, "payload");
                      }}
                      style={styles.copyPayloadBtn}>
                      {copiedField === "payload" ? (
                        <Check size={12} color="#52E0C4" />
                      ) : (
                        <Copy size={12} color="#A0AEC0" />
                      )}
                      <Text style={styles.copyPayloadBtnText}>
                        {copiedField === "payload" ? "Copied" : "Copy Payload"}
                      </Text>
                    </Pressable>
                  </View>

                  <View style={styles.terminalContainer}>
                    <Text style={styles.terminalText}>
                      {(() => {
                        try {
                          const parsed = JSON.parse(activeRow.payload);
                          return JSON.stringify(parsed, null, 2);
                        } catch {
                          return activeRow.payload || "{}";
                        }
                      })()}
                    </Text>
                  </View>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function getStatusColor(status: string) {
  if (status === "success") return "#34C759";
  if (status === "failed") return "#FF3B30";
  if (status === "in_flight") return "#007AFF";
  return "#FF9500";
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#0A0E17",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "android" ? 44 : 54,
  },
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  backButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  totalBadge: {
    color: "#718096",
    fontSize: 11,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  feedbackBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    gap: 8,
  },
  feedbackError: {
    backgroundColor: "rgba(255, 59, 48, 0.12)",
    borderColor: "rgba(255, 59, 48, 0.35)",
  },
  feedbackSuccess: {
    backgroundColor: "rgba(52, 199, 89, 0.12)",
    borderColor: "rgba(52, 199, 89, 0.35)",
  },
  feedbackLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  feedbackText: {
    fontSize: 12,
    flex: 1,
  },
  signInBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#1A2333",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#24324A",
  },
  signInBtnText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
  },
  metricsBar: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  metricCard: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
  metricCardActivePending: {
    borderColor: "#FF9500",
    backgroundColor: "#3A2B15",
  },
  metricCardActiveInFlight: {
    borderColor: "#007AFF",
    backgroundColor: "#173155",
  },
  metricCardActiveFailed: {
    borderColor: "#FF3B30",
    backgroundColor: "#421C20",
  },
  metricCardActiveSuccess: {
    borderColor: "#34C759",
    backgroundColor: "#183624",
  },
  metricCount: {
    fontSize: 18,
    fontWeight: "800",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  metricLabel: {
    fontSize: 10,
    marginTop: 2,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  actionToolbar: {
    marginBottom: 12,
    gap: 8,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#121824",
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 38,
    borderWidth: 1,
    borderColor: "#1F2C45",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 13,
    paddingVertical: 0,
  },
  actionButtonsScroll: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  clearFilterBtn: {
    backgroundColor: "#1F2C45",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  clearFilterText: {
    color: "#52E0C4",
    fontSize: 11,
    fontWeight: "600",
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255, 59, 48, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(255, 59, 48, 0.4)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  retryBtnText: {
    color: "#FF7D87",
    fontSize: 11,
    fontWeight: "600",
  },
  clearSuccessBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#1A2333",
    borderWidth: 1,
    borderColor: "#24324A",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  clearSuccessText: {
    color: "#A0AEC0",
    fontSize: 11,
    fontWeight: "600",
  },
  syncNowBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#52E0C4",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: "auto",
  },
  syncNowBtnText: {
    color: "#000000",
    fontSize: 11,
    fontWeight: "700",
  },
  mainLayout: {
    flex: 1,
  },
  listPane: {
    flex: 1,
    backgroundColor: "#121824",
    borderRadius: 14,
    padding: 12,
  },
  listHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionTitle: {
    color: "#8E9AA8",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  recordsCountText: {
    color: "#718096",
    fontSize: 11,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyText: {
    color: "#556575",
    textAlign: "center",
    fontSize: 13,
  },
  rowCard: {
    backgroundColor: "#1A2333",
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#24324A",
  },
  selectedRowCard: {
    borderColor: "#52E0C4",
    backgroundColor: "#1D2B3F",
  },
  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  entityTag: {
    backgroundColor: "#2E3A52",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  entityText: {
    color: "#A0AEC0",
    fontSize: 10,
    fontWeight: "700",
  },
  actionBadge: {
    fontSize: 10,
    fontWeight: "700",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    textTransform: "uppercase",
  },
  badgeUpsert: {
    backgroundColor: "#1A4D42",
    color: "#52E0C4",
  },
  badgeDelete: {
    backgroundColor: "#521D24",
    color: "#FF7D87",
  },
  statusBadgeWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginLeft: "auto",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusTag: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  rowDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  idText: {
    color: "#718096",
    fontSize: 11,
    width: "65%",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  dateText: {
    color: "#4A5568",
    fontSize: 10,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  rowErrorSummary: {
    color: "#FF7D87",
    fontSize: 10,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    marginTop: 4,
  },
  rowRetrySummary: {
    color: "#FF9500",
    fontSize: 10,
    marginTop: 4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(10, 14, 23, 0.75)",
    position: "absolute",
    width: "100%",
    height: "100%",
    zIndex: 1,
  },
  modalCenteredWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2,
    padding: 16,
  },
  modalSheet: {
    width: "100%",
    maxWidth: 560,
    backgroundColor: "#121824",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#24324A",
    maxHeight: "80%",
  },
  inspectorHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  inspectorHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  inspectorTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  closeBtn: {
    padding: 4,
  },
  inspectorMetaGrid: {
    flexDirection: "row",
    backgroundColor: "#1A2333",
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: "#24324A",
  },
  inspectorMetaCell: {
    flex: 1,
  },
  metaLabelText: {
    color: "#718096",
    fontSize: 9,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  metaValueText: {
    color: "#CBD5E0",
    fontSize: 11,
    marginTop: 2,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  idCopyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#1A2333",
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: "#24324A",
    gap: 8,
  },
  copyFieldLabel: {
    color: "#718096",
    fontSize: 10,
    fontWeight: "600",
  },
  copyFieldValue: {
    color: "#E2E8F0",
    fontSize: 11,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    marginTop: 2,
  },
  copyBtn: {
    padding: 6,
    backgroundColor: "#121824",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#2E3A52",
  },
  errorBox: {
    backgroundColor: "#2D1518",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#5C1D24",
  },
  errorTitle: {
    color: "#FF7D87",
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 4,
  },
  errorText: {
    color: "#FFB8BC",
    fontSize: 11,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  payloadHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  codeTitle: {
    color: "#A0AEC0",
    fontSize: 11,
    fontWeight: "600",
  },
  copyPayloadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: "#1A2333",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#2E3A52",
  },
  copyPayloadBtnText: {
    color: "#A0AEC0",
    fontSize: 10,
    fontWeight: "600",
  },
  terminalContainer: {
    backgroundColor: "#05070B",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1F2C45",
  },
  terminalText: {
    color: "#4AF626",
    fontSize: 11,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    lineHeight: 16,
  },
});
