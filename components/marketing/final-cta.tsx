import { ArrowRight, ShoppingBag, Store } from "lucide-react";
import Link from "next/link";

export function FinalCTA() {
  return (
    <section className="px-5 pb-14 pt-6 sm:px-6 lg:px-8 lg:pb-16">
      <div className="mx-auto max-w-6xl rounded-[1.6rem] border border-brand/10 bg-brand-soft px-6 py-7 sm:px-8 sm:py-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">
              Ready when you are
            </p>
            <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl leading-tight text-ink sm:text-4xl">
              Ready to try it?
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-7 text-ink-soft">
              Browse resources for your next lesson, or list something another teacher could use.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              className="inline-flex items-center justify-center gap-2 rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
              href="/marketplace"
            >
              <ShoppingBag className="h-4 w-4" />
              Browse resources
            </Link>

            <Link
              className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:border-slate-300"
              href="/sell/onboarding"
            >
              <Store className="h-4 w-4" />
              Start selling
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
