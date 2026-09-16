import React from 'react';
import Svg, {
  Defs,
  RadialGradient,
  LinearGradient,
  Stop,
  Circle,
  Rect,
  Path,
  Ellipse,
} from 'react-native-svg';

interface MascotProps {
  size?: number;
  glowColor?: string;
  accentColor?: string;
}

export function IKeenMascot({
  size = 140,
  glowColor = '#208AEF',
  accentColor = '#00F2FE',
}: MascotProps) {
  return (
    <Svg viewBox="0 0 200 200" width={size} height={size}>
      <Defs>
        <RadialGradient id="mascotGlow" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={glowColor} stopOpacity="0.4" />
          <Stop offset="65%" stopColor="#0a7ea4" stopOpacity="0.1" />
          <Stop offset="100%" stopColor="#0a7ea4" stopOpacity="0" />
        </RadialGradient>

        <LinearGradient id="mascotVisor" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#141E30" />
          <Stop offset="45%" stopColor="#243B55" />
          <Stop offset="85%" stopColor="#0a7ea4" />
          <Stop offset="100%" stopColor={accentColor} />
        </LinearGradient>

        <LinearGradient id="mascotHelmet" x1="20%" y1="0%" x2="80%" y2="100%">
          <Stop offset="0%" stopColor="#FFFFFF" />
          <Stop offset="50%" stopColor="#EDF2F7" />
          <Stop offset="100%" stopColor="#CBD5E0" />
        </LinearGradient>

        <LinearGradient id="mascotAccent" x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor="#00F2FE" />
          <Stop offset="100%" stopColor="#4FACFE" />
        </LinearGradient>

        <LinearGradient id="mascotPod" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#208AEF" />
          <Stop offset="100%" stopColor="#0a7ea4" />
        </LinearGradient>
      </Defs>

      {/* Ambient background glow */}
      <Circle cx="100" cy="100" r="92" fill="url(#mascotGlow)" />

      {/* Antenna */}
      <Rect x="96" y="24" width="8" height="20" rx="4" fill="#A0AEC0" />
      <Circle cx="100" cy="20" r="10" fill="url(#mascotAccent)" />
      <Circle cx="100" cy="20" r="5" fill="#FFFFFF" />

      {/* Side Pods */}
      <Rect x="26" y="82" width="18" height="42" rx="9" fill="url(#mascotPod)" />
      <Rect x="29" y="89" width="12" height="28" rx="6" fill="#1A202C" />
      <Circle cx="35" cy="103" r="3" fill="#00F2FE" />

      <Rect x="156" y="82" width="18" height="42" rx="9" fill="url(#mascotPod)" />
      <Rect x="159" y="89" width="12" height="28" rx="6" fill="#1A202C" />
      <Circle cx="165" cy="103" r="3" fill="#00F2FE" />

      {/* Suit Collar */}
      <Path d="M62 148 Q100 162 138 148 L146 172 Q100 186 54 172 Z" fill="#E2E8F0" />
      <Path d="M74 154 Q100 165 126 154 L129 168 Q100 178 71 168 Z" fill="url(#mascotAccent)" />

      {/* Helmet Shell */}
      <Circle cx="100" cy="102" r="66" fill="url(#mascotHelmet)" />
      <Circle cx="100" cy="102" r="65" fill="none" stroke="#CBD5E0" strokeWidth="1.5" />

      {/* Visor Area */}
      <Rect x="42" y="60" width="116" height="82" rx="40" fill="#0F172A" />
      <Rect x="44" y="62" width="112" height="78" rx="38" fill="url(#mascotVisor)" />

      {/* Glass Reflections */}
      <Path d="M52 74 Q100 56 144 74 Q100 66 52 74 Z" fill="#FFFFFF" opacity={0.35} />
      <Ellipse
        cx={64}
        cy={80}
        rx={10}
        ry={4}
        transform="rotate(-25 64 80)"
        fill="#FFFFFF"
        opacity={0.45}
      />

      {/* Keen Eyes */}
      <Ellipse cx={76} cy={104} rx={12} ry={15} fill="#00F2FE" />
      <Ellipse cx={76} cy={104} rx={8} ry={11} fill="#FFFFFF" />
      <Circle cx={79} cy={99} r={3.5} fill="#FFFFFF" />
      <Circle cx={73} cy={108} r={1.5} fill="#FFFFFF" />

      <Ellipse cx={124} cy={104} rx={12} ry={15} fill="#00F2FE" />
      <Ellipse cx={124} cy={104} rx={8} ry={11} fill="#FFFFFF" />
      <Circle cx={127} cy={99} r={3.5} fill="#FFFFFF" />
      <Circle cx={121} cy={108} r={1.5} fill="#FFFFFF" />

      {/* Friendly Smile */}
      <Path
        d="M92 118 Q100 126 108 118"
        fill="none"
        stroke="#00F2FE"
        strokeWidth={3}
        strokeLinecap="round"
      />

      {/* Cheek Glows */}
      <Circle cx={60} cy={115} r={5} fill="#FF7AC6" opacity={0.4} />
      <Circle cx={140} cy={115} r={5} fill="#FF7AC6" opacity={0.4} />

      {/* Sparkles */}
      <Path
        d="M168 44 Q170 50 176 52 Q170 54 168 60 Q166 54 160 52 Q166 50 168 44 Z"
        fill="#00F2FE"
      />
      <Path
        d="M36 50 Q38 54 42 56 Q38 58 36 62 Q34 58 30 56 Q34 54 36 50 Z"
        fill="#208AEF"
        opacity={0.8}
      />
      <Circle cx={158} cy={152} r={2.5} fill="#00F2FE" opacity={0.7} />
    </Svg>
  );
}
