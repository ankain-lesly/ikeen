import {
  useKeyboardHandler,
  useKeyboardState,
} from "react-native-keyboard-controller";
import { useSharedValue } from "react-native-reanimated";

export const useKeyboardGradualAnimation = () => {
  const height = useSharedValue(0);
  const { isVisible } = useKeyboardState();

  useKeyboardHandler(
    {
      onMove: (event) => {
        "worklet";
        height.value = Math.max(event.height, 0);
      },
    },
    [],
  );
  return { height, isVisible };
};
