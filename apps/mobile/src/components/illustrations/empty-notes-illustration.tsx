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

interface EmptyNotesIllustrationProps {
  width?: number;
  height?: number;
}

export function EmptyNotesIllustration({
  width = 160,
  height = 130,
}: EmptyNotesIllustrationProps) {
  const colors = useTheme();

  return (
    <Svg width={width} height={height} viewBox="0 0 160 130" fill="none">
      <Defs>
        <LinearGradient id="emptyCardGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor={colors.backgroundSelected} stopOpacity="0.5" />
          <Stop offset="100%" stopColor={colors.backgroundElement} stopOpacity="0.2" />
        </LinearGradient>
      </Defs>

      {/* Ambient background rings */}
      <Circle cx="80" cy="65" r="50" stroke={colors.border} strokeWidth="1" strokeDasharray="4 4" />
      <Circle cx="80" cy="65" r="32" fill={colors.backgroundElement} fillOpacity="0.4" />

      {/* Stacked Draft Sheets */}
      <Rect
        x="50"
        y="30"
        width="60"
        height="74"
        rx="8"
        transform="rotate(-8 50 30)"
        fill={colors.backgroundSelected}
        stroke={colors.border}
        strokeWidth="1.5"
      />
      <Rect
        x="54"
        y="28"
        width="62"
        height="76"
        rx="8"
        fill="url(#emptyCardGrad)"
        stroke={colors.border}
        strokeWidth="1.5"
      />

      {/* Folded Corner Accent */}
      <Path
        d="M104 28L116 40H106C104.9 40 104 39.1 104 38V28Z"
        fill={colors.backgroundSelected}
        stroke={colors.border}
        strokeWidth="1"
      />

      {/* Ghost text lines */}
      <Rect x="64" y="44" width="30" height="3" rx="1.5" fill={colors.text} fillOpacity="0.6" />
      <Rect x="64" y="52" width="42" height="2.5" rx="1.25" fill={colors.textSecondary} fillOpacity="0.4" />
      <Rect x="64" y="59" width="36" height="2.5" rx="1.25" fill={colors.textSecondary} fillOpacity="0.4" />
      <Rect x="64" y="66" width="24" height="2.5" rx="1.25" fill={colors.textSecondary} fillOpacity="0.4" />

      {/* Minimal Pencil Drawing Vector with Primary Tip */}
      <Path
        d="M112 85L124 73C125 72 127 72 128 73L130 75C131 76 131 78 130 79L118 91L110 93L112 85Z"
        fill={colors.foreground}
        fillOpacity="0.1"
        stroke={colors.border}
        strokeWidth="1.5"
      />
      {/* Tiny Primary Nib */}
      <Path d="M110 93L112 89L114 91Z" fill={colors.primary} />

      {/* Floating Sparkles */}
      <Path
        d="M36 45L37.5 49.5L42 51L37.5 52.5L36 57L34.5 52.5L30 51L34.5 49.5Z"
        fill={colors.foreground}
        fillOpacity="0.2"
      />
      <Circle cx="134" cy="40" r="2.5" fill={colors.primary} fillOpacity="0.7" />
    </Svg>
  );
}
