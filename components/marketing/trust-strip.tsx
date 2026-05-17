import { ArrowRight, LifeBuoy, ShieldCheck, ShoppingBag, Store } from "lucide-react";
import Link from "next/link";

import { PremiumSurface } from "@/components/shared/premium-surface";
import { secondaryActionLinkClassName } from "@/components/shared/secondary-action-link";
import { SectionIntro } from "@/components/shared/section-intro";

export function TrustStrip() {
  return (
    <section className="px-5 py-8 sm:px-6 lg:px-8 lg:py-10">
      <PremiumSurface className="mx-auto max-w-7xl p-6 sm:p-8 lg:p-10" variant="glass">
        <SectionIntro
          body="Open a resource, inspect the preview, and see the policy path before you spend money. The trust layer stays visible instead of hidden in fine print."
          eyebrow="Before you buy"
          title="A cleaner marketplace still needs clear guardrails."
          titleClassName="text-3xl sm:text-4xl lg:text-[2.7rem]"
          bodyClassName="text-base leading-7"
        />

        <div className="mt-7 grid gap-4 lg:grid-cols-3">
          <article className="rounded-[1.6rem] border border-slate-200/80 bg-white/90 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-soft text-brand">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-xl font-semibold text-ink">Preview before buying</h3>
            <p className="mt-2 text-sm leading-6 text-ink-soft">
              Open a listing, check the preview, and confirm the file type, grade level, and classroom fit before buying.
            </p>
            <Link
              className={`mt-4 ${secondaryActionLinkClassName("w-fit")}`}
              href="/marketplace"
            >
              Browse resources
              <ArrowRight className="h-4 w-4" />
            </Link>
          </article>

          <article className="rounded-[1.6rem] border border-slate-200/80 bg-white/90 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-soft text-brand">
              <Store className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-xl font-semibold text-ink">Clear seller payout rules</h3>
            <p className="mt-2 text-sm leading-6 text-ink-soft">
              Sellers see platform rules, payout setup steps, and the requirement to upload only work they created or have rights to distribute.
            </p>
            <Link
              className={`mt-4 ${secondaryActionLinkClassName("w-fit")}`}
              href="/sell"
            >
              Start seller setup
              <ArrowRight className="h-4 w-4" />
            </Link>
          </article>

          <article className="rounded-[1.6rem] border border-slate-200/80 bg-white/90 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-soft text-brand">
              <LifeBuoy className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-xl font-semibold text-ink">Reports and policy help stay visible</h3>
            <p className="mt-2 text-sm leading-6 text-ink-soft">
              Buyers can find support, refund rules, privacy, seller policy, and reporting paths without hunting through hidden screens.
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

        <div className="mt-5 rounded-[1.5rem] border border-[#d4af37]/20 bg-[linear-gradient(135deg,rgba(212,175,55,0.10),rgba(255,255,255,0.94))] p-4 text-sm leading-6 text-ink-soft">
          <div className="flex items-start gap-3">
            <ShoppingBag className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
            <span>Know what you are buying, know how a listing can be reported or removed, and know when digital refunds may still be reviewed.</span>
          </div>
        </div>
      </PremiumSurface>
    </section>
  );
}
