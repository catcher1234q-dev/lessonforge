import type { Metadata } from "next";

import { FinalCTA } from "@/components/marketing/final-cta";
import { FAQPreview } from "@/components/marketing/faq-preview";
import { FirstTimeGuide } from "@/components/marketing/first-time-guide";
import { LandingHero } from "@/components/marketing/landing-hero";
import { PricingPreview } from "@/components/marketing/pricing-preview";
import { SubjectShowcase } from "@/components/marketing/subject-showcase";
import { TrustStrip } from "@/components/marketing/trust-strip";
import { WebsiteStatusBanner } from "@/components/marketing/website-status-banner";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { SignedInHeroCard } from "@/components/marketing/signed-in-hero-card";
import { siteConfig } from "@/lib/config/site";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: siteConfig.productName,
  description:
    "LessonForgeHub helps teachers find classroom-ready resources and sell original lessons they already use.",
  path: "/",
});

export default function HomePage() {
  return (
    <main className="page-shell min-h-screen">
      <SiteHeader />
      <WebsiteStatusBanner />
      <SignedInHeroCard />
      <LandingHero />
      <div className="space-y-4 pb-4 sm:space-y-6 sm:pb-6">
        <FirstTimeGuide />
        <TrustStrip />
      </div>
      <SubjectShowcase />
      <PricingPreview />
      <FAQPreview />
      <FinalCTA />
      <SiteFooter />
    </main>
  );
}
