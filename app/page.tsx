import type { Metadata } from "next";
import Link from "next/link";

import { FinalCTA } from "@/components/marketing/final-cta";
import { FAQPreview } from "@/components/marketing/faq-preview";
import { LandingHero } from "@/components/marketing/landing-hero";
import { PricingPreview } from "@/components/marketing/pricing-preview";
import { SubjectShowcase } from "@/components/marketing/subject-showcase";
import { TrustStrip } from "@/components/marketing/trust-strip";
import { WebsiteStatusBanner } from "@/components/marketing/website-status-banner";
import { SiteFooter } from "@/components/layout/site-footer";
import { ProductCard } from "@/components/marketplace/product-card";
import { SiteHeader } from "@/components/layout/site-header";
import { SignedInHeroCard } from "@/components/marketing/signed-in-hero-card";
import { PremiumSurface } from "@/components/shared/premium-surface";
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
  },
  {
    title: "Simple selling",
  },
  {
    title: "Teacher-first marketplace",
  },
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
      <LandingHero previewListings={featuredListings} />
      <section className="px-5 pb-4 sm:px-6 lg:px-8">
        <PremiumSurface className="mx-auto max-w-6xl px-5 py-5 sm:px-6" variant="glass">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#9b7a10]">
                Real resource previews
              </p>
              <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl tracking-[-0.03em] text-ink sm:text-3xl">
                See the resource clearly before you open the listing.
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-ink-soft">
              These cards use real listing previews already in the catalog, so the first scroll shows classroom materials instead of generic sales copy.
            </p>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {featuredListings.map((listing) => {
              const previewImageUrl = listing.thumbnailUrl ?? listing.previewAssets[0]?.previewUrl;

              return (
                <Link
                  key={listing.id}
                  className="group overflow-hidden rounded-[1.6rem] border border-slate-200 bg-slate-50 transition hover:-translate-y-0.5 hover:border-[#d4af37]/40 hover:bg-white hover:shadow-[0_22px_56px_rgba(15,23,42,0.10)]"
                  href={`/marketplace/${listing.slug}`}
                >
                  <div className="aspect-[4/3] overflow-hidden bg-white">
                    {previewImageUrl ? (
                      <img
                        alt={`${listing.title} preview`}
                        className="h-full w-full object-cover object-top transition duration-300 group-hover:scale-[1.02]"
                        loading="lazy"
                        src={previewImageUrl}
                      />
                    ) : (
                      <div className="flex h-full flex-col justify-end bg-[linear-gradient(180deg,#eff6ff_0%,#ffffff_100%)] p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9b7a10]">
                          {listing.subject}
                        </p>
                        <p className="mt-2 line-clamp-3 text-lg font-semibold leading-tight text-ink">
                          {listing.title}
                        </p>
                      </div>
                    )}
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
              );
            })}
          </div>
        </PremiumSurface>
      </section>
      <div className="space-y-4 pb-4 sm:space-y-6 sm:pb-6">
        <section className="px-5 sm:px-6 lg:px-8">
          <PremiumSurface className="mx-auto max-w-6xl px-6 py-8 sm:px-8" variant="soft">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#9b7a10]">
                Featured resources
              </p>
              <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl leading-tight tracking-[-0.03em] text-ink sm:text-4xl">
                Featured listings that show the preview quality this marketplace is aiming for.
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
          </PremiumSurface>
        </section>
        <div className="px-5 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <p className="rounded-full border border-white/55 bg-white/55 px-4 py-3 text-sm font-medium leading-6 text-ink-soft backdrop-blur-xl">
              Early marketplace. Real previews, digital delivery after purchase, and clear support paths stay visible all the way through checkout.
            </p>
          </div>
        </div>
        <TrustStrip />
        <section className="px-5 sm:px-6 lg:px-8">
          <PremiumSurface className="mx-auto max-w-6xl px-6 py-8 sm:px-8" variant="glass">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#9b7a10]">
                Why LessonForgeHub
              </p>
              <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl leading-tight tracking-[-0.03em] text-ink sm:text-4xl">
                Built to feel simpler, clearer, and more trustworthy.
              </h2>
            </div>
            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {whyCards.map((card) => (
                <div
                  key={card.title}
                  className="rounded-[1.5rem] border border-slate-200/80 bg-white/88 px-5 py-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)]"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9b7a10]">
                    Why it matters
                  </p>
                  <h3 className="text-xl font-semibold text-ink">{card.title}</h3>
                </div>
              ))}
            </div>
          </PremiumSurface>
        </section>
        <section className="px-5 sm:px-6 lg:px-8">
          <PremiumSurface
            className="mx-auto max-w-6xl bg-[linear-gradient(135deg,rgba(255,255,255,0.90),rgba(233,241,255,0.78),rgba(250,247,236,0.88))] px-6 py-7 sm:px-8"
            variant="light"
          >
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div className="max-w-2xl">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#9b7a10]">
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
                  className="premium-button-shadow inline-flex min-h-11 items-center justify-center rounded-full bg-[#0f172a] px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-900"
                  href="/sell/onboarding"
                >
                  Start selling
                </Link>
              </div>
            </div>
          </PremiumSurface>
        </section>
      </div>
      <SubjectShowcase />
      <PricingPreview />
      <FAQPreview />
      <FinalCTA />
      <SiteFooter />
    </main>
  );
}
