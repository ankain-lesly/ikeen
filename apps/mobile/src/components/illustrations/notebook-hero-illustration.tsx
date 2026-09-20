import React from 'react';
import Svg, {
  Path,
  Rect,
  Circle,
  Defs,
  LinearGradient,
  Stop,
} from 'react-native-svg';
import { useTheme } from '@/hooks/use-theme';

interface NotebookHeroIllustrationProps {
  width?: number;
  height?: number;
}

export function NotebookHeroIllustration({
  width = 140,
  height = 110,
}: NotebookHeroIllustrationProps) {
  const colors = useTheme();

  return (
    <Svg width={width} height={height} viewBox="0 0 140 110" fill="none">
      <Defs>
        <LinearGradient id="heroCardGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor={colors.backgroundSelected} stopOpacity="0.8" />
          <Stop offset="100%" stopColor={colors.backgroundElement} stopOpacity="0.4" />
        </LinearGradient>
      </Defs>

      {/* Background ambient decorative circles */}
      <Circle cx="105" cy="28" r="22" fill={colors.backgroundSelected} fillOpacity="0.4" />
      <Circle cx="35" cy="85" r="14" fill={colors.backgroundElement} fillOpacity="0.6" />

      {/* Back Note Page (slightly rotated/tilted) */}
      <Rect
        x="32"
        y="16"
        width="65"
        height="80"
        rx="8"
        transform="rotate(-6 32 16)"
        fill={colors.backgroundSelected}
        stroke={colors.border}
        strokeWidth="1.5"
      />

      {/* Front Note Pad */}
      <Rect
        x="42"
        y="18"
        width="68"
        height="82"
        rx="10"
        fill="url(#heroCardGrad)"
        stroke={colors.border}
        strokeWidth="1.5"
      />

      {/* Notebook Header Strip */}
      <Rect
        x="42"
        y="18"
        width="68"
        height="18"
        rx="10"
        fill={colors.backgroundElement}
      />
      <Rect
        x="42"
        y="28"
        width="68"
        height="8"
        fill={colors.backgroundElement}
      />

      {/* Notebook Binding Dots */}
      <Circle cx="54" cy="27" r="2.5" fill={colors.textSecondary} fillOpacity="0.5" />
      <Circle cx="76" cy="27" r="2.5" fill={colors.textSecondary} fillOpacity="0.5" />
      <Circle cx="98" cy="27" r="2.5" fill={colors.textSecondary} fillOpacity="0.5" />

      {/* Note Content Lines */}
      <Rect x="54" y="44" width="44" height="3" rx="1.5" fill={colors.text} fillOpacity="0.8" />
      <Rect x="54" y="53" width="34" height="2.5" rx="1.25" fill={colors.textSecondary} fillOpacity="0.5" />
      <Rect x="54" y="61" width="40" height="2.5" rx="1.25" fill={colors.textSecondary} fillOpacity="0.5" />
      <Rect x="54" y="69" width="26" height="2.5" rx="1.25" fill={colors.textSecondary} fillOpacity="0.5" />

      {/* Minimal Emerald Primary Accent Checkmark Badge */}
      <Circle cx="96" cy="80" r="9" fill={colors.primary} />
      <Path
        d="M93 80L95.2 82.2L99 78"
        stroke="#ffffff"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Floating Sparkle / Star (Monochrome stroke with primary dot) */}
      <Path
        d="M20 30L22 36L28 38L22 40L20 46L18 40L12 38L18 36Z"
        fill={colors.foreground}
        fillOpacity="0.15"
      />
      <Circle cx="120" cy="50" r="2" fill={colors.primary} fillOpacity="0.7" />
    </Svg>
  );
}
