import React, { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Modal, View, Text, Pressable, Linking } from "react-native";
import { AppUpdateInfo, checkForUpdates } from "@/lib/queries/updates";
// import { useTheme } from "@/hooks/use-theme";

const DISMISS_KEY = "update.dismiss.count";
const MAX_DISMISS = 3;

export const CheckForUpdatesMain = () => {
  const [dismissCount, setDismissCount] = useState(0);
  const [update, setUpdate] = useState<AppUpdateInfo | null>(null);

  // Theme hook
  // const colors = useTheme();

  useEffect(() => {
    checkForUpdates().then((res) => {
      if (res) {
        setUpdate(res);
      }
    });
  }, []);

  const loadDismissCount = useCallback(async () => {
    const value = await AsyncStorage.getItem(DISMISS_KEY);
    if (value) {
      setDismissCount(Number(value));
    }
  }, []);

  useEffect(() => {
    setTimeout(() => {
      loadDismissCount();
    }, 10);
  }, [loadDismissCount]);

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

  const handleUpdate = () => {
    if (update?.url) {
      Linking.openURL(update.url);
    }
  };

  if (!update) return null;

  const isDismissDisabled = update.mandatory || dismissCount >= MAX_DISMISS;

  return (
    <Modal visible={!!update} animationType="slide">
      <View className="flex-1 pt-safe-offset-16 px-5 justify-between bg-background">
        {/* Header */}
        <View className="mb-5 gap-1">
          <Text className="text-text-secondary text-sm font-semibold">
            Version {update.version}
          </Text>
          <Text className="font-bold text-2xl text-text mb-4">
            {update.title}
          </Text>
          {/* Content */}
          <Text className="text-text text-base">{update.description}</Text>
        </View>

        {/* Footer */}
        <View className="pb-safe-offset-10">
          <Pressable
            className="rounded-xl mb-3 bg-primary py-4"
            onPress={handleUpdate}>
            <Text className="text-center font-semibold text-base text-white">
              Update Now
            </Text>
          </Pressable>

          {!isDismissDisabled && (
            <Pressable onPress={handleDismiss}>
              <Text className="text-center text-text-secondary text-sm font-semibold">
                Maybe later
              </Text>
            </Pressable>
          )}

          {isDismissDisabled && (
            <Text className="text-center text-red-500 text-xs mt-1.5">
              Update required to continue
            </Text>
          )}
        </View>
      </View>
    </Modal>
  );
};
