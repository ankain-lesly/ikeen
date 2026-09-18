import React from 'react';
import { View } from 'react-native';
import { Lock } from 'lucide-react-native';

export interface FolderGlyphProps {
  color?: string;
  isLocked?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * 2.5D Layered Folder Graphic matching the Catat reference UI:
 * - Back tab/flap with soft pastel tint
 * - Front rounded body in bold vibrant accent color
 * - Center slot cutout or Lock badge for protected folders
 */
export function FolderGlyph({
  color = '#2563eb',
  isLocked = false,
  size = 'md',
  className = '',
}: FolderGlyphProps) {
  // Dimension configurations
  const dimensions = {
    sm: {
      containerW: 42,
      containerH: 36,
      tabW: 20,
      tabH: 10,
      tabRadius: 6,
      bodyH: 30,
      bodyRadius: 10,
      slotW: 14,
      slotH: 3,
      lockSize: 12,
    },
    md: {
      containerW: 56,
      containerH: 48,
      tabW: 26,
      tabH: 14,
      tabRadius: 8,
      bodyH: 40,
      bodyRadius: 14,
      slotW: 20,
      slotH: 4,
      lockSize: 16,
    },
    lg: {
      containerW: 72,
      containerH: 62,
      tabW: 34,
      tabH: 18,
      tabRadius: 10,
      bodyH: 52,
      bodyRadius: 18,
      slotW: 26,
      slotH: 5,
      lockSize: 20,
    },
  }[size];

  return (
    <View
      className={`relative justify-end ${className}`}
      style={{
        width: dimensions.containerW,
        height: dimensions.containerH,
      }}>
      {/* Back Folder Tab / Flap (Lighter tinted layer) */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 3,
          width: dimensions.tabW,
          height: dimensions.tabH,
          borderTopLeftRadius: dimensions.tabRadius,
          borderTopRightRadius: dimensions.tabRadius,
          backgroundColor: color,
          opacity: 0.4,
        }}
      />

      {/* Front Folder Main Pouch Body */}
      <View
        className="w-full items-center justify-center shadow-sm"
        style={{
          height: dimensions.bodyH,
          borderRadius: dimensions.bodyRadius,
          backgroundColor: color,
        }}>
        {isLocked ? (
          <Lock size={dimensions.lockSize} color="#ffffff" strokeWidth={2.4} />
        ) : (
          <View
            style={{
              width: dimensions.slotW,
              height: dimensions.slotH,
              borderRadius: dimensions.slotH / 2,
              backgroundColor: 'rgba(255, 255, 255, 0.85)',
            }}
          />
        )}
      </View>
    </View>
  );
}
