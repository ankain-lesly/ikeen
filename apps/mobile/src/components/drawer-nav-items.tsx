import React, { ReactNode } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Href, router, useNavigation, usePathname } from "expo-router";
import { DrawerActions } from "expo-router/build/react-navigation";
import { LucideIcon } from "lucide-react-native";

import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";

export interface DrawerNavItemProps {
  name: string;
  icon: LucideIcon;
  path?: Href;
  badge?: ReactNode;
  visible?: boolean;
  onPress?: () => void;
}

export interface DrawerNavSectionProps {
  title?: string;
  isLast?: boolean;
  items: DrawerNavItemProps[];
  icon?: LucideIcon;
}

export function useDrawerActions() {
  const navigation = useNavigation();

  const openDrawer = () => {
    navigation.dispatch(DrawerActions.openDrawer());
  };

  // const closeDrawer = () => {
  //   navigation.dispatch(DrawerActions.closeDrawer());
  // };

  // const toggleDrawer = () => {
  //   navigation.dispatch(DrawerActions.toggleDrawer());
  // };

  return { openDrawer,  };
}

export const DrawerNavSection = ({
  title,
  items: initialItems,
  isLast,
}: DrawerNavSectionProps) => {
  const colors = useTheme();
  const pathname = usePathname();

  const items = initialItems.filter((e) => e.visible !== false);

  const handleItemPress = (item: DrawerNavItemProps) => {
    if (item.path) {
      router.push(item.path);
    } else {
      item.onPress?.();
    }
  };

  return (
    <View className={`mb-3 ${!isLast ? "pb-3" : ""}`}>
      {/* Section Header */}
      {/* {title && (
        <View className="mb-2 px-3">
          <Text className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">
            {title}
          </Text>
        </View>
      )} */}

      {/* Nav Items */}
      <View className="gap-0.5">
        {items.map((item, index) => {
          const isActive =
            !!item.path && (pathname === item.path)

          return (
            <TouchableOpacity
              key={`${item.name}-${index}`}
              activeOpacity={0.7}
              onPress={() => handleItemPress(item)}
              className={cn(
                "flex-row items-center py-1 px-2 rounded-xl transition-colors",
                isActive ? "bg-primary/10" : "active:bg-background-element",
              )}>
              <View className="w-7 h-7 items-center justify-center mr-2.5">
                <item.icon
                  size={20}
                  color={isActive ? colors.primary : colors.textSecondary}
                  strokeWidth={isActive ? 2.2 : 1.8}
                />
              </View>

              <View className="flex-1">
                <Text
                  numberOfLines={1}
                  className={cn(
                    "text-base",
                    isActive
                      ? "text-primary"
                      : "text-text",
                  )}>
                  {item.name}
                </Text>
              </View>

              {/* Badges */}
              {typeof item.badge === "number" ? (
                item.badge > 0 ? (
                  <View className="px-2 py-0.5 rounded-full bg-background-element border border-border min-w-[20px] items-center justify-center">
                    <Text className="text-[10px] font-mono font-medium text-text-secondary">
                      {item.badge > 999 ? "999+" : item.badge}
                    </Text>
                  </View>
                ) : null
              ) : typeof item.badge === "string" ? (
                <View className="px-1.5 py-0.5 rounded-md bg-primary/15 border border-primary/20 items-center justify-center">
                  <Text className="text-[9px] font-bold text-primary tracking-wide">
                    {item.badge}
                  </Text>
                </View>
              ) : (
                item.badge
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};
