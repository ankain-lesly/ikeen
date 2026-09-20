import { useKeyboardGradualAnimation } from "@/hooks/use-gradual-animation";
import Animated, { useAnimatedStyle } from "react-native-reanimated";

export const KeyboardGradualAnimation = () => {
  const { height } = useKeyboardGradualAnimation();

  const fakeView = useAnimatedStyle(() => {
    return {
      height: Math.abs(height.value),
    };
  }, []);

  return <Animated.View style={fakeView} />;
};
