"use client";

import * as React from "react";
import { User, LogOut, Shield, ChevronDown } from "lucide-react";
import { useAuthStore, useAuthHydration } from "@/lib/stores/auth-store";
import { useKeysStore } from "@/lib/stores/keys-store";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export function UserMenu() {
  const isHydrated = useAuthHydration();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { openAuth } = useKeysStore();

  if (!isHydrated) {
    return <div className="h-7 w-18 rounded-lg bg-muted/30 animate-pulse" />;
  }

  if (!isAuthenticated || !user) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => openAuth("login")}
        className="font-medium text-xs"
      >
        <User className="size-3.5 mr-1 text-primary" />
        <span>Sign In</span>
      </Button>
    );
  }

  const initials = (user.firstName?.[0] || user.email[0] || "U").toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="sm" className="gap-2 pr-2.5">
            <span className="size-5 rounded-full bg-primary/20 text-primary flex items-center justify-center font-mono text-[10px] font-bold">
              {initials}
            </span>
            <span className="text-xs max-w-28 truncate font-medium text-foreground">
              {user.firstName || user.email.split("@")[0]}
            </span>
            <ChevronDown className="size-3 text-muted-foreground" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-56 p-1.5">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="px-2 py-1.5">
            <div className="flex flex-col space-y-0.5">
              <p className="text-xs font-medium text-foreground truncate">
                {user.firstName ? `${user.firstName} ${user.lastName || ""}` : user.email}
              </p>
              <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem disabled className="text-xs text-muted-foreground gap-2">
            <Shield className="size-3.5 text-primary" />
            <span>Role: {user.type || "developer"}</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            variant="destructive"
            onClick={() => logout()}
            className="text-xs gap-2 cursor-pointer"
          >
            <LogOut className="size-3.5" />
            <span>Sign Out</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
