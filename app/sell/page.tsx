import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { PricingPreview } from "@/components/marketing/pricing-preview";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Sell Teaching Resources",
  description:
    "Start selling classroom resources on LessonForgeHub with simple listing tools, payout setup, and seller plans up to 80 percent payout.",
  path: "/sell",
});

const steps = [
  {
    title: "Create",
    description: "Set up your seller space and choose your plan.",
  },
  {
    title: "Upload",
    description: "Add original resources you created or have rights to distribute, then prep them for buyers.",
  },
  {
    title: "Earn",
    description: "Sell through the platform and keep more of every sale.",
  },
];

export default function SellPage() {
  return (
    <main className="page-shell min-h-screen">
      <SiteHeader />

      <section className="px-5 pb-24 pt-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-11 lg:gap-16">
          <section className="rounded-[36px] border border-black/5 bg-white/90 px-6 py-10 text-center shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:px-10 sm:py-12 lg:px-14 lg:py-14">
            <div className="mx-auto max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand">
                Start selling
              </p>
              <h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl leading-[1.02] tracking-[-0.03em] text-ink sm:text-6xl">
                Sell your lessons. Keep more of what you earn.
              </h1>
              <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-ink-soft">
                Sell teacher-created digital classroom resources with clear rules, visible support, and up to 80 percent payout.
              </p>
              <p className="mx-auto mt-3 max-w-3xl text-base leading-7 text-ink-soft">
                You should only upload materials you created yourself or have clear rights to distribute. Buyers purchase downloadable resources for classroom use.
              </p>

              <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row sm:items-center">
                <Link
                  className="inline-flex min-w-[180px] items-center justify-center gap-2 rounded-full bg-brand px-6 py-3.5 text-base font-semibold text-white transition hover:bg-brand-700"
                  data-analytics-event="seller_onboarding_start_clicked"
                  data-analytics-props={JSON.stringify({ surface: "sell_hero" })}
                  href="/sell/onboarding"
                >
                  Start Selling
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  className="inline-flex min-w-[180px] items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-3.5 text-base font-semibold text-ink transition hover:border-slate-300"
                  data-analytics-event="pricing_anchor_clicked"
                  data-analytics-props={JSON.stringify({ surface: "sell_hero" })}
                  href="#sell-pricing"
                >
                  View Pricing
                </Link>
              </div>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            {steps.map((step, index) => (
              <article
                key={step.title}
                className="rounded-[30px] border border-black/5 bg-white p-6 text-center shadow-[0_18px_50px_rgba(15,23,42,0.06)]"
              >
                <span className="inline-flex rounded-full bg-brand-soft px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand">
                  0{index + 1}
                </span>
                <p className="mt-4 text-sm font-semibold uppercase tracking-[0.18em] text-brand">
                  {step.title}
                </p>
                <p className="mt-2 text-sm leading-7 text-ink-soft">
                  {step.description}
                </p>
              </article>
            ))}
          </section>

          <PricingPreview variant="sell" />

          <section className="rounded-[30px] border border-black/5 bg-white p-8 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand">
                What to expect
              </p>
              <h2 className="mt-4 text-3xl font-semibold text-ink">
                Start simple, then grow into Pro when you want the strongest payout.
              </h2>
              <p className="mt-4 text-base leading-7 text-ink-soft">
                Manual uploads stay available, AI stays optional, and seller payouts follow the platform's payment and support rules in the background.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row sm:items-center">
                  <Link
                    className="inline-flex min-w-[180px] items-center justify-center gap-2 rounded-full bg-brand px-6 py-3.5 text-base font-semibold text-white transition hover:bg-brand-700"
                    href="/sell/onboarding"
                  >
                    Start Selling
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    className="inline-flex min-w-[180px] items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-3.5 text-base font-semibold text-ink transition hover:border-slate-300"
                    href="/sell/onboarding?plan=pro"
                  >
                    Upgrade to Pro
                  </Link>
              </div>
            </div>
          </section>

          <section className="rounded-[30px] border border-black/5 bg-slate-950 p-6 text-white shadow-[0_18px_50px_rgba(15,23,42,0.12)] sm:p-8">
            <div className="grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-center">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-white/60">
                  Seller trust
                </p>
                <h2 className="mt-3 text-2xl font-semibold">
                  Payout setup and policy expectations stay visible.
                </h2>
                <p className="mt-3 text-sm leading-7 text-white/72">
                  Sellers can review payout setup, plan splits, publishing requirements, refund expectations, and the rule that they must upload original or properly licensed materials before selling through the marketplace.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                <Link
                  className="rounded-[1rem] bg-white/8 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/12"
                  href="/support"
                >
                  Support center
                </Link>
                <Link
                  className="rounded-[1rem] bg-white/8 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/12"
                  href="/seller-agreement"
                >
                  Seller policy
                </Link>
                <Link
                  className="rounded-[1rem] bg-white/8 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/12"
                  href="/refund-policy"
                >
                  Refund expectations
                </Link>
              </div>
            </div>
          </section>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
