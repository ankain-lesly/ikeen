import "../global.css";

import { useEffect } from "react";
import { ActivityIndicator, Text, View, useColorScheme } from "react-native";
import { DarkTheme, DefaultTheme, ThemeProvider, Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";
import { SafeAreaListener } from "react-native-safe-area-context";
import { Uniwind } from "uniwind";

import { db } from "@/db/client";
import { seedDefaultNotes } from "@/db/seed";
import migrations from "../../drizzle/migrations";

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const { success, error } = useMigrations(db, migrations);
  const scheme = useColorScheme();

  useEffect(() => {
    if (success) {
      seedDefaultNotes(db)
        .catch((err) => console.error("Seeding error:", err))
        .finally(() => {
          SplashScreen.hideAsync();
        });
    }
  }, [success]);

  if (error) {
    return (
      <View className="flex-1 justify-center items-center p-6">
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
      <View className="flex-1 justify-center items-center p-6">
        <ActivityIndicator size="large" />
        <Text className="mt-3 text-sm text-gray-500">
          Initializing database...
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaListener onChange={({ insets }) => Uniwind.updateInsets(insets)}>
      <View className="bg-background flex-1">
        <ThemeProvider value={scheme === "dark" ? DarkTheme : DefaultTheme}>
          <Stack screenOptions={{ headerShown: false }} />
        </ThemeProvider>
      </View>
    </SafeAreaListener>
  );
}
