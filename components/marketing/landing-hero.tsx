import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";

export function LandingHero() {
  return (
    <section className="relative overflow-hidden px-5 pb-8 pt-10 sm:px-6 lg:px-8 lg:pb-12 lg:pt-14">
      <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[1.12fr_0.88fr] lg:items-start">
        <div className="animate-fade-up">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-brand/10 bg-brand-soft px-4 py-2 text-sm font-medium text-brand-700">
            <Sparkles className="h-4 w-4" />
            Teacher marketplace with connected buyer and seller flows
          </div>

          <h1 className="font-[family-name:var(--font-display)] text-5xl leading-tight tracking-tight text-ink sm:text-6xl lg:text-7xl">
            See exactly how LessonForge works before you commit.
          </h1>

          <p className="mt-5 max-w-xl text-lg leading-8 text-ink-soft sm:text-xl">
            Browse like a buyer, step through the seller workflow, and understand how the main parts of the marketplace connect.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link
              className="inline-flex items-center justify-center gap-2 rounded-full bg-brand px-6 py-3.5 text-base font-semibold text-white transition hover:bg-brand-700"
              href="/marketplace"
            >
              Start with the marketplace
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              className="inline-flex items-center justify-center gap-2 rounded-full border border-ink/10 bg-white px-6 py-3.5 text-base font-semibold text-ink transition hover:border-ink/20 hover:bg-surface-muted"
              href="/sell"
            >
              See the seller flow
            </Link>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <div className="rounded-[1.15rem] border border-emerald-100 bg-emerald-50/70 px-4 py-3.5 text-sm leading-6 text-emerald-900">
              <p className="font-semibold">If you click Marketplace first</p>
              <p className="mt-1">
                Open a listing, check the preview, and see how saved items and checkout work.
              </p>
            </div>
            <div className="rounded-[1.15rem] border border-amber-100 bg-amber-50/80 px-4 py-3.5 text-sm leading-6 text-amber-900">
              <p className="font-semibold">If you click Sell first</p>
              <p className="mt-1">
                Connect payouts, create a listing, and see how seller setup turns into a buyer-ready product.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[1.55rem] border border-white/70 bg-white/90 p-4 shadow-soft-xl">
          <div className="rounded-[1.35rem] bg-slate-950 px-4 py-4 text-white">
            <p className="text-sm text-white/60">What is inside</p>
            <h2 className="mt-2 text-lg font-semibold">
              One connected flow from browse to checkout.
            </h2>
            <div className="mt-4 space-y-2.5 text-sm text-white/80">
              <div className="rounded-2xl bg-white/5 p-3.5">
                Buyer browse and preview flow
              </div>
              <div className="rounded-2xl bg-white/5 p-3.5">
                Seller setup and listing workflow
              </div>
              <div className="rounded-2xl bg-white/5 p-3.5">
                Account, library, and saved-item handoff
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
