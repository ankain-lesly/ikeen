"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu } from "lucide-react";
import { UserMenu } from "@/components/auth/user-menu";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const NAV_LINKS = [
  { label: "Why iKeen", href: "/#why" },
  { label: "Platforms", href: "/#platforms" },
  { label: "How it works", href: "/#how-it-works" },
  { label: "FAQ", href: "/#faq" },
  { label: "Download", href: "/download" },
] as const;

export function PublicHeader() {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <header className="w-full">
      <div className="mx-auto flex w-full max-w-[1120px] items-center justify-between gap-4 px-6 py-6 sm:px-10">
        <Link
          href="/"
          className="flex items-center gap-2.5 font-heading text-lg font-bold tracking-tight text-foreground"
        >
          <Image
            src="/icon.png"
            alt="iKeen"
            width={32}
            height={32}
            className="size-8 rounded-[9px]"
          />
          <span>iKeen</span>
        </Link>

        <nav
          aria-label="Primary"
          className="hidden items-center gap-7 md:flex"
        >
          {NAV_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2.5">
          <ThemeToggle />
          <div className="hidden sm:block">
            <UserMenu />
          </div>
          <Link
            href="/app"
            className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-xs sm:px-5 sm:py-2.5 sm:text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Open Workspace
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            className="size-8 md:hidden"
          >
            <Menu className="size-4" />
          </Button>
        </div>
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="right" className="w-72">
          <SheetHeader>
            <SheetTitle className="font-heading">Navigation</SheetTitle>
          </SheetHeader>
          <nav className="mt-4 flex flex-col gap-1 px-4">
            {NAV_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-secondary transition-colors"
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-4 border-t border-border pt-4">
              <UserMenu />
            </div>
          </nav>
        </SheetContent>
      </Sheet>
    </header>
  );
}
