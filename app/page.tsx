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
import { ProductCard } from "@/components/marketplace/product-card";
import { SiteHeader } from "@/components/layout/site-header";
import { SignedInHeroCard } from "@/components/marketing/signed-in-hero-card";
import { filterMarketplaceListings } from "@/lib/lessonforge/server-catalog";
import { siteConfig } from "@/lib/config/site";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: siteConfig.productName,
  description:
    "LessonForgeHub helps teachers find classroom-ready resources and sell original lessons they already use.",
  path: "/",
});

const whyCards = [
  {
    title: "Clear previews",
    body: "Teachers can see real pages before they buy, which builds trust fast.",
  },
  {
    title: "Simple selling",
    body: "Start with one strong classroom file instead of a complicated storefront setup.",
  },
  {
    title: "Teacher-first marketplace",
    body: "The site is focused on classroom resources, clean details, and practical use.",
  },
] as const;

const howItWorks = [
  "Browse or upload",
  "Preview before buying",
  "Use or sell with confidence",
] as const;

function pickHomepagePreviewLabel(subject: string) {
  if (subject === "Math") return "Math";
  if (subject === "Reading" || subject === "Writing") return "Literacy";
  if (subject === "Classroom Management" || subject === "Morning Work" || subject === "Intervention") {
    return "Classroom systems";
  }
  if (subject === "Seasonal") return "Seasonal";
  return "Featured";
}

export default async function HomePage() {
  const featuredListings = (
    await filterMarketplaceListings("", "All", undefined, undefined, undefined, undefined, "best-match")
  ).slice(0, 4);

  return (
    <main className="page-shell min-h-screen">
      <SiteHeader />
      <WebsiteStatusBanner />
      <SignedInHeroCard />
      <LandingHero />
      <section className="px-5 pb-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl rounded-[2rem] border border-black/5 bg-white px-5 py-5 shadow-soft-xl sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
                Real preview strip
              </p>
              <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl text-ink sm:text-3xl">
                See what buyers actually preview.
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-ink-soft">
              These are real marketplace pages pulled from live listing previews, not mockups.
            </p>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {featuredListings.map((listing) => (
              <Link
                key={listing.id}
                className="group overflow-hidden rounded-[1.6rem] border border-slate-200 bg-slate-50 transition hover:-translate-y-0.5 hover:border-[#d4af37]/40 hover:bg-white hover:shadow-[0_22px_56px_rgba(15,23,42,0.10)]"
                href={`/marketplace/${listing.slug}`}
              >
                <div className="aspect-[4/5] overflow-hidden bg-white">
                  <img
                    alt={`${listing.title} preview`}
                    className="h-full w-full object-cover object-top transition duration-300 group-hover:scale-[1.02]"
                    loading="lazy"
                    src={listing.thumbnailUrl ?? listing.previewAssets[0]?.previewUrl ?? ""}
                  />
                </div>
                <div className="p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9b7a10]">
                    {pickHomepagePreviewLabel(listing.subject)}
                  </p>
                  <h3 className="mt-2 line-clamp-2 text-base font-semibold text-ink">
                    {listing.title}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <div className="space-y-4 pb-4 sm:space-y-6 sm:pb-6">
        <FirstTimeGuide />
        <section className="px-5 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl rounded-[2rem] border border-black/5 bg-white px-6 py-8 shadow-soft-xl sm:px-8">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
                Featured resources
              </p>
              <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl leading-tight tracking-[-0.03em] text-ink sm:text-4xl">
                Start with four listings that already show the right level of trust.
              </h2>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {featuredListings.map((listing, index) => (
                <ProductCard
                  featured={index === 0}
                  key={listing.id}
                  listing={listing}
                />
              ))}
            </div>
          </div>
        </section>
        <section className="px-5 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl rounded-[2rem] border border-black/5 bg-white px-6 py-8 shadow-soft-xl sm:px-8">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
                Why LessonForgeHub
              </p>
              <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl leading-tight tracking-[-0.03em] text-ink sm:text-4xl">
                Built to feel simpler, clearer, and more trustworthy.
              </h2>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {whyCards.map((card) => (
                <div key={card.title} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-5 py-5">
                  <h3 className="text-xl font-semibold text-ink">{card.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-ink-soft">{card.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="px-5 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl rounded-[2rem] border border-black/5 bg-white px-6 py-8 shadow-soft-xl sm:px-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
                  How it works
                </p>
                <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl leading-tight tracking-[-0.03em] text-ink sm:text-4xl">
                  Browse or sell without the clutter.
                </h2>
              </div>
              <div className="grid flex-1 gap-4 sm:grid-cols-3">
                {howItWorks.map((step, index) => (
                  <div key={step} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-5 py-5">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#9b7a10]">
                      Step {index + 1}
                    </p>
                    <p className="mt-3 text-lg font-semibold text-ink">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
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
