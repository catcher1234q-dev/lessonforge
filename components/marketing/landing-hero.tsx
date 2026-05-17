import { ArrowRight, ShieldCheck, Sparkles, Wallet } from "lucide-react";
import Link from "next/link";

import { PremiumSurface } from "@/components/shared/premium-surface";
import type { MarketplaceListing } from "@/lib/demo/catalog";
import { formatCurrency } from "@/lib/marketplace/config";

function getSubjectLabel(subject: string) {
  if (subject === "Reading" || subject === "Writing") {
    return "Literacy";
  }

  if (subject === "Classroom Management" || subject === "Morning Work" || subject === "Intervention") {
    return "Classroom systems";
  }

  return subject;
}

export function LandingHero({
  previewListings,
}: {
  previewListings: MarketplaceListing[];
}) {
  const floatingCards = previewListings.slice(0, 3);

  return (
    <section className="premium-mesh relative overflow-hidden px-5 pb-8 pt-6 sm:px-6 lg:px-8 lg:pb-12 lg:pt-8">
      <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-stretch">
        <PremiumSurface
          className="animate-fade-up overflow-hidden px-6 py-7 sm:px-8 sm:py-9"
          variant="dark"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/6 px-4 py-2 text-sm font-medium text-[#f2d77a]">
            <Sparkles className="h-4 w-4" />
            Teacher marketplace, styled for trust
          </div>

          <h1 className="mt-6 max-w-4xl font-[family-name:var(--font-display)] text-4xl leading-[0.98] tracking-[-0.04em] text-white sm:text-6xl lg:text-[4.5rem]">
            Great teaching starts with the right resources.
          </h1>

          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl">
            Browse real classroom-ready previews, or sell the materials you already use with a cleaner, simpler seller flow.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              className="premium-button-shadow inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#d4af37] px-6 py-3.5 text-base font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-[#e2c35e]"
              href="/marketplace"
            >
              Browse resources
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/12 bg-white/6 px-6 py-3.5 text-base font-semibold text-white transition hover:border-white/20 hover:bg-white/10"
              href="/sell/onboarding"
            >
              Start selling
            </Link>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <div className="glass-outline rounded-[1.4rem] px-4 py-4">
              <ShieldCheck className="h-5 w-5 text-[#f2d77a]" />
              <p className="mt-3 text-sm font-semibold text-white">Real previews first</p>
              <p className="mt-1 text-sm leading-6 text-slate-300">Buyers can judge the actual resource before they commit.</p>
            </div>
            <div className="glass-outline rounded-[1.4rem] px-4 py-4">
              <Wallet className="h-5 w-5 text-[#f2d77a]" />
              <p className="mt-3 text-sm font-semibold text-white">Cleaner seller economics</p>
              <p className="mt-1 text-sm leading-6 text-slate-300">Teacher-friendly plans and digital delivery handled in-platform.</p>
            </div>
            <div className="glass-outline rounded-[1.4rem] px-4 py-4">
              <ArrowRight className="h-5 w-5 text-[#f2d77a]" />
              <p className="mt-3 text-sm font-semibold text-white">Faster first click</p>
              <p className="mt-1 text-sm leading-6 text-slate-300">The site shows product value before asking users to read a lot.</p>
            </div>
          </div>
        </PremiumSurface>

        <PremiumSurface
          className="animate-fade-up-delay relative overflow-hidden px-5 py-5 sm:px-6 sm:py-6"
          variant="glass"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#9b7a10]">
                Live product previews
              </p>
              <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl tracking-[-0.03em] text-ink sm:text-3xl">
                Real resources, not fake covers
              </h2>
            </div>
            <span className="rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-ink-soft">
              Early catalog
            </span>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-[0.92fr_1.08fr]">
            <div className="animate-float-slow relative flex min-h-[19rem] flex-col gap-4">
              {floatingCards.slice(0, 2).map((listing, index) => (
                <div
                  className={`glass-outline relative overflow-hidden rounded-[1.7rem] p-3 shadow-[0_18px_44px_rgba(15,23,42,0.10)] ${
                    index === 1 ? "ml-8 sm:ml-14" : ""
                  }`}
                  key={listing.id}
                >
                  <div className="overflow-hidden rounded-[1.2rem] bg-white">
                    <img
                      alt={`${listing.title} preview card`}
                      className="aspect-[4/3] w-full object-cover object-top"
                      loading="lazy"
                      src={listing.thumbnailUrl ?? listing.previewAssets[0]?.previewUrl ?? ""}
                    />
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9b7a10]">
                        {getSubjectLabel(listing.subject)}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-ink">
                        {formatCurrency(listing.priceCents / 100)}
                      </p>
                    </div>
                    <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-ink-soft">
                      {listing.gradeBand}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-4">
              {floatingCards.map((listing, index) => (
                <Link
                  className="group rounded-[1.6rem] border border-slate-200/80 bg-white/82 p-4 transition hover:-translate-y-0.5 hover:border-[#d4af37]/45 hover:shadow-[0_20px_50px_rgba(15,23,42,0.10)]"
                  href={`/marketplace/${listing.slug}`}
                  key={`${listing.id}-summary`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9b7a10]">
                        {index === 0 ? "Featured resource" : "Preview ready"}
                      </p>
                      <h3 className="mt-2 line-clamp-2 text-lg font-semibold text-ink">
                        {listing.title}
                      </h3>
                    </div>
                    <div className="rounded-full bg-[#0f172a] px-3 py-1 text-sm font-semibold text-white">
                      {formatCurrency(listing.priceCents / 100)}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium text-ink-soft">
                    <span className="rounded-full bg-slate-100 px-3 py-1">{getSubjectLabel(listing.subject)}</span>
                    <span className="rounded-full bg-slate-100 px-3 py-1">{listing.gradeBand}</span>
                    <span className="rounded-full bg-slate-100 px-3 py-1">{listing.pageCount} pages</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </PremiumSurface>
      </div>
    </section>
  );
}
