import type { ReactNode } from 'react';
import { View } from 'react-native';

import { ThemedText } from './themed-text';

type HintRowProps = {
  title?: string;
  hint?: ReactNode;
};

export function HintRow({ title = 'Try editing', hint = 'app/index.tsx' }: HintRowProps) {
  return (
    <View className="flex-row items-center justify-between py-1">
      <ThemedText type="small">{title}</ThemedText>
      <View className="rounded-lg py-0.5 px-2 bg-background-selected">
        <ThemedText themeColor="textSecondary">{hint}</ThemedText>
      </View>
    </View>
  );
}
