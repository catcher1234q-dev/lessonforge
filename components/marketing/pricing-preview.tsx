"use client";

import Link from "next/link";
import { Check } from "lucide-react";

import { planConfig, type PlanKey } from "@/lib/config/plans";

const pricingOrder: PlanKey[] = ["starter", "basic", "pro"];

function formatPrice(monthlyPriceUsd: number) {
  return monthlyPriceUsd === 0 ? "$0/month" : `$${monthlyPriceUsd}/month`;
}

function getCardTone(planKey: PlanKey) {
  if (planKey === "basic") {
    return {
      badge: "bg-brand text-white",
      button: "bg-brand text-white hover:bg-brand-700",
      card: "border-brand/20 bg-brand-soft shadow-[0_24px_80px_rgba(37,99,235,0.16)]",
      note: "text-brand",
      panel: "bg-white/85",
    };
  }

  if (planKey === "pro") {
    return {
      badge: "bg-slate-950 text-white",
      button: "bg-brand text-white hover:bg-brand-700",
      card: "border-slate-950/10 bg-white shadow-[0_24px_72px_rgba(15,23,42,0.09)]",
      note: "text-ink-soft",
      panel: "bg-slate-50",
    };
  }

  return {
    badge: "bg-slate-100 text-ink-soft",
    button: "bg-brand text-white hover:bg-brand-700",
    card: "border-ink/5 bg-white shadow-soft-xl",
    note: "text-ink-soft",
    panel: "bg-surface-subtle",
  };
}

function getPrimaryValueLine(planKey: PlanKey) {
  const plan = planConfig[planKey];
  return `Keep ${plan.sellerSharePercent}% of every sale`;
}

function getSecondaryValueLine(planKey: PlanKey) {
  const plan = planConfig[planKey];
  return `${plan.activeListingLimit} active listing${plan.activeListingLimit === 1 ? "" : "s"}`;
}

export function PricingPreview({
  variant = "default",
}: {
  variant?: "default" | "sell";
}) {
  return (
    <section
      id={variant === "sell" ? "sell-pricing" : "pricing"}
      className={`px-5 sm:px-6 lg:px-8 ${variant === "sell" ? "py-12 lg:py-16" : "py-8 lg:py-12"}`}
    >
      <div className="mx-auto max-w-6xl">
        <div className="max-w-3xl">
          {variant === "sell" ? (
            <>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand">
                Pricing
              </p>
              <p className="mt-3 text-xl font-semibold tracking-[-0.01em] text-ink sm:text-[2rem]">
                Keep up to 80 percent of every sale
              </p>
              <h2 className="mt-4 font-[family-name:var(--font-display)] text-3xl text-ink sm:text-4xl">
                Choose the plan that fits how you want to sell
              </h2>
              <p className="mt-3 text-base leading-7 text-ink-soft">
                Start free, upgrade when you want stronger payouts, more AI support, and better seller tools.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand">
                Pricing
              </p>
              <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl text-ink sm:text-4xl">
                Choose the plan that fits how you want to sell
              </h2>
              <p className="mt-2 text-base leading-7 text-ink-soft">
                Start free, upgrade when you want stronger payouts, more AI support, and better seller tools.
              </p>
            </>
          )}
        </div>

        <div className={`grid gap-4 lg:grid-cols-3 ${variant === "sell" ? "mt-10" : "mt-7"}`}>
          {pricingOrder.map((planKey) => {
            const plan = planConfig[planKey];
            const tone = getCardTone(planKey);
            const badgeLabel =
              variant === "sell" && planKey === "pro"
                ? "Best value"
                : plan.badgeLabel;
            const ctaLabel =
              variant === "sell"
                ? planKey === "starter"
                  ? "Start Selling"
                  : planKey === "pro"
                    ? "Upgrade to Pro"
                    : "Start Selling"
                : plan.ctaLabel;

            return (
              <article
                key={plan.key}
                className={`flex h-full flex-col rounded-[1.4rem] border p-5 transition ${tone.card} ${
                  variant === "sell" && planKey === "pro" ? "lg:-translate-y-1" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-semibold text-ink">{plan.label}</h3>
                    {plan.valueNote ? (
                      <p className={`mt-1 text-xs font-semibold uppercase tracking-[0.16em] ${tone.note}`}>
                        {plan.valueNote}
                      </p>
                    ) : (
                      <div className="mt-[1.375rem]" />
                    )}
                  </div>
                  {badgeLabel ? (
                    <span
                      className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${tone.badge} ${
                        variant === "sell" && planKey === "pro" ? "shadow-sm" : ""
                      }`}
                    >
                      {badgeLabel}
                    </span>
                  ) : null}
                </div>

                <p className="mt-4 text-3xl font-semibold text-ink">
                  {formatPrice(plan.monthlyPriceUsd)}
                </p>
                <p className="mt-2 text-sm leading-6 text-ink-soft">
                  {plan.shortDescription}
                </p>

                <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                  <div className={`rounded-[1.05rem] px-4 py-3 text-sm leading-6 ${tone.panel}`}>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">
                      Keep more
                    </p>
                    <p className="mt-1 text-[15px] font-semibold text-ink">{getPrimaryValueLine(planKey)}</p>
                  </div>
                  <div className={`rounded-[1.05rem] px-4 py-3 text-sm leading-6 ${tone.panel}`}>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">
                      Publish
                    </p>
                    <p className="mt-1 font-semibold text-ink">{getSecondaryValueLine(planKey)}</p>
                  </div>
                  <div className={`rounded-[1.05rem] px-4 py-3 text-sm leading-6 ${tone.panel}`}>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">
                      AI support
                    </p>
                    <p className="mt-1 font-semibold text-ink">{plan.creditGrantLabel}</p>
                  </div>
                </div>

                <div className={`mt-4 rounded-[1.05rem] px-4 py-3 text-sm leading-6 text-ink-soft ${tone.panel}`}>
                  <p className="font-semibold text-ink">Best for</p>
                  <p className="mt-1">{plan.bestFor}</p>
                </div>

                <div className="mt-5 grid gap-3 text-sm text-ink-soft">
                  {plan.featureHighlights.map((feature) => (
                    <div key={feature} className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/80 text-brand">
                        <Check className="h-4 w-4" />
                      </span>
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-6 pt-2">
                  <Link
                    className={`inline-flex w-full items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition ${tone.button}`}
                    href="/sell/onboarding"
                  >
                    {ctaLabel}
                  </Link>
                </div>
                <p className="mt-3 text-center text-xs leading-5 text-ink-soft">
                  {planKey === "starter"
                    ? "Useful for testing one listing, but intentionally limited."
                    : planKey === "basic"
                      ? "Smartest choice for most sellers who want better payout and room to grow."
                      : "Built for serious sellers who want the strongest payout and the deepest support."}
                </p>
              </article>
            );
          })}
        </div>

        <div className="mt-6 rounded-[1.25rem] border border-black/5 bg-surface-subtle px-4 py-4 text-sm leading-6 text-ink-soft">
          <p className="font-semibold text-ink">Why paid plans feel stronger</p>
          <p className="mt-1">
            Starter keeps the door open, but Basic and Pro are built to help sellers publish more, keep more from every sale, and use stronger AI support without hitting limits so quickly.
          </p>
        </div>
        {variant === "sell" ? (
          <p className="mt-4 text-center text-sm text-ink-muted">
            Secure payments powered by Stripe
          </p>
        ) : null}
      </div>
    </section>
  );
}
