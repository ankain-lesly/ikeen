import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";

export function AnimatedEntryView({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <Animated.View
      entering={FadeInDown.duration(200)}
      exiting={FadeOutDown.duration(150)}
      className={className}>
      {children}
    </Animated.View>
  );
}
