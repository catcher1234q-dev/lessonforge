import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { PricingPreview } from "@/components/marketing/pricing-preview";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

const steps = [
  {
    title: "Create",
    description: "Set up your seller space and choose your plan.",
  },
  {
    title: "Upload",
    description: "Add your resources and prep them for buyers.",
  },
  {
    title: "Earn",
    description: "Sell through Stripe and keep more of every sale.",
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
                Up to 80 percent payout. Built for teachers.
              </p>

              <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row sm:items-center">
                <Link
                  className="inline-flex min-w-[180px] items-center justify-center gap-2 rounded-full bg-brand px-6 py-3.5 text-base font-semibold text-white transition hover:bg-brand-700"
                  href="/sell/onboarding"
                >
                  Start Selling
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  className="inline-flex min-w-[180px] items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-3.5 text-base font-semibold text-ink transition hover:border-slate-300"
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
                Manual uploads stay available, AI stays optional, and Stripe handles secure seller payouts in the background.
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
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
