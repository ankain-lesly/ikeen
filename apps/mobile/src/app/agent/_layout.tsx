import { Drawer } from "expo-router/drawer";
import { AgentDrawerContent } from "@/components/agent-drawer-content";
import { useTheme } from "@/hooks/use-theme";

export default function AgentLayout() {
  const colors = useTheme();

  return (
    <Drawer
      drawerContent={(props) => <AgentDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerStyle: {
          backgroundColor: colors.background,
          width: 300,
        },
        drawerActiveTintColor: colors.primary,
        drawerInactiveTintColor: colors.textSecondary,
        drawerType: "slide",
      }}>
      <Drawer.Screen name="index" />
    </Drawer>
  );
}
