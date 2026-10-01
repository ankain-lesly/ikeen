import "../global.css";

import { useEffect } from "react";
import {
  ActivityIndicator,
  StatusBar,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { DarkTheme, DefaultTheme, ThemeProvider, Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";
import { SafeAreaListener } from "react-native-safe-area-context";
import { Uniwind } from "uniwind";

import { db } from "@/db/client";
import { seedDefaultNotes } from "@/db/seed";
import migrations from "../../drizzle/migrations";
import { useTheme } from "@/hooks/use-theme";
import Toast from "react-native-toast-message";
import { toastConfig } from "@/lib/toast";

import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useAuthStore } from "@/lib/auth/auth-store";
import { syncManager } from "@/lib/sync/sync-manager";
import { useSettingsStore } from "@/lib/settings/settings-store";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";
import { CheckForUpdatesMain } from "@/components/check-for-updates";

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const scheme = useColorScheme();
  const colors = useTheme();

  const Theme = scheme === "dark" ? DarkTheme : DefaultTheme;

  const MyTheme = {
    ...Theme,
    colors: {
      ...Theme.colors,
      background: colors.background, // View backgrounds
      primary: colors.primary, // Brand color
      card: colors.card, // Card backgrounds
      text: colors.foreground, // Primary text
      border: colors.border,
      notification: colors.backgroundSelected,
    },
    fonts: {
      ...Theme.fonts,
    },
  };

  return (
    <QueryClientProvider client={queryClient}>
      <KeyboardProvider>
        <GestureHandlerRootView>
          <SafeAreaListener
            onChange={({ insets }) => Uniwind.updateInsets(insets)}
            >
            <ThemeProvider value={MyTheme}>
              <View className="bg-background flex-1">
                {/* Root App */}
                <RootApp />
                <Toast config={toastConfig} position="top" topOffset={50} />
                <StatusBar
                  barStyle={scheme === "dark"  ? "light-content" : "dark-content"}
                />
                {/* Check Of Updates */}
                <CheckForUpdatesMain />
              </View>
            </ThemeProvider>
          </SafeAreaListener>
        </GestureHandlerRootView>
      </KeyboardProvider>
    </QueryClientProvider>
  );
}

function RootApp() {
  const { success, error } = useMigrations(db, migrations);

  useEffect(() => {
    if (success) {
      seedDefaultNotes(db)
        .catch((err) => console.error("Seeding error:", err))
        .finally(() => {
          SplashScreen.hideAsync();
          syncManager.init();
        });
    }
  }, [success]);

  useEffect(() => {
    useAuthStore.getState().init();
    const savedTheme = useSettingsStore.getState().theme;
    if (savedTheme) {
      Uniwind.setTheme(savedTheme);
    }
  }, []);

  if (error) {
    return (
      <View className="flex-1 justify-center items-center p-6 p-safe">
        <Text className="text-lg font-bold text-red-600 mb-2">
          Migration Failed
        </Text>
        <Text className="text-sm text-gray-600 text-center">
          {error.message}
        </Text>
      </View>
    );
  }

  if (!success) {
    return (
      <View className="flex-1 justify-center items-center p-6 p-safe">
        <ActivityIndicator size="large" />
        <Text className="mt-3 text-sm text-gray-500">
          Initializing database...
        </Text>
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }} initialRouteName="index">
      <Stack.Screen name="index" />
      <Stack.Screen name="agent" />
      <Stack.Screen name="search" />
      <Stack.Screen name="notes" />
      <Stack.Screen name="folders" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="(auth)"
        options={{
          presentation: "formSheet",
          sheetAllowedDetents: [0.85, 1.0],
          sheetGrabberVisible: true,
          headerShown: false,
        }}
      />
    </Stack>
  );
}
