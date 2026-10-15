import React from "react";
import { useKeyboardGradualAnimation } from "@/hooks/use-gradual-animation";
import Animated, {
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export const KeyboardGradualAnimation = () => {
  const { height } = useKeyboardGradualAnimation();

  const fakeView = useAnimatedStyle(() => {
    return {
      height: Math.abs(height.value),
    };
  }, []);

  return <Animated.View style={fakeView} />;
};

export const KeyboardGradualWrapper = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { isVisible } = useKeyboardGradualAnimation();
  const insets = useSafeAreaInsets();

  // Initialize the shared animation value on the native layer
  const height = useSharedValue(insets.bottom * 2);

  // Reanimated v4: Native UI-Thread-level reaction hook replaces slow JavaScript useEffect loops
  useAnimatedReaction(
    () => isVisible, // 1. Dependency source tracked by the engine
    (visible) => {
      // 2. Performance worklet executing directly on the UI thread
      "worklet";

      // Too Bouncy
      const timingConfig = {
        duration: 50,
        // easing: Easing.bezier(0.33, 1, 0.68, 1), // Native system curve matching iOS/Android
        // easing: Easing.out(Easing.quad),
      };

      // Instantly adjust spacer height to eliminate double padding overlaps
      height.value = visible
        ? withTiming(0, timingConfig)
        : withTiming(insets.bottom, timingConfig);
    },
    [isVisible, insets.bottom], // Dependency injection bounds matching React compilation parameters
  );

  // Buttery-smooth hardware accelerated style configuration
  const fakeViewStyle = useAnimatedStyle(() => {
    return {
      height: Math.abs(height.value),
    };
  }, []);

  return (
    <Animated.View
      className={`flex-1`}>
      {children}
      <Animated.View style={fakeViewStyle} />
      <KeyboardGradualAnimation />
    </Animated.View>
  );
};
