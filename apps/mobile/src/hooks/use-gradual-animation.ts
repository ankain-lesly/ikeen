import {
  useKeyboardHandler,
  useKeyboardState,
} from "react-native-keyboard-controller";
import { useSharedValue } from "react-native-reanimated";

export const useKeyboardGradualAnimation = () => {
  const height = useSharedValue(0);
  const { isVisible} = useKeyboardState();
  // const [visibleHeight, setVisibleHeight] = useState(0);
  // const [visibleHeight2, setVisibleHeight2] = useState(0);


  // const updateVisibleHeight = useCallback((value: number) => {
  //   setVisibleHeight(value);
  // }, []);

  
  useKeyboardHandler(
    {
      onMove: (event) => {
        "worklet";
        // Config
        height.value = Math.max(event.height, 0);
        // scheduleOnRN(
        //   () => setVisibleHeight(Math.max(event.height, 0)),
        // );
        // scheduleOnRN(setVisibleHeight, Math.max(event.height, 0));
        // scheduleOnRN(updateVisibleHeight, Math.max(event.height, 0));
        // setVisibleHeight(Math.max(event.height, 0))
      },
    },
    [],
  );

  
  // const hasHeight = visibleHeight > 0;
  // const keyboardActive = isVisible && hasHeight;


  // log({visibleHeight,  height, isVisible, hasHeight, keyboardActive, others })

  // Return
  // return { height, isVisible, hasHeight, keyboardActive };
  return { height, isVisible };
};
