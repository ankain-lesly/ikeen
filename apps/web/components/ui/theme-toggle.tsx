"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useThemeStore } from "@/lib/stores/theme-store";
import { Button } from "@/components/ui/button";

const emptySubscribe = () => () => {};

export function ThemeToggle({ className }: { className?: string }) {
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const isClient = React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label={
        isClient && theme === "light"
          ? "Switch to dark theme"
          : "Switch to light theme"
      }
      title={
        isClient && theme === "light"
          ? "Switch to dark theme"
          : "Switch to light theme"
      }
      className={className ?? "size-8 text-muted-foreground hover:text-foreground"}
    >
      {isClient && theme === "light" ? (
        <Moon className="size-4" />
      ) : (
        <Sun className="size-4" />
      )}
    </Button>
  );
}
