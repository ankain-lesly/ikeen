import AppTabs from "@/components/app-tabs";
import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <>
      <Tabs screenOptions={{ headerShown: false }} />
      {/* <AppTabs /> */}
    </>
  );
}