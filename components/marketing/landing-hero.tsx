import { ArrowRight, BookOpenCheck, ShieldCheck, Wallet } from "lucide-react";
import Link from "next/link";

export function LandingHero() {
  return (
    <section className="relative overflow-hidden px-5 pb-8 pt-8 sm:px-6 lg:px-8 lg:pb-12 lg:pt-10">
      <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[1.12fr_0.88fr] lg:items-start">
        <div className="animate-fade-up">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-brand/10 bg-brand-soft px-4 py-2 text-sm font-medium text-brand-700">
            <BookOpenCheck className="h-4 w-4" />
            Digital marketplace for teacher-made resources
          </div>

          <h1 className="font-[family-name:var(--font-display)] text-4xl leading-tight tracking-tight text-ink sm:text-6xl lg:text-7xl">
            Find lessons faster. Sell what already works.
          </h1>

          <p className="mt-5 max-w-xl text-lg leading-8 text-ink-soft sm:text-xl">
            LessonForge is a marketplace for teacher-created digital classroom resources. Sellers upload original materials they create, and buyers purchase downloadable resources for classroom use.
          </p>

          <p className="mt-3 max-w-xl text-base leading-7 text-ink-soft">
            Browse worksheets, lesson plans, activities, assessments, and printable resources. Sellers are expected to upload only materials they created or have the right to sell.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-brand px-6 py-3.5 text-base font-semibold text-white transition hover:bg-brand-700 sm:w-auto"
              data-analytics-event="homepage_cta_clicked"
              data-analytics-props={JSON.stringify({ cta: "start_selling", destination: "/sell/onboarding" })}
              href="/sell/onboarding"
            >
              Start Selling
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-ink/10 bg-white px-6 py-3.5 text-base font-semibold text-ink transition hover:border-ink/20 hover:bg-surface-muted sm:w-auto"
              data-analytics-event="homepage_cta_clicked"
              data-analytics-props={JSON.stringify({ cta: "browse_resources", destination: "/marketplace" })}
              href="/marketplace"
            >
              Browse Resources
            </Link>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <div className="rounded-[1.15rem] border border-emerald-100 bg-emerald-50/70 px-4 py-3.5 text-sm leading-6 text-emerald-900">
              <p className="font-semibold">For sellers</p>
              <p className="mt-1">
                Upload original classroom resources, show real previews, and offer digital downloads through the platform.
              </p>
            </div>
            <div className="rounded-[1.15rem] border border-amber-100 bg-amber-50/80 px-4 py-3.5 text-sm leading-6 text-amber-900">
              <p className="font-semibold">For buyers</p>
              <p className="mt-1">
                Preview first, buy digital resources for classroom use, download them after purchase, and return to your library when you need the file again.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[1.55rem] border border-white/70 bg-white/90 p-4 shadow-soft-xl">
          <div className="rounded-[1.35rem] bg-slate-950 px-4 py-4 text-white">
            <p className="text-sm text-white/60">Good to know</p>
            <h2 className="mt-2 text-lg font-semibold">
              The basics are clear before you sign up.
            </h2>
            <div className="mt-4 space-y-2.5 text-sm text-white/80">
              <div className="flex items-start gap-3 rounded-2xl bg-white/5 p-3.5">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                <span>Listings must be original or properly licensed and can be reported or removed for policy violations.</span>
              </div>
              <div className="flex items-start gap-3 rounded-2xl bg-white/5 p-3.5">
                <Wallet className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" />
                <span>Payments are processed securely and seller payouts follow the platform's marketplace rules.</span>
              </div>
              <div className="flex items-start gap-3 rounded-2xl bg-white/5 p-3.5">
                <BookOpenCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                <span>Purchases stay in your library, with support and refund rules linked in plain view.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
