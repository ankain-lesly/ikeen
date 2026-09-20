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
import { syncOutbox } from "@/db/schema";
import { db } from "@/db/client";
import { log } from "@repo/utils";
import { router } from "expo-router";
import { ChevronLeft } from "lucide-react-native";

export default function SyncMonitorPage() {
  const { width } = useWindowDimensions();
  const isLargeScreen = width > 768; // Activates dynamic tablet split-pane ledger layouts

  // 🚀 1. Fetch live reactive rows chronologically using drizzle-orm useLiveQuery
  const { data: outboxRows } = useLiveQuery(
    db.select().from(syncOutbox).orderBy(desc(syncOutbox.createdAt)),
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);

  // 2. Computed Ledger Metrics Calculations
  const metrics = useMemo(() => {
    const counts = { pending: 0, in_flight: 0, success: 0, failed: 0 };
    outboxRows?.forEach((row) => {
      if (row.status in counts) counts[row.status as keyof typeof counts]++;
    });
    return counts;
  }, [outboxRows]);

  const activeRow = useMemo(
    () => outboxRows?.find((r) => r.id === selectedId) || null,
    [selectedId, outboxRows],
  );

  if (activeRow) {
    log('[SyncOutbox:SelectedRow]', activeRow.payload);
  }
  return (
    <View style={styles.screen}>
      {/* Navigation Top Header */}
      <View style={styles.topHeader}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}>
          <ChevronLeft size={20} color="#FFFFFF" />
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Delivery Ledger</Text>
        <View style={{ width: 48 }} />
      </View>

      {/* 🚀 Runway Metrics Monitor Header Layout */}
      <View style={styles.metricsBar}>
        <MetricCard
          label="Pending"
          count={metrics.pending}
          color="#FF9500"
          bg="#FFF9E6"
        />
        <MetricCard
          label="In Flight"
          count={metrics.in_flight}
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
          count={metrics.success}
          color="#34C759"
          bg="#EAF9EE"
        />
      </View>

      {/* 🚀 Main Split-Screen Dashboard Container */}
      <View
        style={[
          styles.mainLayout,
          { flexDirection: isLargeScreen ? "row" : "column" },
        ]}>
        {/* Left Side: Ledger Transaction Items Queue Stream */}
        <ScrollView style={[styles.listPane, isLargeScreen && { flex: 1.2 }]}>
          <Text style={styles.sectionTitle}>Sync Outbox Log Stream</Text>
          {outboxRows?.length === 0 ? (
            <Text style={styles.emptyText}>
              Outbox queue clear. All records successfully synced.
            </Text>
          ) : (
            outboxRows?.map((row) => (
              <Pressable
                key={row.id}
                onPress={() => setSelectedId(row.id)}
                style={[
                  styles.rowCard,
                  selectedId === row.id && styles.selectedRowCard,
                ]}>
                {/* Begin rowTop */}
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
                  <Text
                    style={[
                      styles.statusTag,
                      { color: getStatusColor(row.status) },
                    ]}>
                    • {row.status}
                  </Text>
                </View>
                {/* End rowTop */}

                <View style={styles.rowDetails}>
                  <Text style={styles.idText} numberOfLines={1}>
                    Entity ID: {row.entityId}
                  </Text>
                  <Text style={styles.dateText}>
                    {new Date(row.createdAt).toLocaleTimeString()}
                  </Text>
                </View>
              </Pressable>
            ))
          )}
        </ScrollView>
      </View>
      {/* Modal based on activeRow */}
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
            <View style={styles.inspectorHeader}>
              <Text style={styles.inspectorTitle}>Payload Inspection</Text>
              <Pressable
                style={styles.closeBtn}
                onPress={() => setSelectedId(null)}>
                <Text style={styles.closeBtnText}>Close</Text>
              </Pressable>
            </View>

            <Text style={styles.metaLabel}>
              Mutation ID:{" "}
              <Text style={styles.metaVal}>{activeRow?.mutationId}</Text>
            </Text>

            <ScrollView
              style={{ maxHeight: 600 }}
              contentContainerStyle={{ flexGrow: 1 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={true}>
              {activeRow && (
                <>
                  {activeRow.lastError && (
                    <View style={styles.errorBox}>
                      <Text style={styles.errorTitle}>
                        Last Execution Error Log:
                      </Text>
                      <Text style={styles.errorText}>
                        {activeRow.lastError}
                      </Text>
                    </View>
                  )}

                  <Text style={styles.codeTitle}>
                    Raw JSON Transmission Body Object:
                  </Text>
                  <View style={styles.terminalContainer}>
                    <Text style={styles.terminalText}>
                      {(() => {
                        // Parse the JSON payload
                        let obj: any;
                        try {
                          obj = JSON.parse(activeRow.payload);
                        } catch (e) {
                          return "Invalid JSON payload.";
                        }

                        // Redact 'content' if it exists in payload
                        if (
                          obj &&
                          typeof obj === "object" &&
                          Object.prototype.hasOwnProperty.call(obj, "content")
                        ) {
                          obj = {
                            ...obj,
                            content: "***REDACTED***",
                          };
                        }

                        // Redact 'lastError' if it exists in activeRow
                        const activeRowCopy: any = { ...activeRow };
                        if (
                          Object.prototype.hasOwnProperty.call(
                            activeRowCopy,
                            "lastError",
                          )
                        ) {
                          activeRowCopy.lastError = "***REDACTED***";
                        }

                        return JSON.stringify(
                          { ...activeRowCopy, payload: obj },
                          null,
                          2,
                        );
                      })()}
                    </Text>
                  </View>
                </>
              )}
            </ScrollView>
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
  if (status === "success") return "#34C759";
  if (status === "failed") return "#FF3B30";
  if (status === "in_flight") return "#007AFF";
  return "#FF9500";
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#0A0E17", padding: 16, paddingTop: 40 }, // Deep tech cyberpunk dark background
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
  metricsBar: { flexDirection: "row", gap: 10, marginBottom: 16 },
  metricCard: { flex: 1, padding: 12, borderRadius: 12, alignItems: "center" },
  metricCount: { fontSize: 20, fontWeight: "700" },
  metricLabel: { fontSize: 11, color: "#666", marginTop: 2, fontWeight: "500" },
  mainLayout: { flex: 1 },
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
  selectedRowCard: { borderColor: "#007AFF", backgroundColor: "#1F2C45" },
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
  entityText: { color: "#A0AEC0", fontSize: 10, fontWeight: "700" },
  actionBadge: {
    fontSize: 10,
    fontWeight: "700",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    textTransform: "uppercase",
  },
  badgeUpsert: { backgroundColor: "#1A4D42", color: "#52E0C4" },
  badgeDelete: { backgroundColor: "#521D24", color: "#FF7D87" },
  statusTag: { fontSize: 12, fontWeight: "600", marginLeft: "auto" },
  rowDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  idText: { color: "#718096", fontSize: 12, width: "60%" },
  dateText: { color: "#4A5568", fontSize: 11 },
  // inspectorPane styles kept for possible future use - modal gets its own style
  inspectorPane: {
    backgroundColor: "#121824",
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 2,
    borderLeftColor: "#007AFF",
  },
  inspectorHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  inspectorTitle: { color: "#FFF", fontSize: 16, fontWeight: "700" },
  closeBtn: { padding: 4 },
  closeBtnText: { color: "#007AFF", fontSize: 14, fontWeight: "600" },
  metaLabel: { color: "#718096", fontSize: 12, marginBottom: 8 },
  metaVal: { color: "#CBD5E0" },
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
    fontSize: 12,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    lineHeight: 18,
  }, // Retro matrix green code theme
  // Modal-specific styles
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 16,
    borderWidth: 1,
    borderColor: "#24324A",
    maxHeight: "75%",
  },
});
