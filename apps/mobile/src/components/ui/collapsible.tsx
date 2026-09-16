import { useState, type PropsWithChildren } from 'react';
import { Pressable, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import Animated, { FadeIn } from 'react-native-reanimated';

import { ThemedText } from '@/components/ui/themed-text';
import { useTheme } from '@/hooks/use-theme';

export function Collapsible({ children, title }: PropsWithChildren & { title: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const colors = useTheme();

  return (
    <View className="w-full">
      <Pressable
        className="flex-row items-center gap-2 min-h-11 active:opacity-70"
        onPress={() => setIsOpen((value) => !value)}>
        <View className="w-6 h-6 rounded-xl justify-center items-center bg-background-element">
          <SymbolView
            name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
            size={14}
            weight="bold"
            tintColor={colors.text}
            style={{ transform: [{ rotate: isOpen ? '-90deg' : '90deg' }] }}
          />
        </View>


        <ThemedText type="small" className="text-text">
          {title}
        </ThemedText>
      </Pressable>

      {isOpen && (
        <Animated.View entering={FadeIn.duration(200)}>
          <View className="mt-3 ml-4 p-4 rounded-2xl bg-background-element gap-2 border border-border">
            {children}
          </View>
        </Animated.View>
      )}
    </View>
  );
}
