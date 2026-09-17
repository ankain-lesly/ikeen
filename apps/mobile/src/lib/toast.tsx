import React from "react";
import { Text, View } from "react-native";
import Toast, { type BaseToastProps } from "react-native-toast-message";
import { AlertCircle, AlertTriangle, Check, Info } from "lucide-react-native";
import { useTheme } from "@/hooks/use-theme";
/**
 * Custom adaptive toast pill components matching iKeen design tokens.
 * - Shrink-to-fit width (adapts to short or long text, no forced full-width)
 * - Clean pill geometry (rounded-full)
 * - Eliminates rigid colored left border bar
 * - Dark & light mode adaptive via Uniwind tokens
 */
function SuccessToast({ text1, text2 }: BaseToastProps) {
  const colors = useTheme();
  return (
    <View className="self-center flex-row items-center gap-2.5 px-4 py-2.5 rounded-full bg-card border border-border shadow-md max-w-[90%]">
      <View className="w-5 h-5 rounded-full bg-primary/15 items-center justify-center">
        <Check size={12} color={colors.primary} strokeWidth={2.5} />
      </View>
      <View className="flex-shrink">
        <Text className="text-sm font-semibold text-text">{text1}</Text>
        {text2 ? (
          <Text className="text-xs text-text-secondary mt-0.5">{text2}</Text>
        ) : null}
      </View>
    </View>
  );
}

function InfoToast({ text1, text2 }: BaseToastProps) {
  const colors = useTheme();
  return (
    <View className="self-center flex-row items-center gap-2.5 px-4 py-2.5 rounded-full bg-card border border-border shadow-md max-w-[90%]">
      <View className="w-5 h-5 rounded-full bg-background-element items-center justify-center">
        <Info size={12} color={colors.textSecondary} strokeWidth={2.5} />
      </View>
      <View className="flex-shrink">
        <Text className="text-sm font-semibold text-text">{text1}</Text>
        {text2 ? (
          <Text className="text-xs text-text-secondary mt-0.5">{text2}</Text>
        ) : null}
      </View>
    </View>
  );
}

function WarningToast({ text1, text2 }: BaseToastProps) {
  return (
    <View className="self-center flex-row items-center gap-2.5 px-4 py-2.5 rounded-full bg-card border border-amber-500/30 shadow-md max-w-[90%]">
      <View className="w-5 h-5 rounded-full bg-amber-500/15 items-center justify-center">
        <AlertTriangle size={12} color="#f59e0b" strokeWidth={2.5} />
      </View>
      <View className="flex-shrink">
        <Text className="text-sm font-semibold text-text">{text1}</Text>
        {text2 ? (
          <Text className="text-xs text-text-secondary mt-0.5">{text2}</Text>
        ) : null}
      </View>
    </View>
  );
}

function ErrorToast({ text1, text2 }: BaseToastProps) {
  return (
    <View className="self-center flex-row items-center gap-2.5 px-4 py-2.5 rounded-full bg-card border border-red-500/30 shadow-md max-w-[90%]">
      <View className="w-5 h-5 rounded-full bg-red-500/15 items-center justify-center">
        <AlertCircle size={12} color="#ef4444" strokeWidth={2.5} />
      </View>
      <View className="flex-shrink">
        <Text className="text-sm font-semibold text-text">{text1}</Text>
        {text2 ? (
          <Text className="text-xs text-text-secondary mt-0.5">{text2}</Text>
        ) : null}
      </View>
    </View>
  );
}

export const toastConfig = {
  success: (props: BaseToastProps) => <SuccessToast {...props} />,
  info: (props: BaseToastProps) => <InfoToast {...props} />,
  warning: (props: BaseToastProps) => <WarningToast {...props} />,
  error: (props: BaseToastProps) => <ErrorToast {...props} />,
};

type ToastFn = ((title: string, description?: string) => void) & {
  success: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  hide: () => void;
};

function baseToast(title: string, description?: string) {
  Toast.show({
    type: "info",
    text1: title,
    text2: description,
    visibilityTime: 3000,
  });
}

/**
 * Concise, one-line toast API.
 * - Call directly: `toast("Hello world")` (defaults to info toast)
 * - Or call with variant: `toast.success("Saved")`, `toast.warning("Warning")`, `toast.error("Failed")`, `toast.info("Note")`
 * - Hide active: `toast.hide()`
 */
export const toast: ToastFn = Object.assign(baseToast, {
  success: (title: string, description?: string) => {
    Toast.show({
      type: "success",
      text1: title,
      text2: description,
      visibilityTime: 3000,
    });
  },
  info: (title: string, description?: string) => {
    Toast.show({
      type: "info",
      text1: title,
      text2: description,
      visibilityTime: 3000,
    });
  },
  warning: (title: string, description?: string) => {
    Toast.show({
      type: "warning",
      text1: title,
      text2: description,
      visibilityTime: 3000,
    });
  },
  error: (title: string, description?: string) => {
    Toast.show({
      type: "error",
      text1: title,
      text2: description,
      visibilityTime: 3000,
    });
  },
  hide: () => Toast.hide(),
});
