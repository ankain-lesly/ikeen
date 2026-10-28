import React, { useEffect, useState } from 'react';
import { View, Text, Pressable,  } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from '@/lib/haptics';
import { ChevronRight } from 'lucide-react-native';
import Svg, { Rect, Line, G } from 'react-native-svg';
import { useTheme } from '@/hooks/use-theme';

const ONBOARDING_STORAGE_KEY = '@ikeen_onboarded';

/**
 * Primary App Entry & Onboarding Screen.
 * Automatically redirects onboarded users to /(tabs)/home while presenting
 * a focused, distraction-free onboarding experience for newcomers.
 */
export default function AppEntryScreen() {
  const router = useRouter();
  const colors = useTheme();

  const [isReady, setIsReady] = useState(false);
  const [isOnboarded, setIsOnboarded] = useState(false);

  useEffect(() => {
    async function checkOnboardingStatus() {
      try {
        const value = await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY);
        if (value === 'true') {
          setIsOnboarded(true);
        }
      } catch (error) {
        console.log('[🚨] [Onboarding] Error checking status:', error);
      } finally {
        setIsReady(true);
      }
    }

    checkOnboardingStatus();
  }, []);

  // Avoid flash of content during fast storage check
  if (!isReady) {
    return <View className="flex-1 bg-background" />;
  }

  // Already onboarded -> jump directly into the main tabs
  if (isOnboarded) {
    // return <Redirect href="/notes/28e0c8f6-0d24-4168-ba36-62f7bedb8809" />;
    // return <Redirect href="/(tabs)/notes" />;
    return <Redirect href="/(tabs)/home" />;
  }

  const handleGetStarted = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
      router.replace('/(tabs)/notes');
    } catch (error) {
      console.log('[🚨] [Onboarding] Error saving status:', error);
      router.replace('/(tabs)/notes');
    }
  };

  return (
    <View className="py-safe flex-1 bg-background justify-between items-center px-6">
      {/* Top Spacer & Center Graphic */}
      <View className="flex-1 items-center justify-center pt-8">
        <OnboardingIllustration />
      </View>

      {/* Bottom Typography & Action */}
      <View className="w-full items-center pb-16">
        {/* Main Heading */}
        <Text className="text-[32px] font-bold text-text text-center tracking-tight leading-[1.2] mb-4">
          Write Everything{'\n'}Avoid Oversharing
        </Text>

        {/* Subtitle Quote */}
        <Text className="text-[13px] font-normal text-text-secondary text-center leading-relaxed max-w-70 mb-10">
          People can be clever as high as the sky, but as long as they don&apos;t write, they will be lost in society and from history.
        </Text>

        {/* Circular Dark Next Button */}
        <Pressable
          onPress={handleGetStarted}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Get Started"
          className="w-14 h-14 rounded-full bg-foreground items-center justify-center shadow-lg active:opacity-80">
          <ChevronRight size={22} color={colors.background} strokeWidth={2.5} />
        </Pressable>
      </View>
    </View>
  );
}


/**
 * High-fidelity generative geometric illustration matching the reference design.
 * Features staggered vertical strokes in emerald teal, mint cyan, coral orange,
 * accent terracotta, and cobalt blue across an inclined geometric envelope.
 */
function OnboardingIllustration() {
  return (
    <Svg width={230} height={250} viewBox="0 0 230 250">
      <G>
        {/* ========================================================
            1. Teal / Emerald Upper Left Cluster (Stepping Upward)
           ======================================================== */}
        <Rect x={30} y={76} width={4.5} height={44} rx={2.25} fill="#00A876" />
        <Rect x={42} y={64} width={4.5} height={56} rx={2.25} fill="#00A876" />
        <Rect x={54} y={54} width={4.5} height={66} rx={2.25} fill="#00A876" />
        <Rect x={66} y={45} width={4.5} height={75} rx={2.25} fill="#00A876" />
        <Rect x={78} y={38} width={4.5} height={82} rx={2.25} fill="#00A876" />
        <Rect x={90} y={32} width={4.5} height={88} rx={2.25} fill="#00A876" />

        {/* ========================================================
            2. Mint / Light Aqua High Altitude Accent Lines
           ======================================================== */}
        <Line x1={102} y1={24} x2={102} y2={120} stroke="#5EEAD4" strokeWidth={1.5} />
        <Line x1={114} y1={17} x2={114} y2={120} stroke="#5EEAD4" strokeWidth={1.5} />
        <Line x1={126} y1={11} x2={126} y2={120} stroke="#5EEAD4" strokeWidth={1.5} />
        <Line x1={138} y1={6} x2={138} y2={120} stroke="#5EEAD4" strokeWidth={1.5} />

        {/* ========================================================
            3. Vibrant Orange / Coral Upper Right Bars
           ======================================================== */}
        <Rect x={102} y={44} width={4.5} height={76} rx={2.25} fill="#FF5E2B" />
        <Rect x={114} y={36} width={4.5} height={84} rx={2.25} fill="#FF5E2B" />
        <Rect x={126} y={30} width={4.5} height={90} rx={2.25} fill="#FF5E2B" />
        <Rect x={138} y={24} width={4.5} height={96} rx={2.25} fill="#FF5E2B" />
        <Rect x={150} y={20} width={4.5} height={100} rx={2.25} fill="#FF5E2B" />
        <Rect x={162} y={16} width={4.5} height={104} rx={2.25} fill="#FF5E2B" />

        {/* ========================================================
            4. Fine Terracotta Accent Lines (Center Drop)
           ======================================================== */}
        <Line x1={66} y1={120} x2={66} y2={186} stroke="#E11D48" strokeWidth={1.2} />
        <Line x1={78} y1={120} x2={78} y2={178} stroke="#E11D48" strokeWidth={1.2} />
        <Line x1={90} y1={120} x2={90} y2={168} stroke="#E11D48" strokeWidth={1.2} />
        <Line x1={102} y1={120} x2={102} y2={158} stroke="#E11D48" strokeWidth={1.2} />

        {/* ========================================================
            5. Royal / Cobalt Blue Lower Right Staggered Bars
           ======================================================== */}
        <Rect x={78} y={120} width={4.5} height={66} rx={2.25} fill="#2563EB" />
        <Rect x={90} y={120} width={4.5} height={59} rx={2.25} fill="#2563EB" />
        <Rect x={102} y={120} width={4.5} height={52} rx={2.25} fill="#2563EB" />
        <Rect x={114} y={120} width={4.5} height={46} rx={2.25} fill="#2563EB" />
        <Rect x={126} y={120} width={4.5} height={39} rx={2.25} fill="#2563EB" />
        <Rect x={138} y={120} width={4.5} height={33} rx={2.25} fill="#2563EB" />
        <Rect x={150} y={120} width={4.5} height={26} rx={2.25} fill="#2563EB" />
        <Rect x={162} y={120} width={4.5} height={20} rx={2.25} fill="#2563EB" />
      </G>
    </Svg>
  );
}
