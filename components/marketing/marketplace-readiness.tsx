import { CreditCard, Download, Flag, Store } from "lucide-react";
import Link from "next/link";

import { SectionIntro } from "@/components/shared/section-intro";

const steps = [
  {
    icon: Store,
    title: "Teachers upload original resources",
    body:
      "Sellers add previews, grade levels, standards, and listing details before a resource stays live in the marketplace.",
  },
  {
    icon: Download,
    title: "Buyers purchase and download instantly",
    body:
      "Buyers review previews, complete secure checkout through the platform, and return to their library for protected access after purchase.",
  },
  {
    icon: CreditCard,
    title: "Sellers receive payouts through the platform",
    body:
      "Payouts follow the seller plan, transaction clearance, and marketplace rules so money movement stays controlled and reviewable.",
  },
] as const;

const controls = [
  "Listings are reviewed for quality and compliance.",
  "Users can report products that look broken, misleading, or unsafe.",
  "Violating content may be removed and payouts can be adjusted after refunds or disputes.",
] as const;

export function MarketplaceReadiness() {
  return (
    <section className="px-5 py-10 sm:px-6 lg:px-8 lg:py-14">
      <div className="mx-auto max-w-7xl rounded-[2.25rem] border border-ink/5 bg-white p-6 shadow-soft-xl sm:p-8 lg:p-10">
        <SectionIntro
          body="LessonForgeHub is a digital marketplace for teacher resources. The goal is to make it obvious how sellers upload original materials, how buyers get digital downloads, and how the platform controls risk."
          eyebrow="How LessonForgeHub works"
          title="A real teacher marketplace, explained in plain language."
          titleClassName="text-3xl sm:text-4xl"
          bodyClassName="text-base leading-7"
        />

        <div className="mt-7 grid gap-4 lg:grid-cols-3">
          {steps.map((step) => {
            const Icon = step.icon;

            return (
              <article
                key={step.title}
                className="rounded-[1.5rem] border border-ink/5 bg-surface-subtle p-5"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-soft text-brand">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-xl font-semibold text-ink">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-ink-soft">{step.body}</p>
              </article>
            );
          })}
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-[1.65rem] border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand">
              How payments work
            </p>
            <h3 className="mt-3 text-2xl font-semibold text-ink">
              Customers purchase through LessonForgeHub. Sellers are paid after transactions clear.
            </h3>
            <div className="mt-4 grid gap-3 text-sm leading-7 text-ink-soft">
              <p>
                Customers purchase digital products through LessonForgeHub and payments are processed securely through a payment provider.
              </p>
              <p>
                Sellers receive payouts after eligible transactions clear and according to platform rules, support review, and dispute handling.
              </p>
              <p>
                LessonForgeHub keeps order records, support paths, and product reporting visible so the marketplace feels controlled instead of improvised.
              </p>
            </div>
          </section>

          <section className="rounded-[1.65rem] border border-rose-100 bg-rose-50 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-rose-600">
              <Flag className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-2xl font-semibold text-ink">Marketplace controls stay visible.</h3>
            <div className="mt-4 grid gap-3 text-sm leading-6 text-ink-soft">
              {controls.map((note) => (
                <p
                  key={note}
                  className="rounded-[1rem] border border-white/80 bg-white/80 px-4 py-3"
                >
                  {note}
                </p>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
                href="/support"
              >
                Open support
              </Link>
              <Link
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:border-slate-300"
                href="/refund-policy"
              >
                Read refund policy
              </Link>
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
