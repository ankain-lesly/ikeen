"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  LayoutDashboard,
  KeyRound,
  Cpu,
  Radio,
  Plus,
  LogOut,
  Copy,
  Check,
  Terminal,
  Menu,
  Shield,
  Layers,
} from "lucide-react";

import { useAuthStore, useAuthHydration } from "@/lib/stores/auth-store";
import { useKeysStore } from "@/lib/stores/keys-store";
import { fetchKeysApi } from "@/lib/api/keys-api";
import { fetchMcpToolsApi } from "@/lib/api/mcp-api";
import { xenv } from "@/lib/env.client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number | null;
  match: (pathname: string) => boolean;
}

export function useDashboardNavItems(): NavItem[] {
  const isHydrated = useAuthHydration();
  const { isAuthenticated } = useAuthStore();

  const { data: keys = [] } = useQuery({
    queryKey: ["api-keys"],
    queryFn: fetchKeysApi,
    enabled: isHydrated && isAuthenticated,
  });

  const { data: tools = [] } = useQuery({
    queryKey: ["mcp-tools"],
    queryFn: fetchMcpToolsApi,
  });

  const toolsBadge = tools.length > 0 ? `${tools.length} Tools` : "11 Tools";

  return [
    {
      label: "Overview",
      href: "/dashboard",
      icon: LayoutDashboard,
      match: (p) => p === "/dashboard" || p === "/dashboard/",
    },
    {
      label: "API Keys",
      href: "/dashboard/keys",
      icon: KeyRound,
      badge: keys.length > 0 ? keys.length : null,
      match: (p) => p.startsWith("/dashboard/keys") || p.startsWith("/dashboard/api-keys"),
    },
    {
      label: "MCP Tools & Config",
      href: "/dashboard/mcps",
      icon: Cpu,
      badge: toolsBadge,
      match: (p) => p.startsWith("/dashboard/mcps"),
    },
  ];
}

interface SidebarContentProps {
  onNavClick?: () => void;
}

export function DashboardSidebarContent({ onNavClick }: SidebarContentProps) {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const { openCreate } = useKeysStore();
  const [copied, setCopied] = React.useState(false);
  const navItems = useDashboardNavItems();

  const endpointUrl = `${xenv.NEXT_PUBLIC_API_URL}/mcp`;

  function copyEndpoint() {
    navigator.clipboard.writeText(endpointUrl);
    setCopied(true);
    toast.success("MCP endpoint copied!");
    setTimeout(() => setCopied(false), 2000);
  }

  const initials = (user?.firstName?.[0] || user?.email?.[0] || "U").toUpperCase();

  return (
    <div className="flex h-full flex-col justify-between p-4 sm:p-5">
      {/* Top Brand & Navigation */}
      <div className="space-y-6">
        {/* Brand / Context */}
        <div className="flex items-center justify-between pb-3 border-b border-border/50">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Layers className="size-4" />
            </div>
            <div>
              <span className="font-heading font-semibold text-sm tracking-tight text-foreground block">
                Developer Console
              </span>
              <span className="text-[10px] font-mono text-muted-foreground block">
                MCP Protocol v2026-07-28
              </span>
            </div>
          </div>
          <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-primary/30 text-primary bg-primary/5">
            Live
          </Badge>
        </div>

        {/* Primary Action Button */}
        <Button
          onClick={() => {
            openCreate();
            onNavClick?.();
          }}
          size="sm"
          className="w-full gap-2 font-medium shadow-xs"
        >
          <Plus className="size-4" />
          <span>Create New Key</span>
        </Button>

        {/* Nav Links */}
        <div className="space-y-1">
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider px-2 pb-1">
            Workspace
          </p>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = item.match(pathname);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavClick}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-primary/15 text-primary font-semibold"
                      : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`size-4 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge != null && (
                    <Badge
                      variant={isActive ? "default" : "secondary"}
                      className={`text-[10px] px-1.5 py-0 font-mono ${
                        isActive ? "bg-primary text-primary-foreground" : ""
                      }`}
                    >
                      {item.badge}
                    </Badge>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Server Endpoint Widget */}
        <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="flex items-center gap-1.5 text-muted-foreground font-mono">
              <Radio className="size-2.5 animate-pulse text-primary" />
              Streamable HTTP
            </span>
            <span className="text-[10px] text-primary font-medium">Ready</span>
          </div>

          <div className="flex items-center gap-1.5 rounded-md border border-border/40 bg-card px-2 py-1 text-[11px] font-mono">
            <Terminal className="size-3 text-muted-foreground shrink-0" />
            <span className="truncate flex-1 text-foreground/80">{endpointUrl}</span>
            <button
              type="button"
              onClick={copyEndpoint}
              className="text-muted-foreground hover:text-primary transition-colors shrink-0 cursor-pointer p-0.5"
              title="Copy endpoint"
            >
              {copied ? <Check className="size-3 text-primary" /> : <Copy className="size-3" />}
            </button>
          </div>
        </div>
      </div>

      {/* Bottom User Session & Sign Out */}
      <div className="pt-4 border-t border-border/50 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="size-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-mono text-xs font-bold shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-foreground truncate">
                {user?.firstName ? `${user.firstName} ${user.lastName || ""}` : user?.email}
              </p>
              <div className="flex items-center gap-1.5">
                <Shield className="size-2.5 text-primary shrink-0" />
                <p className="text-[10px] text-muted-foreground capitalize truncate">
                  {user?.type || "Developer"}
                </p>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => {
              logout();
              onNavClick?.();
            }}
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            title="Sign Out"
          >
            <LogOut className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Desktop Left Sidebar (Fixed / Sticky)
 */
export function DashboardSidebar() {
  return (
    <aside className="w-64 border-r border-border bg-card/40 flex flex-col shrink-0 hidden md:flex sticky top-[53px] h-[calc(100vh-53px)]">
      <DashboardSidebarContent />
    </aside>
  );
}

/**
 * Mobile Navigation Bar (Sticky top on mobile with Sheet drawer)
 */
export function DashboardMobileNav() {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();
  const navItems = useDashboardNavItems();

  const currentItem = navItems.find((i) => i.match(pathname)) || navItems[0];
  const CurrentIcon = currentItem?.icon || LayoutDashboard;

  return (
    <div className="md:hidden sticky top-[53px] z-30 border-b border-border bg-card/90 backdrop-blur-md px-4 py-2.5 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            render={
              <Button variant="outline" size="icon-sm" className="size-8">
                <Menu className="size-4" />
                <span className="sr-only">Toggle Dashboard Menu</span>
              </Button>
            }
          />
          <SheetContent side="left" className="w-72 p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Dashboard Navigation</SheetTitle>
            </SheetHeader>
            <DashboardSidebarContent onNavClick={() => setOpen(false)} />
          </SheetContent>
        </Sheet>

        <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
          <CurrentIcon className="size-3.5 text-primary" />
          <span>{currentItem?.label}</span>
        </div>
      </div>

      <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary">
        MCP 2026-07-28
      </Badge>
    </div>
  );
}
