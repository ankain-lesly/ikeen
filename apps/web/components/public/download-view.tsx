"use client";

import * as React from "react";
import Link from "next/link";
import {
  Download,
  Smartphone,
  Apple,
  Globe,
  ShieldCheck,
  FolderLock,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";

export function DownloadView() {
  return (
    <div className="mx-auto w-full max-w-[1120px] flex-1 px-6 sm:px-10 py-14 sm:py-20 space-y-16">
      {/* Hero */}
      <section className="text-center space-y-4 max-w-2xl mx-auto">
        <h1 className="font-heading text-4xl sm:text-6xl font-bold tracking-[-0.03em] text-foreground">
          <span>Get iKeen </span>
          <span className="text-muted-foreground">on your devices.</span>
        </h1>
        <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
          Write everything. Keep it yours. Fast, private notes with folders, scratchpad, and unified blocks across every screen.
        </p>
      </section>

      {/* Platform Download Cards - One Single Clean Link Each */}
      <section id="mobile" aria-labelledby="platforms-heading">
        <h2 id="platforms-heading" className="sr-only">Available Platforms</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Android */}
          <Card className="border-border bg-card/60 flex flex-col justify-between hover:border-primary/50 transition-all duration-200">
            <CardHeader className="space-y-3 pb-4">
              <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Smartphone className="size-6" />
              </div>
              <div className="space-y-1">
                <CardTitle className="text-xl font-heading">Android</CardTitle>
                <CardDescription className="text-xs leading-relaxed">
                  Fast, local-first notes with biometric locks and offline storage on your phone.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <a
                href="https://play.google.com/store/apps/details?id=com.techforgelee.ikeen"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs"
              >
                <Download className="size-4" />
                <span>Google Play store</span>
              </a>
            </CardContent>
          </Card>

          {/* iOS */}
          <Card className="border-border bg-card/60 flex flex-col justify-between hover:border-primary/50 transition-all duration-200">
            <CardHeader className="space-y-3 pb-4">
              <div className="size-12 rounded-xl bg-muted/40 flex items-center justify-center text-foreground">
                <Apple className="size-6" />
              </div>
              <div className="space-y-1">
                <CardTitle className="text-xl font-heading">iPhone & iPad</CardTitle>
                <CardDescription className="text-xs leading-relaxed">
                  Optimized for iOS with Face ID folder security and smooth haptic feedback.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <a
                href="#"
                // target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 text-xs font-medium text-foreground hover:bg-muted transition-colors"
              >
                <span>Apple App Store</span>
                <ArrowRight className="size-3.5" />
              </a>
            </CardContent>
          </Card>

          {/* Web & Desktop */}
          <Card id="desktop" className="border-border bg-card/60 flex flex-col justify-between hover:border-primary/50 transition-all duration-200">
            <CardHeader className="space-y-3 pb-4">
              <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Globe className="size-6" />
              </div>
              <div className="space-y-1">
                <CardTitle className="text-xl font-heading">Web Browser</CardTitle>
                <CardDescription className="text-xs leading-relaxed">
                  Access your notes immediately from any modern browser with zero installation.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <Link
                href="/app"
                className="w-full inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 text-xs font-medium text-foreground hover:bg-muted transition-colors"
              >
                <span>Open in Browser</span>
                <ArrowRight className="size-3.5" />
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Clean Feature Highlights */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-border/40">
        <div className="flex items-start gap-3">
          <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-0.5">
            <ShieldCheck className="size-4" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-foreground">Local-First Privacy</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Your notes are stored on your device first. No account required to start writing.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-0.5">
            <FolderLock className="size-4" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-foreground">Locked Secret Folders</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Protect your most sensitive ideas and journals behind biometric security and custom PINs.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-0.5">
            <Sparkles className="size-4" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-foreground">AI Thought Partner</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Brainstorm, organize thoughts, and connect concepts whenever you need inspiration.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
