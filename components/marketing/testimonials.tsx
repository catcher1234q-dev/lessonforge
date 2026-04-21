import { BadgeCheck, CreditCard, ShieldCheck } from "lucide-react";

import { SectionIntro } from "@/components/shared/section-intro";

const credibilityPoints = [
  {
    icon: ShieldCheck,
    eyebrow: "Buyer trust",
    title: "Protected previews before purchase",
    body:
      "Buyers can inspect previews, review listing detail, and compare seller trust signals before deciding to check out.",
  },
  {
    icon: CreditCard,
    eyebrow: "Seller payouts",
    title: "Checkout and payout setup run through the platform",
    body:
      "LessonForge uses a structured marketplace flow so buyer payments and seller payout setup do not rely on improvised manual steps.",
  },
  {
    icon: BadgeCheck,
    eyebrow: "Marketplace control",
    title: "Reviews, reports, and refund decisions stay visible",
    body:
      "The website already includes buyer support flows, refund requests, and report handling so marketplace trust does not depend on email alone.",
  },
] as const;

export function Testimonials() {
  return (
    <section className="px-5 py-8 sm:px-6 lg:px-8 lg:py-10">
      <div className="mx-auto max-w-6xl">
        <SectionIntro
          body="These are the concrete trust signals that make LessonForge feel more like a real marketplace and less like a simple catalog."
          eyebrow="Why It Feels Launch-Ready"
          title="Credibility should come from the product, not just promises."
          titleClassName="text-3xl sm:text-4xl"
          bodyClassName="text-base leading-7"
        />

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {credibilityPoints.map((item) => {
            const Icon = item.icon;

            return (
              <article
                key={item.title}
                className="rounded-[1.35rem] border border-ink/5 bg-white p-5 shadow-soft-xl"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-soft text-brand">
                  <Icon className="h-5 w-5" />
                </div>
                <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-ink-muted">
                  {item.eyebrow}
                </p>
                <h3 className="mt-2 text-xl font-semibold text-ink">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-ink-soft">{item.body}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
