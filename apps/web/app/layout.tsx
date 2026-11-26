import type { Metadata } from "next";
import { Inter, Space_Grotesk, Geist_Mono } from "next/font/google";

import { Providers } from "@/components/providers/query-provider";
import { AuthDialog } from "@/components/auth/auth-dialog";
import { xenv } from "@/lib/env.client";

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
    default: "iKeen — Personal Notes & Thinking Workspace",
    template: "%s · iKeen",
  },
  description:
    "iKeen is a personal notes and thinking workspace across mobile, desktop, and web. Write everything. Keep it yours.",
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
      {
        url: "/favicon/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
  keywords: [
    "iKeen",
    "personal notes",
    "workspace notes",
    "knowledge management",
    "scratchpad",
    "cross-platform notes",
  ],
  authors: [{ name: "TechForge" }],
  creator: "Dev Lee",
  openGraph: {
    title: "iKeen — Personal Notes & Thinking Workspace",
    description:
      "Write everything. Keep it yours. Notes, blocks, folders, and scratchpad synced across mobile, desktop, and web.",
    siteName: "iKeen",
    type: "website",
    locale: "en_US",
    url: xenv.NEXT_PUBLIC_SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "iKeen — Personal Notes & Thinking Workspace",
    description:
      "Write everything. Keep it yours. Personal notes and thinking workspace across mobile, desktop, and web.",
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
      className={`${inter.variable} ${spaceGrotesk.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Providers>
          {children}
          <AuthDialog />
        </Providers>
      </body>
    </html>
  );
}
