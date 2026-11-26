import type { Metadata, Viewport } from "next";
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

const SITE_URL = xenv.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
const DEFAULT_TITLE = "iKeen — Personal Notes & Thinking Workspace";
const DEFAULT_DESCRIPTION =
  "Write everything. Keep it yours. Personal notes, structured blocks, folders, and a cross-device scratchpad synced across Web, Android, iOS, and Desktop.";

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
    { media: "(prefers-color-scheme: light)", color: "#f3f5ef" },
  ],
  colorScheme: "dark light",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: DEFAULT_TITLE,
    template: "%s · iKeen",
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: "iKeen",
  category: "productivity",
  manifest: "/site.webmanifest",
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  appleWebApp: {
    capable: true,
    title: "iKeen",
    statusBarStyle: "black-translucent",
  },
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
    "notes workspace",
    "block editor",
    "scratchpad",
    "markdown notes",
    "cross-platform notes",
    "MCP notes",
  ],
  authors: [{ name: "TechForge" }],
  creator: "Dev Lee",
  publisher: "TechForge",
  openGraph: {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    siteName: "iKeen",
    type: "website",
    locale: "en_US",
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
  },
};

const THEME_INIT_SCRIPT = `(function(){try{var raw=localStorage.getItem('ikeen_theme');var t='dark';if(raw){var p=JSON.parse(raw);if(p&&p.state&&(p.state.theme==='light'||p.state.theme==='dark')){t=p.state.theme;}}document.documentElement.classList.remove('dark','light');document.documentElement.classList.add(t);}catch(e){}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${spaceGrotesk.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Providers>
          {children}
          <AuthDialog />
        </Providers>
      </body>
    </html>
  );
}
