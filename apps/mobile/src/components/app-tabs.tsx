import React, { useState } from "react";
import {
  View,
  TouchableOpacity,
  Platform,
  Pressable,
  Text,
} from "react-native";
import { Tabs, useRouter } from "expo-router";
import { SymbolView, SFSymbol, AndroidSymbol } from "expo-symbols";
import { useTheme } from "@/hooks/use-theme"; // Replace with your actual theme hook path
import { useSpeedDialFab } from "@/hooks/use-speed-dial";
import { BottomTabInset } from "@/constants/theme";
import { Plus, X } from "lucide-react-native";
import Animated, {
  FadeIn,
  FadeOut,
  // LinearTransition,
} from "react-native-reanimated";
import { Card } from "./ui/card";

// Explicitly type the icon manifest to lock down safety limits
interface SymbolConfiguration {
  iosIcon: SFSymbol;
  iosActiveIcon: SFSymbol;
  androidIcon: AndroidSymbol;
  androidActiveIcon: AndroidSymbol;
}

const ICON_MANIFEST: Record<string, SymbolConfiguration> = {
  home: {
    iosIcon: "house",
    iosActiveIcon: "house.fill",
    androidIcon: "home",
    androidActiveIcon: "home_filled",
  },
  notes: {
    iosIcon: "note.text",
    iosActiveIcon: "square.and.pencil",
    androidIcon: "edit_note",
    androidActiveIcon: "edit_note",
  },
  folders: {
    iosIcon: "folder",
    iosActiveIcon: "folder.circle",
    androidIcon: "folder",
    androidActiveIcon: "folder",
  },
  profile: {
    iosIcon: "person",
    iosActiveIcon: "person.fill",
    androidIcon: "person",
    androidActiveIcon: "account_circle",
  },
  default: {
    iosIcon: "person",
    iosActiveIcon: "person.fill",
    androidIcon: "person",
    androidActiveIcon: "account_circle",
  },
};

export default function AppTabs() {
  const colors = useTheme();

  return (
    <>
      <Tabs
        tabBar={({ state, descriptors, navigation }) => (
          <View className="absolute bottom-safe-offset-2 w-full flex items-center justify-center">
            <Card
              className="h-16_ h-14 px-4_ px-2 rounded-full flex-row items-center justify-between shadow-xl bg-background-element gap-2"
              style={{
                ...Platform.select({
                  ios: {
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 12 },
                    shadowOpacity: 0.12,
                    shadowRadius: 16,
                  },
                  android: {
                    elevation: 10,
                  },
                }),
              }}>
              {state.routes.map((route, index) => {
                const { options } = descriptors[route.key];
                const isFocused = state.index === index;

                // Resolve display strings following React Navigation overrides
                // const label =
                //   options.tabBarLabel !== undefined
                //     ? String(options.tabBarLabel)
                //     : options.title !== undefined
                //       ? options.title
                //       : route.name;

                // Gracefully resolve icons matching file filenames
                const symbolConfig =
                  ICON_MANIFEST[route.name] || ICON_MANIFEST["default"];

                const handlePress = () => {
                  const event = navigation.emit({
                    type: "tabPress",
                    target: route.key,
                    canPreventDefault: true,
                  });

                  if (!isFocused && !event.defaultPrevented) {
                    navigation.navigate(route.name, route.params);
                  }
                };

                return (
                  <React.Fragment key={index}>
                    <TouchableOpacity
                      key={route.key}
                      accessibilityState={isFocused ? { selected: true } : {}}
                      accessibilityLabel={options.tabBarAccessibilityLabel}
                      testID={options.tabBarButtonTestID}
                      onPress={handlePress}
                      activeOpacity={0.7}
                      className="size-10 items-center justify-center py-2 rounded-full bg-background-selected_">
                      {/* 
              Valid cross-platform typing shape matching the Expo SymbolView specifications.
              Web is intentionally omitted from the object structure.
            */}
                      <SymbolView
                        name={{
                          ios: isFocused
                            ? symbolConfig.iosActiveIcon
                            : symbolConfig.iosIcon,
                          android: isFocused
                            ? symbolConfig.androidActiveIcon
                            : symbolConfig.androidIcon,
                        }}
                        size={24}
                        tintColor={
                          isFocused ? colors.primary : colors.textSecondary
                        }
                        weight="medium"
                      />

                      {/* {tab.label ? (
                      <Text
                        className="text-[10px] font-medium mt-1 tracking-wide"
                        style={{
                          color: isActive ? colors.text : colors.textSecondary,
                        }}>
                        {tab.label}
                      </Text>
                    ) : null} */}
                    </TouchableOpacity>

                    {index === 1 && <SpeedDialPlusButton key="speed-dial" />}
                  </React.Fragment>
                );
              })}
            </Card>
          </View>
        )}
        screenOptions={{ headerShown: false }}
      />

      {/* Speed Dial Feed Menu */}
      <SpeedDialMenuToolbar />
    </>
  );
}

/* Main Floating Trigger Button */

const SpeedDialPlusButton = () => {
  const { isMenuOpen, toggleMenu } = useSpeedDialFab();
  // const colors = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={isMenuOpen ? "Close create actions" : "Create"}
      onPress={() => toggleMenu()}
      className="size-12 rounded-full bg-amber-900 items-center justify-center shadow-lg active:scale-95 z-20"
      style={{
        // shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
        elevation: 6,
      }}>
      {isMenuOpen ? (
        <X size={26} color="#ffffff" strokeWidth={2.4} />
      ) : (
        <Plus size={28} color="#ffffff" strokeWidth={2.4} />
      )}
    </Pressable>
  );
};

const SpeedDialMenuToolbar = () => {
  const colors = useTheme();
  const { isMenuOpen, toggleMenu, options } = useSpeedDialFab();

  const handleAction = (action: () => void) => {
    // Haptics.selectionAsync();
    toggleMenu();
    action();
  };

  return (
    <View className={`items-center `}>
      {/* Backdrop to dismiss when open */}
      {isMenuOpen && (
        <Pressable
          onPress={() => toggleMenu()}
          className="absolute -top-250 -left-250 -right-250 -bottom-250 z-10 bg-black/30"
        />
      )}

      {/* Speed Dial Menu Stack */}
      <View
        style={{
          bottom: BottomTabInset,
        }}
        className="absolute w-full items-center justify-center">
        {isMenuOpen && (
          <View className="w-full mb-3.5 z-20 items-center justify-center gap-2.5 rounded-3xl py-2 px-1.5">
            {options.map((o, i) => (
              <Animated.View
                key={i}
                entering={FadeIn.duration(200 * i)}
                exiting={FadeOut.duration(150)}>
                <Pressable
                  key={i}
                  accessibilityRole="button"
                  accessibilityLabel={o.label}
                  onPress={() => handleAction(o.onPress)}
                  hitSlop={6}>
                  <Card
                    className={`px-4 py-2 min-h-11 flex-row gap-2 rounded-full items-center justify-center active:scale-95`}>
                    <Text className="text-foreground font-semibold text-base">
                      {o.label}
                    </Text>
                    <o.icon
                      size={20}
                      color={colors.foreground}
                      strokeWidth={2.2}
                    />
                  </Card>
                </Pressable>
              </Animated.View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
};
