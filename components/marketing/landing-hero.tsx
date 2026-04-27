import { ArrowRight, BookOpenCheck, ShieldCheck, Sparkles, Wallet } from "lucide-react";
import Link from "next/link";

export function LandingHero() {
  return (
    <section className="relative overflow-hidden px-5 pb-6 pt-6 sm:px-6 lg:px-8 lg:pb-10 lg:pt-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(circle_at_top_left,rgba(212,175,55,0.18),transparent_36%),radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_28%)]" />
      <div className="mx-auto grid w-full max-w-6xl gap-5 lg:grid-cols-[1.12fr_0.88fr] lg:items-start">
        <div className="animate-fade-up">
          <div className="overflow-hidden rounded-[2rem] border border-[#d4af37]/20 bg-[#17181c] px-6 py-7 text-white shadow-[0_30px_100px_rgba(15,23,42,0.28)] sm:px-8 sm:py-9">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#d4af37]/25 bg-white/5 px-4 py-2 text-sm font-medium text-[#f2d77a]">
              <Sparkles className="h-4 w-4" />
              Premium teacher marketplace
            </div>

            <h1 className="max-w-4xl font-[family-name:var(--font-display)] text-4xl leading-tight tracking-tight text-white sm:text-6xl lg:text-7xl">
              Sell your teaching resources and keep more of what you earn
            </h1>

            <p className="mt-5 max-w-2xl text-lg leading-8 text-white/80 sm:text-xl">
              Clean previews. Simple uploads. Built for teachers.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#d4af37] px-6 py-3.5 text-base font-semibold text-slate-950 transition hover:bg-[#e4c763] sm:w-auto"
                data-analytics-event="homepage_cta_clicked"
                data-analytics-props={JSON.stringify({ cta: "browse_resources", destination: "/marketplace" })}
                href="/marketplace"
              >
                Browse resources
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3.5 text-base font-semibold text-white transition hover:border-white/25 hover:bg-white/10 sm:w-auto"
                data-analytics-event="homepage_cta_clicked"
                data-analytics-props={JSON.stringify({ cta: "start_selling", destination: "/sell/onboarding" })}
                href="/sell/onboarding"
              >
                Start selling
              </Link>
            </div>

            <p className="mt-6 text-sm font-medium uppercase tracking-[0.18em] text-white/62">
              Early marketplace. First resources live. More added weekly.
            </p>
          </div>
        </div>

        <div className="rounded-[1.8rem] border border-black/5 bg-white p-4 shadow-soft-xl">
          <div className="rounded-[1.45rem] bg-[#17181c] px-4 py-4 text-white">
            <p className="text-sm text-[#f2d77a]">Good to know</p>
            <h2 className="mt-2 text-lg font-semibold">
              The basics are clear right away.
            </h2>
            <div className="mt-4 space-y-2.5 text-sm text-white/80">
              <div className="flex items-start gap-3 rounded-2xl bg-white/5 p-3.5">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                <span>Listings must be original or properly licensed.</span>
              </div>
              <div className="flex items-start gap-3 rounded-2xl bg-white/5 p-3.5">
                <Wallet className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" />
                <span>Digital purchases stay tied to your library after checkout.</span>
              </div>
              <div className="flex items-start gap-3 rounded-2xl bg-white/5 p-3.5">
                <BookOpenCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#f2d77a]" />
                <span>Support, refund rules, and seller policies stay easy to find.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
