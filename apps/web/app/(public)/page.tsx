import type { Metadata } from "next";
import { xenv } from "@/lib/env.client";
import { HeroSection } from "@/components/public/landing/hero-section";
import { FrictionSection } from "@/components/public/landing/friction-section";
import { PlatformsBento } from "@/components/public/landing/platforms-bento";
import { WaysInGrid } from "@/components/public/landing/ways-in-grid";
import { EcosystemPanel } from "@/components/public/landing/ecosystem-panel";
import { TrustPillars } from "@/components/public/landing/trust-pillars";
import { FaqSection } from "@/components/public/landing/faq-section";
import { AgentsCallout } from "@/components/public/landing/agents-callout";
import { ClosingCta } from "@/components/public/landing/closing-cta";

const SITE_URL = xenv.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");

export const metadata: Metadata = {
  alternates: {
    canonical: "/",
  },
  openGraph: {
    url: SITE_URL,
  },
};

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "iKeen",
  applicationCategory: "ProductivityApplication",
  operatingSystem: "Web, Android, iOS, Windows",
  url: SITE_URL,
  description:
    "Write everything. Keep it yours. Personal notes, structured blocks, folders, and Scratchpad synced across Web, Mobile, and Desktop.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
};

export default function LandingPage() {
  return (
    <main className="flex-1">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <HeroSection />
      <FrictionSection />
      <PlatformsBento />
      <WaysInGrid />
      <EcosystemPanel />
      <TrustPillars />
      <FaqSection />
      <AgentsCallout />
      <ClosingCta />
    </main>
  );
}
