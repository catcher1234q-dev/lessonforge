import { ArrowRight, FolderHeart, ShoppingBag, Store } from "lucide-react";
import Link from "next/link";

import { secondaryActionLinkClassName } from "@/components/shared/secondary-action-link";
import { SectionIntro } from "@/components/shared/section-intro";

export function TrustStrip() {
  return (
    <section className="px-5 py-8 sm:px-6 lg:px-8 lg:py-10">
      <div className="mx-auto max-w-7xl rounded-[2.2rem] border border-ink/5 bg-white p-6 shadow-soft-xl sm:p-8 lg:p-10">
        <SectionIntro
          body="If you already know where you want to go, use one of these quick links."
          eyebrow="Start Here"
          title="Go straight to the right public section."
          titleClassName="text-3xl sm:text-4xl"
          bodyClassName="text-base leading-7"
        />

        <div className="mt-7 grid gap-4 lg:grid-cols-3">
          <article className="rounded-[1.5rem] border border-ink/5 bg-surface-subtle p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-soft text-brand">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-xl font-semibold text-ink">Browse like a buyer</h3>
            <p className="mt-2 text-sm leading-6 text-ink-soft">
              Open the buyer catalog and start viewing listings right away.
            </p>
            <Link
              className={`mt-4 ${secondaryActionLinkClassName("w-fit")}`}
              href="/marketplace"
            >
              Browse buyer catalog
              <ArrowRight className="h-4 w-4" />
            </Link>
          </article>

          <article className="rounded-[1.5rem] border border-ink/5 bg-surface-subtle p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-soft text-brand">
              <Store className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-xl font-semibold text-ink">Sell resources</h3>
            <p className="mt-2 text-sm leading-6 text-ink-soft">
              Open the seller workspace and move into payouts, listings, and fixes.
            </p>
            <Link
              className={`mt-4 ${secondaryActionLinkClassName("w-fit")}`}
              href="/sell/dashboard"
            >
              Open seller workspace
              <ArrowRight className="h-4 w-4" />
            </Link>
          </article>

          <article className="rounded-[1.5rem] border border-ink/5 bg-surface-subtle p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-soft text-brand">
              <FolderHeart className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-xl font-semibold text-ink">Check saved items and purchases</h3>
            <p className="mt-2 text-sm leading-6 text-ink-soft">
              Open the signed-in buyer side for saved comparisons, purchases, and account follow-up.
            </p>
            <Link
              className={`mt-4 ${secondaryActionLinkClassName("w-fit")}`}
              href="/account"
            >
              Open account overview
              <ArrowRight className="h-4 w-4" />
            </Link>
          </article>
        </div>
      </div>
    </section>
  );
}
