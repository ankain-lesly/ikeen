import { useMemo } from "react";
import type { MarkdownStyle } from "react-native-enriched-markdown";
import { useTheme } from "@/hooks/use-theme";

export function useMarkdownStyle(size: 14 | 16 = 16): MarkdownStyle {
  const colors = useTheme();

  return useMemo(() => {
    const lineHeight = size === 14 ? 22 : 24;
    return {
      paragraph: { fontSize: size, lineHeight, color: colors.text },
      h1: { fontSize: size + 8, fontWeight: "700", color: colors.text },
      h2: { fontSize: size + 4, fontWeight: "700", color: colors.text },
      h3: { fontSize: size + 2, fontWeight: "600", color: colors.text },
      link: { color: colors.primary },
      code: {
        fontSize: size - 2,
        color: colors.text,
        backgroundColor: colors.backgroundElement,
      },
      blockquote: {
        color: colors.textSecondary,
        borderColor: colors.border,
        backgroundColor: colors.backgroundElement,
      },
      list: {
        fontSize: size,
        color: colors.text,
        bulletColor: colors.textSecondary,
      },
    };
  }, [colors, size]);
}
