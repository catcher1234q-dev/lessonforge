import { ArrowRight, LifeBuoy, ShieldCheck, ShoppingBag, Store } from "lucide-react";
import Link from "next/link";

import { secondaryActionLinkClassName } from "@/components/shared/secondary-action-link";
import { SectionIntro } from "@/components/shared/section-intro";

export function TrustStrip() {
  return (
    <section className="px-5 py-8 sm:px-6 lg:px-8 lg:py-10">
      <div className="mx-auto max-w-7xl rounded-[2.2rem] border border-ink/5 bg-white p-6 shadow-soft-xl sm:p-8 lg:p-10">
        <SectionIntro
          body="Preview first, pay through Stripe, and find support links without hunting around."
          eyebrow="Before you pay"
          title="Know what happens next."
          titleClassName="text-3xl sm:text-4xl"
          bodyClassName="text-base leading-7"
        />

        <div className="mt-7 grid gap-4 lg:grid-cols-3">
          <article className="rounded-[1.5rem] border border-ink/5 bg-surface-subtle p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-soft text-brand">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-xl font-semibold text-ink">Preview before buying</h3>
            <p className="mt-2 text-sm leading-6 text-ink-soft">
              Open a listing, check the preview, and decide if it fits your class.
            </p>
            <Link
              className={`mt-4 ${secondaryActionLinkClassName("w-fit")}`}
              href="/marketplace"
            >
              Browse resources
              <ArrowRight className="h-4 w-4" />
            </Link>
          </article>

          <article className="rounded-[1.5rem] border border-ink/5 bg-surface-subtle p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-soft text-brand">
              <Store className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-xl font-semibold text-ink">Clear seller earnings</h3>
            <p className="mt-2 text-sm leading-6 text-ink-soft">
              See your plan payout before you publish a resource for sale.
            </p>
            <Link
              className={`mt-4 ${secondaryActionLinkClassName("w-fit")}`}
              href="/sell"
            >
              Start seller setup
              <ArrowRight className="h-4 w-4" />
            </Link>
          </article>

          <article className="rounded-[1.5rem] border border-ink/5 bg-surface-subtle p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-soft text-brand">
              <LifeBuoy className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-xl font-semibold text-ink">Help is easy to find</h3>
            <p className="mt-2 text-sm leading-6 text-ink-soft">
              Support, refund rules, privacy, and terms are linked in plain view.
            </p>
            <Link
              className={`mt-4 ${secondaryActionLinkClassName("w-fit")}`}
              href="/support"
            >
              Open support
              <ArrowRight className="h-4 w-4" />
            </Link>
          </article>
        </div>

        <div className="mt-5 rounded-[1.5rem] border border-brand/10 bg-brand-soft/45 p-4 text-sm leading-6 text-ink-soft">
          <div className="flex items-start gap-3">
            <ShoppingBag className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
            <span>Know what you are buying, know when refunds are reviewed, and know where to get help.</span>
          </div>
        </div>
      </div>
    </section>
  );
}
