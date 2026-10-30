import { useMemo } from "react";
import { Gesture } from "react-native-gesture-handler";
import { scheduleOnRN } from "react-native-worklets";

/**
 * Reusable double-tap gesture hook that triggers `onDoubleTap` on the JS thread
 * while coexisting cleanly with single-tap interactions.
 */
export function useDoubleTap(onDoubleTap: () => void) {
  return useMemo(() => {
    const singleTap = Gesture.Tap();
    const doubleTap = Gesture.Tap()
      .numberOfTaps(2)
      .onEnd(() => {
        "worklet";
        scheduleOnRN(onDoubleTap);
      });

    return Gesture.Exclusive(doubleTap, singleTap);
  }, [onDoubleTap]);
}
