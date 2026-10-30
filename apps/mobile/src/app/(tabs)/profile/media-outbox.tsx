import React, { useState, useMemo } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  useWindowDimensions,
  Modal,
  TouchableWithoutFeedback,
  Platform,
} from "react-native";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { desc } from "drizzle-orm";
import { mediaSyncOutbox } from "@/db/schema";
import { db } from "@/db/client";
import { router } from "expo-router";
import {
  ChevronLeft,
  RotateCw,
  Play,
  Trash2,
} from "lucide-react-native";
import {
  processMediaUploadQueue,
  retryFailedMediaJobs,
  retrySingleMediaUpload,
  cancelMediaUpload,
  clearCompletedMediaJobs,
} from "@/lib/media/upload-service";
import { useMediaUploadStore } from "@/lib/media/use-media-upload-store";
import * as Haptics from "@/lib/haptics";
import * as FileSystem from "expo-file-system/legacy";

export default function MediaOutboxMonitorPage() {
  const { width } = useWindowDimensions();
  const isLargeScreen = width > 768;

  // 1. Live reactive query of media_sync_outbox
  const { data: mediaRows } = useLiveQuery(
    db.select().from(mediaSyncOutbox).orderBy(desc(mediaSyncOutbox.createdAt)),
  );

  // In-flight progress from store
  const uploadStore = useMediaUploadStore();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedFileInfo, setSelectedFileInfo] = useState<{
    exists: boolean;
    size?: number;
  } | null>(null);

  // 2. Metrics summary
  const metrics = useMemo(() => {
    const counts = { pending: 0, uploading: 0, completed: 0, failed: 0, total: 0 };
    mediaRows?.forEach((row) => {
      counts.total++;
      if (row.status in counts) {
        counts[row.status as keyof typeof counts]++;
      }
    });
    return counts;
  }, [mediaRows]);

  const activeRow = useMemo(
    () => mediaRows?.find((r) => r.id === selectedId) || null,
    [selectedId, mediaRows],
  );

  // Load file info when row selected
  React.useEffect(() => {
    if (!activeRow?.localUri) {
      setSelectedFileInfo(null);
      return;
    }
    let isMounted = true;
    FileSystem.getInfoAsync(activeRow.localUri).then((info) => {
      if (isMounted) {
        setSelectedFileInfo({
          exists: info.exists,
          size: info.exists ? (info as any).size : undefined,
        });
      }
    });
    return () => {
      isMounted = false;
    };
  }, [activeRow]);

  const handleRetryAll = () => {
    Haptics.selectionAsync();
    void retryFailedMediaJobs();
  };

  const handleTriggerQueue = () => {
    Haptics.selectionAsync();
    void processMediaUploadQueue();
  };

  const handleRetrySingle = (e: any, id: string) => {
    e.stopPropagation();
    Haptics.selectionAsync();
    void retrySingleMediaUpload(id);
  };

  const handleCancelSingle = (e: any, id: string) => {
    e.stopPropagation();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    void cancelMediaUpload(id);
    if (selectedId === id) setSelectedId(null);
  };

  const handleClearCompleted = () => {
    Haptics.selectionAsync();
    void clearCompletedMediaJobs();
    if (activeRow?.status === "completed") {
      setSelectedId(null);
    }
  };

  return (
    <View style={styles.screen}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={20} color="#FFFFFF" />
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Media Sync Ledger</Text>

        <View style={styles.headerActions}>
          {metrics.completed > 0 && (
            <Pressable
              onPress={handleClearCompleted}
              hitSlop={6}
              style={styles.headerActionBtn}
              accessibilityLabel="Clear completed media records"
            >
              <Trash2 size={16} color="#A0AEC0" />
            </Pressable>
          )}
          <Pressable
            onPress={handleRetryAll}
            hitSlop={6}
            style={styles.headerActionBtn}
            accessibilityLabel="Retry failed media uploads"
          >
            <RotateCw size={16} color="#A0AEC0" />
          </Pressable>
          <Pressable
            onPress={handleTriggerQueue}
            hitSlop={6}
            style={[styles.headerActionBtn, { backgroundColor: "#1A4D42" }]}
            accessibilityLabel="Trigger media queue worker"
          >
            <Play size={16} color="#52E0C4" />
          </Pressable>
        </View>
      </View>

      {/* Runway Metrics Monitor */}
      <View style={styles.metricsBar}>
        <MetricCard
          label="Pending"
          count={metrics.pending}
          color="#FF9500"
          bg="#FFF9E6"
        />
        <MetricCard
          label="Uploading"
          count={metrics.uploading}
          color="#007AFF"
          bg="#E6F2FF"
        />
        <MetricCard
          label="Failed"
          count={metrics.failed}
          color="#FF3B30"
          bg="#FFEBEA"
        />
        <MetricCard
          label="Total Clean"
          count={metrics.completed}
          color="#34C759"
          bg="#EAF9EE"
        />
      </View>

      {/* Main Stream */}
      <View
        style={[
          styles.mainLayout,
          { flexDirection: isLargeScreen ? "row" : "column" },
        ]}
      >
        <ScrollView style={[styles.listPane, isLargeScreen && { flex: 1.2 }]}>
          <Text style={styles.sectionTitle}>Media Outbox Queue Stream</Text>

          {mediaRows?.length === 0 ? (
            <Text style={styles.emptyText}>
              Media outbox queue clear. All media uploaded or none pending.
            </Text>
          ) : (
            mediaRows?.map((row) => {
              const liveState = uploadStore.uploads[row.id];
              const progressPct = Math.round((liveState?.progress || 0) * 100);

              return (
                <Pressable
                  key={row.id}
                  onPress={() => setSelectedId(row.id)}
                  style={[
                    styles.rowCard,
                    selectedId === row.id && styles.selectedRowCard,
                  ]}
                >
                  {/* Row Top Header */}
                  <View style={styles.rowTop}>
                    <View style={styles.entityTag}>
                      <Text style={styles.entityText}>MEDIA</Text>
                    </View>

                    <Text
                      style={[
                        styles.statusTag,
                        { color: getStatusColor(row.status) },
                      ]}
                    >
                      • {row.status.toUpperCase()}
                      {row.status === "uploading" && liveState?.progress
                        ? ` (${progressPct}%)`
                        : ""}
                    </Text>

                    {/* Row Quick Action Buttons */}
                    <View style={styles.rowActionBtns}>
                      {row.status === "failed" && (
                        <Pressable
                          onPress={(e) => handleRetrySingle(e, row.id)}
                          hitSlop={6}
                          style={styles.rowSmallBtn}
                        >
                          <RotateCw size={13} color="#FF9500" />
                        </Pressable>
                      )}
                      <Pressable
                        onPress={(e) => handleCancelSingle(e, row.id)}
                        hitSlop={6}
                        style={styles.rowSmallBtn}
                      >
                        <Trash2 size={13} color="#FF3B30" />
                      </Pressable>
                    </View>
                  </View>

                  {/* Row Body */}
                  <View style={styles.rowDetails}>
                    <Text style={styles.idText} numberOfLines={1}>
                      Media ID: {row.id}
                    </Text>
                    <Text style={styles.dateText}>
                      {new Date(row.createdAt).toLocaleTimeString()}
                    </Text>
                  </View>

                  <Text
                    style={styles.uriText}
                    numberOfLines={1}
                    ellipsizeMode="middle"
                  >
                    {row.localUri}
                  </Text>

                  {/* Retry Counter badge */}
                  {row.retryCount > 0 && (
                    <Text style={styles.retryText}>
                      Retries: {row.retryCount} / 5
                    </Text>
                  )}
                </Pressable>
              );
            })
          )}
        </ScrollView>
      </View>

      {/* Inspector Detail Modal */}
      <Modal
        visible={!!activeRow}
        animationType="slide"
        transparent
        statusBarTranslucent
        onRequestClose={() => setSelectedId(null)}
      >
        <TouchableWithoutFeedback onPress={() => setSelectedId(null)}>
          <View style={styles.modalBackdrop} />
        </TouchableWithoutFeedback>

        <View style={styles.modalCenteredWrap}>
          <View style={styles.modalSheet}>
            <View style={styles.inspectorHeader}>
              <Text style={styles.inspectorTitle}>Media Job Inspection</Text>
              <Pressable
                style={styles.closeBtn}
                onPress={() => setSelectedId(null)}
              >
                <Text style={styles.closeBtnText}>Close</Text>
              </Pressable>
            </View>

            {activeRow && (
              <ScrollView
                style={{ maxHeight: 500 }}
                contentContainerStyle={{ flexGrow: 1 }}
                showsVerticalScrollIndicator
              >
                <Text style={styles.metaLabel}>
                  Media ID: <Text style={styles.metaVal}>{activeRow.id}</Text>
                </Text>
                <Text style={styles.metaLabel}>
                  Block ID:{" "}
                  <Text style={styles.metaVal}>{activeRow.blockId}</Text>
                </Text>
                <Text style={styles.metaLabel}>
                  Status:{" "}
                  <Text
                    style={[
                      styles.metaVal,
                      { color: getStatusColor(activeRow.status) },
                    ]}
                  >
                    {activeRow.status.toUpperCase()}
                  </Text>
                </Text>
                <Text style={styles.metaLabel}>
                  Retries:{" "}
                  <Text style={styles.metaVal}>{activeRow.retryCount} / 5</Text>
                </Text>
                <Text style={styles.metaLabel}>
                  Created:{" "}
                  <Text style={styles.metaVal}>
                    {new Date(activeRow.createdAt).toLocaleString()}
                  </Text>
                </Text>

                {/* Local Sandbox File Diagnostic */}
                <View style={styles.fileBox}>
                  <Text style={styles.fileTitle}>Local Sandbox File:</Text>
                  <Text style={styles.uriCode}>{activeRow.localUri}</Text>
                  <View style={styles.fileStatusRow}>
                    <Text
                      style={[
                        styles.fileStatusText,
                        {
                          color: selectedFileInfo?.exists
                            ? "#52E0C4"
                            : "#FF7D87",
                        },
                      ]}
                    >
                      {selectedFileInfo === null
                        ? "Checking file..."
                        : selectedFileInfo.exists
                          ? `✓ File exists on disk (${formatBytes(selectedFileInfo.size)})`
                          : "✕ File missing from sandbox"}
                    </Text>
                  </View>
                </View>

                {/* Error Log box if failure occurred */}
                {activeRow.lastError && (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorTitle}>
                      Execution Error Diagnostics:
                    </Text>
                    <Text style={styles.errorText}>{activeRow.lastError}</Text>
                  </View>
                )}

                {/* Inspector Action Buttons */}
                <View style={styles.modalActionsRow}>
                  {activeRow.status === "failed" && (
                    <Pressable
                      onPress={(e) => handleRetrySingle(e, activeRow.id)}
                      style={[styles.modalBtn, { backgroundColor: "#007AFF" }]}
                    >
                      <RotateCw size={14} color="#FFF" />
                      <Text style={styles.modalBtnText}>Retry Upload</Text>
                    </Pressable>
                  )}
                  <Pressable
                    onPress={(e) => handleCancelSingle(e, activeRow.id)}
                    style={[styles.modalBtn, { backgroundColor: "#FF3B30" }]}
                  >
                    <Trash2 size={14} color="#FFF" />
                    <Text style={styles.modalBtnText}>Delete Job</Text>
                  </Pressable>
                </View>

                {/* Raw Database Record JSON */}
                <Text style={styles.codeTitle}>Raw SQLite Record JSON:</Text>
                <View style={styles.terminalContainer}>
                  <Text style={styles.terminalText}>
                    {JSON.stringify(activeRow, null, 2)}
                  </Text>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Sub-components & Helpers
function MetricCard({
  label,
  count,
  color,
  bg,
}: {
  label: string;
  count: number;
  color: string;
  bg: string;
}) {
  return (
    <View style={[styles.metricCard, { backgroundColor: bg }]}>
      <Text style={[styles.metricCount, { color }]}>{count}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function getStatusColor(status: string) {
  if (status === "completed") return "#34C759";
  if (status === "failed") return "#FF3B30";
  if (status === "uploading") return "#007AFF";
  return "#FF9500";
}

function formatBytes(bytes?: number): string {
  if (bytes === undefined || bytes === null || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#0A0E17",
    padding: 16,
    paddingTop: 40,
  },
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 6,
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
    gap: 8,
  },
  headerActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#1A2333",
    alignItems: "center",
    justifyContent: "center",
  },
  metricsBar: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    padding: 10,
    borderRadius: 12,
    alignItems: "center",
  },
  metricCount: {
    fontSize: 18,
    fontWeight: "700",
  },
  metricLabel: {
    fontSize: 10,
    color: "#666",
    marginTop: 2,
    fontWeight: "500",
  },
  mainLayout: {
    flex: 1,
  },
  listPane: {
    flex: 1,
    backgroundColor: "#121824",
    borderRadius: 16,
    padding: 16,
  },
  sectionTitle: {
    color: "#8E9AA8",
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  emptyText: {
    color: "#556575",
    textAlign: "center",
    marginTop: 40,
    fontSize: 14,
  },
  rowCard: {
    backgroundColor: "#1A2333",
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#24324A",
  },
  selectedRowCard: {
    borderColor: "#007AFF",
    backgroundColor: "#1F2C45",
  },
  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
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
  statusTag: {
    fontSize: 12,
    fontWeight: "600",
  },
  rowActionBtns: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginLeft: "auto",
  },
  rowSmallBtn: {
    padding: 5,
    borderRadius: 6,
    backgroundColor: "#24324A",
  },
  rowDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  idText: {
    color: "#718096",
    fontSize: 12,
    width: "60%",
  },
  dateText: {
    color: "#4A5568",
    fontSize: 11,
  },
  uriText: {
    color: "#CBD5E0",
    fontSize: 11,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    marginTop: 6,
  },
  retryText: {
    color: "#FF9500",
    fontSize: 10,
    fontWeight: "600",
    marginTop: 4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(10, 14, 23, 0.7)",
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
  },
  modalSheet: {
    width: "93%",
    maxWidth: 600,
    backgroundColor: "#121824",
    borderRadius: 18,
    padding: 20,
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
  inspectorTitle: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },
  closeBtn: {
    padding: 4,
  },
  closeBtnText: {
    color: "#007AFF",
    fontSize: 14,
    fontWeight: "600",
  },
  metaLabel: {
    color: "#718096",
    fontSize: 12,
    marginBottom: 6,
  },
  metaVal: {
    color: "#CBD5E0",
    fontWeight: "600",
  },
  fileBox: {
    backgroundColor: "#1A2333",
    padding: 10,
    borderRadius: 8,
    marginTop: 6,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#24324A",
  },
  fileTitle: {
    color: "#A0AEC0",
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 4,
  },
  uriCode: {
    color: "#E2E8F0",
    fontSize: 11,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  fileStatusRow: {
    marginTop: 6,
  },
  fileStatusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  errorBox: {
    backgroundColor: "#2D191E",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#5C1D24",
  },
  errorTitle: {
    color: "#FF7D87",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
  },
  errorText: {
    color: "#FFB8BC",
    fontSize: 12,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  modalActionsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
    marginTop: 4,
  },
  modalBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    flex: 1,
  },
  modalBtnText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "600",
  },
  codeTitle: {
    color: "#A0AEC0",
    fontSize: 12,
    marginBottom: 6,
    fontWeight: "600",
  },
  terminalContainer: {
    backgroundColor: "#05070B",
    padding: 12,
    borderRadius: 12,
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