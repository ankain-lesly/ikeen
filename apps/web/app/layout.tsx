import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "iKeen",
    template: "%s · iKeen",
  },
  description:
    "iKeen is a personal notes and thinking workspace — local-first notes, folders, and an optional AI agent.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <header className="border-b border-black/8 dark:border-white/12">
          <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-4">
            <Link href="/" className="text-sm font-semibold tracking-tight">
              iKeen
            </Link>
            <nav className="flex items-center gap-4 text-sm text-zinc-600 dark:text-zinc-400">
              <Link href="/privacy" className="hover:text-foreground">
                Privacy
              </Link>
            </nav>
          </div>
        </header>
        {children}
        <footer className="mt-auto border-t border-black/8 dark:border-white/12">
          <div className="mx-auto flex w-full max-w-3xl justify-between px-6 py-4 text-xs text-zinc-500">
            <span>© {new Date().getFullYear()} iKeen</span>
            <Link href="/privacy" className="hover:text-foreground">
              Privacy Policy
            </Link>
          </div>
        </footer>
      </body>
    </html>
  );
}
