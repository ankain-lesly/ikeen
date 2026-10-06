import type { Metadata } from "next";
import { Inter, Space_Grotesk, Geist_Mono } from "next/font/google";
import Link from "next/link";

import { Providers } from "@/components/providers/query-provider";
import { UserMenu } from "@/components/auth/user-menu";
import { AuthDialog } from "@/components/auth/auth-dialog";
import {xenv} from "@/lib/env.client";

import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(xenv.NEXT_PUBLIC_SITE_URL),
  title: {
    default: "iKeen — Personal Notes & AI Workspace",
    template: "%s · iKeen",
  },
  description:
    "iKeen is a personal notes and thinking workspace — local-first notes, folders, and an autonomous AI agent with Model Context Protocol (MCP) server. Write everything. Keep it yours.",
  applicationName: "iKeen",
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/favicon/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  keywords: [
    "iKeen",
    "personal notes",
    "local-first notes",
    "Model Context Protocol",
    "MCP",
    "AI agent",
    "Claude Desktop",
    "Cursor AI",
    "knowledge management",
    "developer notes",
  ],
  authors: [{ name: "TechForge" }],
  creator: "Dev Lee",
  openGraph: {
    title: "iKeen — Personal Notes & AI Workspace",
    description:
      "Write everything. Keep it yours. Local-first notes with folders, autonomous AI agent, and Model Context Protocol (MCP) tools.",
    siteName: "iKeen",
    type: "website",
    locale: "en_US",
    url: xenv.NEXT_PUBLIC_SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "iKeen — Personal Notes & AI Workspace",
    description:
      "Write everything. Keep it yours. Local-first notes with MCP tools and autonomous AI agent capabilities.",
  },
};


export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${spaceGrotesk.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Providers>
          <header className="border-b border-border bg-card/60 backdrop-blur-md sticky top-0 z-40">
            <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 sm:px-6 py-3.5">
              <Link
                href="/"
                className="text-base font-heading font-medium tracking-tight flex items-center gap-2">
                <span className="size-2 rounded-full bg-primary animate-pulse" />
                <span>iKeen</span>
              </Link>
              <nav className="flex items-center gap-4 text-sm">
                <Link
                  href="/mcp"
                  className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                  MCP Showcase
                </Link>
                <Link
                  href="/dashboard"
                  className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                  Dashboard
                </Link>
                <Link
                  href="/privacy"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors hidden sm:inline">
                  Privacy
                </Link>
                <div className="h-4 w-px bg-border/60" />
                <UserMenu />
              </nav>
            </div>
          </header>
          {children}
          <footer className="mt-auto border-t border-border bg-card/40">
            <div className="mx-auto flex w-full max-w-6xl justify-between items-center px-4 sm:px-6 py-4 text-xs text-muted-foreground">
              <span>© {new Date().getFullYear()} iKeen Research MCP</span>
              <div className="flex items-center gap-4">
                <Link href="/mcp" className="hover:text-foreground">
                  MCP Showcase
                </Link>
                <Link href="/dashboard" className="hover:text-foreground">
                  Dashboard
                </Link>
                <Link href="/privacy" className="hover:text-foreground">
                  Privacy Policy
                </Link>
              </div>
            </div>
          </footer>
          <AuthDialog />
        </Providers>
      </body>
    </html>
  );
}
