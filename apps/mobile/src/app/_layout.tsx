import '../global.css';

import { useEffect } from 'react';
import {
  ActivityIndicator,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';

import AppTabs from '@/components/app-tabs';
import { db } from '@/db/client';
import migrations from '../../drizzle/migrations';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { success, error } = useMigrations(db, migrations);

  useEffect(() => {
    if (success) {
      SplashScreen.hideAsync();
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
        <Text className="mt-3 text-sm text-gray-500">Initializing database...</Text>
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AppTabs />
    </ThemeProvider>
  );
}
