import type { Metadata } from "next";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { FAQPreview } from "@/components/marketing/faq-preview";
import { PricingPreview } from "@/components/marketing/pricing-preview";
import { PremiumSurface } from "@/components/shared/premium-surface";
import { SectionIntro } from "@/components/shared/section-intro";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Pricing",
  description:
    "Review LessonForgeHub seller plans, revenue splits, and digital marketplace pricing in one place.",
  path: "/pricing",
});

export default function PricingPage() {
  return (
    <main className="page-shell min-h-screen">
      <SiteHeader />

      <section className="px-5 pb-20 pt-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-8">
          <PremiumSurface className="overflow-hidden p-6 sm:p-8" variant="glass">
            <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[#d4af37]/70 to-transparent" />
            <SectionIntro
              eyebrow="Pricing"
              level="h1"
              title="Simple seller plans with clearer payouts and clean monthly support."
              titleClassName="text-4xl leading-tight sm:text-5xl"
              body="LessonForgeHub sells digital educational resources. Sellers choose a monthly plan, upload original materials they own or have rights to sell, and receive buyer payments through the platform after a confirmed purchase."
            />
            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              <div className="rounded-[1.5rem] border border-white/80 bg-white/82 p-5 text-sm leading-7 text-ink-soft shadow-[0_14px_36px_rgba(15,23,42,0.06)]">
                <p className="font-semibold text-ink">Digital delivery</p>
                <p className="mt-1">
                  Buyers receive digital library access after a confirmed purchase. There is no physical shipping.
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-white/80 bg-white/82 p-5 text-sm leading-7 text-ink-soft shadow-[0_14px_36px_rgba(15,23,42,0.06)]">
                <p className="font-semibold text-ink">Plain revenue splits</p>
                <p className="mt-1">
                  Each plan clearly shows how much the seller keeps from each sale and how many AI credits are included.
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-white/80 bg-white/82 p-5 text-sm leading-7 text-ink-soft shadow-[0_14px_36px_rgba(15,23,42,0.06)]">
                <p className="font-semibold text-ink">Support and policy links</p>
                <p className="mt-1">
                  Review refund, seller, privacy, and support policies before launch or before you start selling.
                </p>
              </div>
            </div>
          </PremiumSurface>

          <PremiumSurface className="p-2 sm:p-4" variant="light">
            <PricingPreview />
          </PremiumSurface>

          <PremiumSurface className="p-6 text-sm leading-7 text-amber-950 sm:p-8" variant="soft">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700">
              Before sellers publish
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-ink">
              Sellers still review every listing before it goes live.
            </h2>
            <div className="mt-4 grid gap-3 lg:grid-cols-3">
              <p className="rounded-[1.15rem] border border-white/80 bg-white/88 px-4 py-3 shadow-sm">
                Sellers must only upload content they created or have rights to sell.
              </p>
              <p className="rounded-[1.15rem] border border-white/80 bg-white/88 px-4 py-3 shadow-sm">
                Digital purchases are generally final after delivery unless there is an access, broken file, misleading listing, duplicate charge, or legal issue.
              </p>
              <p className="rounded-[1.15rem] border border-white/80 bg-white/88 px-4 py-3 shadow-sm">
                Support is available at support@lessonforgehub.com for buyer, seller, and policy questions.
              </p>
            </div>
          </PremiumSurface>

          <FAQPreview />
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
