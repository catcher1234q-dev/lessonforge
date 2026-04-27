import type { Metadata } from "next";
import Link from "next/link";

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
        <section className="px-5 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl rounded-[2rem] border border-brand/15 bg-brand-soft/30 px-6 py-8 shadow-soft-xl sm:px-8">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div className="max-w-2xl">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
                  For teachers who want to sell
                </p>
                <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl leading-tight tracking-[-0.03em] text-ink sm:text-4xl">
                  Sell your teaching resources
                </h2>
                <p className="mt-3 text-base leading-7 text-ink-soft">
                  Join early and be one of the first teachers on the platform.
                </p>
              </div>
              <div>
                <Link
                  className="inline-flex min-h-11 items-center justify-center rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
                  href="/sell/onboarding"
                >
                  Start selling
                </Link>
              </div>
            </div>
          </div>
        </section>
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
