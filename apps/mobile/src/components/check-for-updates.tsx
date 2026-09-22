import React, { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  Modal,
  View,
  Text,
  Pressable,
  Linking,
  ScrollView,
  StyleSheet,
} from "react-native";
import { AppUpdateInfo, checkForUpdates } from "@/lib/queries/updates";

const DISMISS_KEY = "update.dismiss.count";
const MAX_DISMISS = 3;

export const CheckForUpdatesMain = () => {
  const [dismissCount, setDismissCount] = useState(0);
  const [update, setUpdate] = useState<AppUpdateInfo | null>(null);
  // const [visible, setVisible] = useState(false);

  useEffect(() => {
    checkForUpdates().then((res) => {
      if (res) {
        setUpdate(res);
        // setVisible(true);
      }
    });
  }, []);

  const loadDismissCount = useCallback(async () => {
    const value = await AsyncStorage.getItem(DISMISS_KEY);
    if (value) {
      setDismissCount(Number(value));
    }
  }, []);

  // ─── Load dismiss count ─────────────────────────────────────────────
  useEffect(() => {
    setTimeout(() => {
      loadDismissCount();
    }, 10);
  }, [loadDismissCount]);

  // ─── Handle "Maybe later" ───────────────────────────────────────────
  const handleDismiss = async () => {
    const nextCount = dismissCount + 1;

    await AsyncStorage.setItem(DISMISS_KEY, String(nextCount));
    setDismissCount(nextCount);

    if (nextCount >= MAX_DISMISS) {
      // Lock user into update
      return;
    }

    setUpdate(null);
  };

  // ─── Handle update ──────────────────────────────────────────────────
  const handleUpdate = () => {
    if (update?.url) {
      Linking.openURL(update.url);
    }
  };

  if (!update) return null;

  const isDismissDisabled = update.mandatory || dismissCount >= MAX_DISMISS;

  return (
    <Modal visible={!!update} animationType="slide">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{update.title}</Text>
          <Text style={styles.version}>Version {update.version}</Text>
        </View>

        {/* Content */}
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.description}>{update.description}</Text>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <Pressable style={styles.updateButton} onPress={handleUpdate}>
            <Text style={styles.updateText}>Update Now</Text>
          </Pressable>

          {!isDismissDisabled && (
            <Pressable onPress={handleDismiss}>
              <Text style={styles.laterText}>
                Maybe later ({MAX_DISMISS - dismissCount} left)
              </Text>
            </Pressable>
          )}

          {isDismissDisabled && (
            <Text style={styles.lockedText}>Update required to continue</Text>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    paddingTop: 60,
    paddingHorizontal: 20,
    justifyContent: "space-between",
  },
  header: {
    marginBottom: 20,
  },
  title: {
    color: "#ffffff",
    fontSize: 26,
    fontWeight: "700",
    marginBottom: 6,
  },
  version: {
    color: "#9ca3af",
    fontSize: 14,
  },
  content: {
    paddingBottom: 40,
  },
  description: {
    color: "#d1d5db",
    fontSize: 16,
    lineHeight: 24,
  },
  footer: {
    paddingBottom: 40,
  },
  updateButton: {
    backgroundColor: "#ffffff",
    paddingVertical: 16,
    borderRadius: 18,
    marginBottom: 12,
  },
  updateText: {
    textAlign: "center",
    fontWeight: "600",
    fontSize: 16,
    color: "#000",
  },
  laterText: {
    textAlign: "center",
    color: "#6b7280",
    fontSize: 14,
  },
  lockedText: {
    textAlign: "center",
    color: "#f87171",
    fontSize: 13,
    marginTop: 6,
  },
});
