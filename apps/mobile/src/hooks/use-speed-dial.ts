import { useRouter } from "expo-router";
import { useSpeedDialStore } from "@/stores/speed-dial"; // Adjust path
import { Sparkles, FolderPlus, FileText } from "lucide-react-native"; // Or your icon pack

export interface SpeedDialFABOptionType {
  label: string;
  icon: any;
  onPress: () => void;
  route: string;
}

export const useSpeedDialFab = () => {
  const router = useRouter();

  // Connect cleanly to your decoupled Zustand store
  const isOpen = useSpeedDialStore((state) => state.isOpen);
  const toggleMenu = useSpeedDialStore((state) => state.toggleMenu);
  // const closeMenu = useSpeedDialStore((state) => state.closeMenu);

  const options: SpeedDialFABOptionType[] = [
    {
      label: "Chat",
      icon: Sparkles,
      onPress: () => {
        router.push("/agent");
      },
      route: "/agent",
    },
    {
      label: "New Folder",
      icon: FolderPlus,
      onPress: () => {
        router.push("/notes/create-folder");
      },
      route: "/notes/create-folder", // Corrected route string mismatch
    },
    {
      label: "New Note",
      icon: FileText,
      onPress: () => {
        router.push("/notes/create");
      },
      route: "/notes/create",
    },
  ];

  return {
    isMenuOpen: isOpen,
    toggleMenu,
    options,
  };
};
