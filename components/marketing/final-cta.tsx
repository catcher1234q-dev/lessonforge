import { ArrowRight, CircleUserRound, ShoppingBag, Store } from "lucide-react";
import Link from "next/link";

import { SectionIntro } from "@/components/shared/section-intro";

export function FinalCTA() {
  return (
    <section className="px-5 pb-14 pt-6 sm:px-6 lg:px-8 lg:pb-16">
      <div className="mx-auto max-w-6xl rounded-[1.6rem] border border-brand/10 bg-brand-soft px-6 py-7 sm:px-8 sm:py-8">
        <SectionIntro
          body="Open the part of the site you need next."
          eyebrow="What To Open Next"
          title="Go straight to the right place."
          titleClassName="text-3xl sm:text-4xl"
          bodyClassName="text-base leading-7"
        />

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <Link
            className="rounded-[1.25rem] border border-ink/5 bg-white px-5 py-5 transition hover:border-brand/20 hover:bg-white/90"
            href="/marketplace"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-soft text-brand">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-xl font-semibold text-ink">Open the marketplace</h3>
            <p className="mt-2 text-sm leading-6 text-ink-soft">
              Browse listings, open products, and preview resources.
            </p>
            <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-brand">
              Go to marketplace
              <ArrowRight className="h-4 w-4" />
            </span>
          </Link>

          <Link
            className="rounded-[1.25rem] border border-ink/5 bg-white px-5 py-5 transition hover:border-brand/20 hover:bg-white/90"
            href="/sell/dashboard"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-soft text-brand">
              <Store className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-xl font-semibold text-ink">Open the seller dashboard</h3>
            <p className="mt-2 text-sm leading-6 text-ink-soft">
              Review listings, onboarding, and seller next steps.
            </p>
            <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-brand">
              Go to seller dashboard
              <ArrowRight className="h-4 w-4" />
            </span>
          </Link>

          <Link
            className="rounded-[1.25rem] border border-ink/5 bg-white px-5 py-5 transition hover:border-brand/20 hover:bg-white/90"
            href="/account"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-soft text-brand">
              <CircleUserRound className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-xl font-semibold text-ink">Open your account</h3>
            <p className="mt-2 text-sm leading-6 text-ink-soft">
              Reopen purchases, saved items, seller progress, and the next thing you need to do.
            </p>
            <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-brand">
              Go to account overview
              <ArrowRight className="h-4 w-4" />
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
