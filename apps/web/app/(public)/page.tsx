import { HeroSection } from "@/components/public/landing/hero-section";
import { FrictionSection } from "@/components/public/landing/friction-section";
import { PlatformsBento } from "@/components/public/landing/platforms-bento";
import { WaysInGrid } from "@/components/public/landing/ways-in-grid";
import { EcosystemPanel } from "@/components/public/landing/ecosystem-panel";
import { TrustPillars } from "@/components/public/landing/trust-pillars";
import { FaqSection } from "@/components/public/landing/faq-section";
import { AgentsCallout } from "@/components/public/landing/agents-callout";
import { ClosingCta } from "@/components/public/landing/closing-cta";

export default function LandingPage() {
  return (
    <main className="flex-1">
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
