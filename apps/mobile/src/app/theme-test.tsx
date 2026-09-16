import React, { useState } from "react";
import { ScrollView, View, Text, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Uniwind, useUniwind } from "uniwind";

import {
  Palette,
  Sparkles,
  Layers,
  CheckCircle2,
  RefreshCw,
  Rocket,
  ShieldCheck,
} from "lucide-react-native";

import { BottomTabInset, Spacing } from "@/constants/theme";
import { IKeenMascot } from "@/components/ikeen-mascot";
import MascotSvg from "@/assets/images/ikeen-mascot.svg";

export default function ThemeTestScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<
    "mascot" | "tokens" | "components"
  >("mascot");
  const [count, setCount] = useState(0);
  const [accentColor, setAccentColor] = useState("#00F2FE");
  const isSvgComponent = typeof MascotSvg === "function";

  const colorOptions = [
    { label: "Cyan", colorHex: "#00F2FE" },
    { label: "Purple", colorHex: "#A855F7" },
    { label: "Emerald", colorHex: "#10B981" },
    { label: "Amber", colorHex: "#F59E0B" },
  ];

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + Spacing.three,
          paddingBottom: BottomTabInset + Spacing.six,
          paddingHorizontal: Spacing.four,
        }}
        showsVerticalScrollIndicator={false}>
        {/* Header Section */}
        <View className="mb-5">
          <View className="flex-row items-center gap-2 mb-1">
            <View className="p-2 rounded-xl bg-primary/10">
              <Palette size={22} color="#0a7ea4" />
            </View>
            <Text className="text-2xl font-bold text-text">
              Uniwind & SVG Showcase
            </Text>
          </View>
          <Text className="text-sm text-text-secondary">
            Tailwind CSS v4 with default Expo theme tokens, vector graphics &
            Astro Keen mascot.
          </Text>
        </View>

<ThemeSwitcher />

        {/* Tab Switcher */}
        <View className="flex-row p-1 mb-6 rounded-xl bg-background-element border border-border">
          <Pressable
            onPress={() => setActiveTab("mascot")}
            className={`flex-1 py-2 rounded-lg items-center ${
              activeTab === "mascot" ? "bg-background-selected" : ""
            }`}>
            <Text
              className={`text-sm font-medium ${
                activeTab === "mascot"
                  ? "text-text font-semibold"
                  : "text-text-secondary"
              }`}>
              Mascot
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab("tokens")}
            className={`flex-1 py-2 rounded-lg items-center ${
              activeTab === "tokens" ? "bg-background-selected" : ""
            }`}>
            <Text
              className={`text-sm font-medium ${
                activeTab === "tokens"
                  ? "text-text font-semibold"
                  : "text-text-secondary"
              }`}>
              Theme Tokens
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab("components")}
            className={`flex-1 py-2 rounded-lg items-center ${
              activeTab === "components" ? "bg-background-selected" : ""
            }`}>
            <Text
              className={`text-sm font-medium ${
                activeTab === "components"
                  ? "text-text font-semibold"
                  : "text-text-secondary"
              }`}>
              Components
            </Text>
          </Pressable>
        </View>

        {activeTab === "mascot" && (
          /* Mascot Showcase Tab */
          <View className="gap-5">
            {/* Hero Mascot Card */}
            <View className="p-6 rounded-3xl bg-background-element border border-border items-center">
              <View className="px-3 py-1 mb-3 rounded-full bg-primary/10 border border-primary/20 flex-row items-center gap-1.5">
                <Rocket size={13} color="#0a7ea4" />
                <Text className="text-xs font-semibold text-primary uppercase tracking-wider">
                  Official Mascot • Astro Keen
                </Text>
              </View>

              {/* Native React-Native-SVG Component */}
              <View className="my-2 items-center justify-center">
                <IKeenMascot size={160} accentColor={accentColor} />
              </View>

              <Text className="text-xl font-extrabold text-text mt-2">
                Astro Keen
              </Text>
              <Text className="text-xs text-text-secondary text-center max-w-65 mt-1">
                Your intelligent, swift guide across the iKeen ecosystem.
              </Text>

              {/* Accent Color Switcher */}
              <View className="w-full mt-5 pt-4 border-t border-border/60">
                <Text className="text-xs font-semibold text-text-secondary mb-2.5 text-center">
                  Live Visor Glow Customization
                </Text>
                <View className="flex-row justify-center gap-2">
                  {colorOptions.map((opt) => (
                    <Pressable
                      key={opt.colorHex}
                      onPress={() => setAccentColor(opt.colorHex)}
                      className={`px-3 py-1.5 rounded-xl border flex-row items-center gap-1.5 ${
                        accentColor === opt.colorHex
                          ? "border-primary bg-background-selected"
                          : "border-border bg-background"
                      }`}>
                      <View
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: opt.colorHex }}
                      />
                      <Text
                        className={`text-xs ${
                          accentColor === opt.colorHex
                            ? "text-text font-bold"
                            : "text-text-secondary"
                        }`}>
                        {opt.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>

            {/* Direct .svg File Import Test */}
            <View className="p-4 rounded-2xl bg-background-element border border-border">
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center gap-2">
                  <ShieldCheck size={18} color="#0a7ea4" />
                  <Text className="text-sm font-bold text-text">
                    Direct .svg Import Test
                  </Text>
                </View>
                <View className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  <Text className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    Transformer Active
                  </Text>
                </View>
              </View>
              <Text className="text-xs text-text-secondary mb-3">
                Imported directly from{" "}
                <Text className="font-mono text-text">
                  @/assets/images/ikeen-mascot.svg
                </Text>{" "}
                via{" "}
                <Text className="font-mono text-text">
                  react-native-svg-transformer
                </Text>
                .
              </Text>
              <View className="flex-row items-center justify-center p-3 rounded-xl bg-background border border-border">
                {isSvgComponent ? (
                  <MascotSvg width={80} height={80} />
                ) : (
                  <IKeenMascot size={80} accentColor={accentColor} />
                )}
              </View>
            </View>
          </View>
        )}

        {activeTab === "tokens" && (
          /* Tokens Preview Tab */
          <View className="gap-4">
            <Text className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
              Expo Theme Colors in Uniwind
            </Text>

            {/* Token Card 1: Background & Foreground */}
            <View className="p-4 rounded-2xl bg-background-element border border-border gap-2">
              <View className="flex-row items-center justify-between">
                <Text className="text-base font-semibold text-text">
                  Surface & Text
                </Text>
                <View className="px-2 py-0.5 rounded-full bg-primary/15">
                  <Text className="text-xs font-medium text-primary">
                    Active
                  </Text>
                </View>
              </View>
              <Text className="text-sm text-text-secondary">
                Using{" "}
                <Text className="font-mono text-xs text-text">
                  bg-background-element
                </Text>{" "}
                and{" "}
                <Text className="font-mono text-xs text-text">text-text</Text>.
              </Text>
            </View>

            {/* Color Palette Grid */}
            <View className="gap-2.5">
              <View className="flex-row gap-3">
                <View className="flex-1 p-3.5 rounded-xl bg-background border border-border items-center justify-center">
                  <Text className="text-xs font-bold text-text">
                    bg-background
                  </Text>
                  <Text className="text-[11px] text-text-secondary">
                    Base Surface
                  </Text>
                </View>
                <View className="flex-1 p-3.5 rounded-xl bg-background-element border border-border items-center justify-center">
                  <Text className="text-xs font-bold text-text">
                    bg-background-element
                  </Text>
                  <Text className="text-[11px] text-text-secondary">
                    Elevated Element
                  </Text>
                </View>
              </View>

              <View className="flex-row gap-3">
                <View className="flex-1 p-3.5 rounded-xl bg-background-selected border border-border items-center justify-center">
                  <Text className="text-xs font-bold text-text">
                    bg-background-selected
                  </Text>
                  <Text className="text-[11px] text-text-secondary">
                    Selected State
                  </Text>
                </View>
                <View className="flex-1 p-3.5 rounded-xl bg-primary items-center justify-center">
                  <Text className="text-xs font-bold text-white">
                    bg-primary
                  </Text>
                  <Text className="text-[11px] text-white/80">
                    Expo Primary / Tint
                  </Text>
                </View>
              </View>
            </View>

            {/* Feature Highlights */}
            <View className="p-4 mt-2 rounded-2xl bg-background-element border border-border gap-3">
              <View className="flex-row items-center gap-2">
                <Sparkles size={18} color="#0a7ea4" />
                <Text className="text-base font-semibold text-text">
                  Build-Time Styling
                </Text>
              </View>
              <View className="gap-2">
                <View className="flex-row items-center gap-2">
                  <CheckCircle2 size={16} color="#0a7ea4" />
                  <Text className="text-sm text-text-secondary">
                    Tailwind CSS v4 CSS-first theming
                  </Text>
                </View>
                <View className="flex-row items-center gap-2">
                  <CheckCircle2 size={16} color="#0a7ea4" />
                  <Text className="text-sm text-text-secondary">
                    Zero runtime CSS parsing overhead
                  </Text>
                </View>
                <View className="flex-row items-center gap-2">
                  <CheckCircle2 size={16} color="#0a7ea4" />
                  <Text className="text-sm text-text-secondary">
                    Automatic Dark & Light mode adaptivity
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {activeTab === "components" && (
          /* Component Showcase Tab */
          <View className="gap-4">
            <Text className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
              Component & State Test
            </Text>

            {/* Interactive Counter Card */}
            <View className="p-5 rounded-2xl bg-background-element border border-border items-center gap-4">
              <View className="flex-row items-center gap-2">
                <Layers size={20} color="#0a7ea4" />
                <Text className="text-lg font-bold text-text">
                  Interactive Test
                </Text>
              </View>
              <View className="py-3 px-6 rounded-2xl bg-background border border-border">
                <Text className="text-3xl font-extrabold text-primary">
                  {count}
                </Text>
              </View>
              <View className="flex-row gap-3 w-full">
                <Pressable
                  onPress={() => setCount((c) => c + 1)}
                  className="flex-1 py-3 px-4 rounded-xl bg-primary items-center justify-center active:opacity-80">
                  <Text className="text-sm font-bold text-white">
                    Increment (+1)
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setCount(0)}
                  className="p-3 rounded-xl bg-background-selected border border-border items-center justify-center active:opacity-80">
                  <RefreshCw size={18} color="#60646C" />
                </Pressable>
              </View>
            </View>

            {/* Badges & Status Tags */}
            <View className="p-4 rounded-2xl bg-background-element border border-border gap-3">
              <Text className="text-sm font-semibold text-text">
                Badges & Utility Combinations
              </Text>
              <View className="flex-row flex-wrap gap-2">
                <View className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
                  <Text className="text-xs font-medium text-primary">
                    Uniwind v1.12
                  </Text>
                </View>
                <View className="px-3 py-1 rounded-full bg-background-selected border border-border">
                  <Text className="text-xs font-medium text-text">
                    Tailwind v4
                  </Text>
                </View>
                <View className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  <Text className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    Expo SDK 57
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

export const ThemeSwitcher = () => {
  const { theme, hasAdaptiveThemes } = useUniwind();

  const themes = [
    { name: "light", label: "Light", icon: "☀️" },
    { name: "dark", label: "Dark", icon: "🌙" },
    { name: "system", label: "System", icon: "⚙️" },
  ] as const;
  
  const activeTheme = hasAdaptiveThemes ? "system" : theme;

  return (
    <View className="p-4 gap-4">
      <Text className="text-sm text-gray-600 dark:text-gray-300">
        Current: {activeTheme}
      </Text>

      <View className="flex-row gap-2">
        {themes.map((t) => (
          <Pressable
            key={t.name}
            onPress={() => Uniwind.setTheme(t.name)}
            className={`
              px-4 py-3 rounded-lg items-center
              ${
                activeTheme === t.name
                  ? "bg-blue-500"
                  : "bg-gray-200 dark:bg-gray-700"
              }
            `}>
            <Text className="text-2xl mb-1">{t.icon}</Text>
            <Text
              className={`text-xs ${
                activeTheme === t.name
                  ? "text-white"
                  : "text-gray-900 dark:text-white"
              }`}>
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
};