import * as Device from 'expo-device';
import { Platform, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HintRow } from '@/components/ui/hint-row';
import { ThemedText } from '@/components/ui/themed-text';
import { WebBadge } from '@/components/ui/web-badge';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { Redirect } from 'expo-router';

function getDevMenuHint() {
  if (Platform.OS === 'web') {
    return <ThemedText type="small">use browser devtools</ThemedText>;
  }
  if (Device.isDevice) {
    return (
      <ThemedText type="small">
        shake device or press <ThemedText type="code">m</ThemedText> in terminal
      </ThemedText>
    );
  }
  const shortcut = Platform.OS === 'android' ? 'cmd+m (or ctrl+m)' : 'cmd+d';
  return (
    <ThemedText type="small">
      press <ThemedText type="code">{shortcut}</ThemedText>
    </ThemedText>
  );
}

export default function HomeScreen() {

  // TODO: Onboard Session
  return <Redirect href="/(tabs)/notes" />
  // return <Redirect href="/(tabs)/home" />
  // return <Redirect href="/notes/e28bbd22-1d33-44ed-aa4b-b5ab2537d5df" />;

  return (
    <View className="flex-1 bg-background flex-row justify-center">
      <SafeAreaView
        className="flex-1 px-6 items-center w-full max-w-200 mx-auto"
        style={{ paddingBottom: BottomTabInset + Spacing.three, gap: Spacing.four }}>
        <View className="flex-1 items-center justify-center px-6 gap-6">
          <ThemedText type="title" className="text-center">
            Welcome to&nbsp;Expo
          </ThemedText>
        </View>

        <ThemedText type="code" className="uppercase tracking-wider text-center">
          get started
        </ThemedText>

        <View className="w-full gap-4 p-6 rounded-3xl bg-background-element border border-border">
          <HintRow
            title="Try editing"
            hint={<ThemedText type="code">src/app/index.tsx</ThemedText>}
          />
          <HintRow title="Dev tools" hint={getDevMenuHint()} />
          <HintRow
            title="Fresh start"
            hint={<ThemedText type="code">npm run reset-project</ThemedText>}
          />
        </View>

        {Platform.OS === 'web' && <WebBadge />}
      </SafeAreaView>
    </View>
  );
}
