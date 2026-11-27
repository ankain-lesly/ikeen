import "../global.css";

import { useEffect } from "react";
import {
  ActivityIndicator,
  AppState,
  StatusBar,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { DarkTheme, DefaultTheme, ThemeProvider, router } from "expo-router";
import * as Notifications from "expo-notifications";
import {
  ensureReminderChannelAsync,
  ACTION_COMPLETE_REMINDER,
  cancelReminderNotification,
} from "@/lib/services/notification.service";
import {
  catchupAndReconcileRecurringReminders,
  toggleReminderCompleted,
} from "@/lib/queries/reminders";
import {
  registerPushTokenWithServerAsync,
  initPushTokenAuthListener,
} from "@/lib/services/push-token.service";
import { Drawer } from "expo-router/drawer";
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
import { AppDrawerContent } from "@/components/app-drawer-content";
import { ShareIntentReceiver } from "@/components/share/share-intent-receiver";
import {ShareIntentProvider} from "expo-share-intent"

SplashScreen.preventAutoHideAsync();

export default function AppProvider() {
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
    <ShareIntentProvider>
      <QueryClientProvider client={queryClient}>
        <KeyboardProvider>
          <GestureHandlerRootView>
            <SafeAreaListener
              onChange={({ insets }) => Uniwind.updateInsets(insets)}>
              <ThemeProvider value={MyTheme}>
                <View className="bg-background flex-1">
                  {/* Root App */}
                  <RootDrawerLayout />
                  <Toast config={toastConfig} position="top" topOffset={50} />
                  <StatusBar
                    barStyle={
                      scheme === "dark" ? "light-content" : "dark-content"
                    }
                  />
                  {/* Check Of Updates */}
                  <CheckForUpdatesMain />
                </View>
              </ThemeProvider>
            </SafeAreaListener>
          </GestureHandlerRootView>
        </KeyboardProvider>
      </QueryClientProvider>
    </ShareIntentProvider>
  );
}

function RootDrawerLayout() {
  const colors = useTheme();
  const { success, error } = useMigrations(db, migrations);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    const unsubscribe = initPushTokenAuthListener();
    if (isAuthenticated) {
      registerPushTokenWithServerAsync().catch((err) => {
        console.log("[PushToken] Registration error:", err);
      });
    }
    return unsubscribe;
  }, [isAuthenticated]);

  useEffect(() => {
    if (success) {
      seedDefaultNotes(db)
        .catch((err) => console.log("[🚨] Seeding error:", err))
        .finally(() => {
          SplashScreen.hideAsync();
          syncManager.init();
          catchupAndReconcileRecurringReminders().catch((err) => {
            console.log("[Reminders] Catchup error:", err);
          });
        });

      const subscription = AppState.addEventListener("change", (nextState) => {
        if (nextState === "active") {
          catchupAndReconcileRecurringReminders().catch(() => {});
        }
      });

      return () => subscription.remove();
    }
  }, [success]);

  useEffect(() => {
    ensureReminderChannelAsync().catch(() => {});

    const handleNotificationResponse = async (
      response: Notifications.NotificationResponse | null | undefined,
    ) => {
      if (!response) return;
      const actionIdentifier = response.actionIdentifier;
      const data = response.notification?.request?.content?.data;
      const noteId = data?.noteId as string | undefined;
      const reminderId = data?.reminderId as string | undefined;

      // Handle interactive notification action button: "Mark Done"
      if (actionIdentifier === ACTION_COMPLETE_REMINDER && reminderId) {
        try {
          await toggleReminderCompleted(reminderId);
          await cancelReminderNotification(reminderId);
        } catch (err) {
          console.warn(
            "[RootLayout] Failed to complete reminder from action:",
            err,
          );
        }
        return;
      }

      // Default tap or "View Note" button
      if (noteId) {
        router.push({
          pathname: "/notes/[id]",
          params: { id: noteId },
        });
      }
    };

    Notifications.getLastNotificationResponseAsync()
      .then(handleNotificationResponse)
      .catch(() => {});

    const subscription =
      Notifications.addNotificationResponseReceivedListener(
        handleNotificationResponse,
      );

    return () => subscription.remove();
  }, []);

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
      </View>
    );
  }

  return (
    <>
      <Drawer
        drawerContent={AppDrawerContent}
        screenOptions={{
          headerShown: false,
          drawerStyle: {
            backgroundColor: colors.background,
            width: 290,
          },
          drawerActiveTintColor: colors.primary,
          drawerInactiveTintColor: colors.textSecondary,
          drawerType: "slide",
        }}
        initialRouteName="index">
        <Drawer.Screen name="index" />
        <Drawer.Screen name="agent" />
        <Drawer.Screen name="search" />
        <Drawer.Screen name="reminders" />
        <Drawer.Screen name="notes" />
        <Drawer.Screen name="s/[slug]" options={{ swipeEnabled: false }} />
        <Drawer.Screen name="folders/[id]" />
        <Drawer.Screen name="(tabs)" />
        <Drawer.Screen name="(auth)" />
      </Drawer>
      <ShareIntentReceiver />
    </>
  );
}
