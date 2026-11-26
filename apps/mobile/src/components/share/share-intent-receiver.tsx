import React, { useState } from "react";
import { useShareIntent } from "expo-share-intent";
import { ShareTargetSheet } from "./share-target-sheet";

export function ShareIntentReceiver() {
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent();
  const [dismissedIntentKey, setDismissedIntentKey] = useState<string | null>(null);

  // Derive whether an active valid share intent is present
  const currentIntentKey =
    hasShareIntent && shareIntent
      ? shareIntent.text ||
        shareIntent.webUrl ||
        (shareIntent.files && shareIntent.files.length > 0
          ? shareIntent.files.map((f) => f.path).join(",")
          : null)
      : null;

  const isPresented = Boolean(
    currentIntentKey && currentIntentKey !== dismissedIntentKey,
  );

  const handleDismiss = () => {
    if (currentIntentKey) {
      setDismissedIntentKey(currentIntentKey);
    }
    resetShareIntent();
  };

  if (!isPresented || !shareIntent) return null;

  return (
    <ShareTargetSheet
      key={currentIntentKey}
      isPresented={isPresented}
      onDismiss={handleDismiss}
      shareIntent={shareIntent}
      onResetIntent={resetShareIntent}
    />
  );
}
