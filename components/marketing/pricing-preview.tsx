"use client";

import Link from "next/link";
import { Check } from "lucide-react";

import { PremiumSurface } from "@/components/shared/premium-surface";
import { planConfig, type PlanKey } from "@/lib/config/plans";

const pricingOrder: PlanKey[] = ["starter", "basic", "pro"];

function formatPrice(monthlyPriceUsd: number) {
  return monthlyPriceUsd === 0 ? "$0/month" : `$${monthlyPriceUsd}/month`;
}

function getCardTone(planKey: PlanKey) {
  if (planKey === "basic") {
    return {
      badge: "bg-slate-950 text-white",
      button: "bg-slate-950 text-white hover:bg-slate-800",
      card: "shadow-[0_28px_86px_rgba(37,99,235,0.18)]",
      note: "text-brand",
      panel: "border-white/80 bg-white/88",
      variant: "glass" as const,
    };
  }

  if (planKey === "pro") {
    return {
      badge: "bg-[#d4af37] text-slate-950",
      button: "bg-slate-950 text-white hover:bg-slate-800",
      card: "shadow-[0_24px_72px_rgba(15,23,42,0.09)]",
      note: "text-ink-soft",
      panel: "border-white/80 bg-white/84",
      variant: "light" as const,
    };
  }

  return {
    badge: "bg-slate-100 text-ink-soft",
    button: "bg-slate-950 text-white hover:bg-slate-800",
    card: "shadow-soft-xl",
    note: "text-ink-soft",
    panel: "border-white/80 bg-white/84",
    variant: "light" as const,
  };
}

function getSecondaryValueLine(planKey: PlanKey) {
  return planKey === "starter"
    ? "Unlimited product uploads"
    : "Unlimited uploads";
}

function getPlanHighlights(planKey: PlanKey) {
  const plan = planConfig[planKey];

  return [
    {
      label: "Payout",
      value: `Keep ${plan.sellerSharePercent}% of every sale`,
    },
    {
      label: "Uploads",
      value: getSecondaryValueLine(planKey),
    },
    {
      label: "AI credits",
      value: plan.creditGrantLabel,
    },
  ];
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
                Choose the plan that fits your shop
              </h2>
              <p className="mt-3 text-base leading-7 text-ink-soft">
                Start free. Upgrade when you want more AI help and a higher payout.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand">
                Pricing
              </p>
              <p className="mt-3 text-xl font-semibold tracking-[-0.01em] text-ink sm:text-[2rem]">
                Keep more when you sell more
              </p>
              <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl text-ink sm:text-4xl">
                Choose the plan that fits your shop
              </h2>
              <p className="mt-2 text-base leading-7 text-ink-soft">
                Start free. Upgrade when you want more AI help and a higher payout.
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
              <PremiumSurface
                key={plan.key}
                className={`flex h-full flex-col p-5 transition ${tone.card} ${
                  variant === "sell" && planKey === "pro" ? "lg:-translate-y-1" : ""
                }`}
                variant={tone.variant}
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

                <div className={`mt-4 rounded-[1.15rem] border px-4 py-4 ${tone.panel} shadow-[0_12px_28px_rgba(15,23,42,0.05)]`}>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">
                    Plan highlights
                  </p>
                  <div className="mt-3 grid gap-2">
                    {getPlanHighlights(planKey).map((highlight) => (
                      <div
                        key={highlight.label}
                        className="flex items-center justify-between gap-4 rounded-[0.9rem] border border-white/80 bg-white/78 px-3 py-2.5 text-sm leading-6 shadow-sm"
                      >
                        <span className="shrink-0 font-medium text-ink-soft">
                          {highlight.label}
                        </span>
                        <span className="text-right font-semibold text-ink">
                          {highlight.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={`mt-4 rounded-[1.05rem] border px-4 py-3 text-sm leading-6 text-ink-soft ${tone.panel} shadow-[0_12px_28px_rgba(15,23,42,0.05)]`}>
                  <p className="font-semibold text-ink">Best for</p>
                  <p className="mt-1">{plan.bestFor}</p>
                </div>

                <div className="mt-5 grid gap-3 text-sm text-ink-soft">
                  {plan.featureHighlights.map((feature) => (
                    <div key={feature} className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/80 bg-white/90 text-brand shadow-sm">
                        <Check className="h-4 w-4" />
                      </span>
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-6 pt-2">
                  <Link
                    className={`premium-button-shadow inline-flex w-full items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition hover:-translate-y-0.5 ${tone.button}`}
                    data-analytics-event="pricing_plan_clicked"
                    data-analytics-props={JSON.stringify({ plan: planKey, surface: variant })}
                    href="/sell/onboarding"
                  >
                    {ctaLabel}
                  </Link>
                </div>
                <p className="mt-3 text-center text-xs leading-5 text-ink-soft">
                  {planKey === "starter"
                    ? "Good for trying your first resources before you commit."
                    : planKey === "basic"
                      ? "A good fit when you want more AI support and a higher payout."
                      : "For sellers who want the strongest payout and the most monthly AI help."}
                </p>
              </PremiumSurface>
            );
          })}
        </div>

        <div className="mt-6 grid gap-3 rounded-[1.4rem] border border-white/80 bg-white/84 px-4 py-4 text-sm leading-6 text-ink-soft shadow-[0_16px_36px_rgba(15,23,42,0.06)] lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="font-semibold text-ink">When to upgrade</p>
            <p className="mt-1">
              Stay on Starter while you test. Move to Basic or Pro when you want to publish more and keep more from each sale.
            </p>
          </div>
          <div className="rounded-[1rem] border border-white/80 bg-white/95 px-4 py-3 shadow-sm">
            <p className="font-semibold text-ink">Good to know</p>
            <p className="mt-1">
              LessonForgeHub sells digital educational resources. Buyers receive library access after a confirmed purchase, and support and policy pages stay easy to find before and after checkout.
            </p>
          </div>
        </div>
        {variant === "default" ? (
          <p className="mt-4 text-center text-sm text-ink-muted">
            Secure payments, clear seller earnings, and visible buyer access rules.
          </p>
        ) : null}
        {variant === "sell" ? (
          <p className="mt-4 text-center text-sm text-ink-muted">
            Secure payments and clear payout rules
          </p>
        ) : null}
      </div>
    </section>
  );
}
