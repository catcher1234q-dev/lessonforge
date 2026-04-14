import { ArrowRight, BadgeDollarSign, UploadCloud, WandSparkles } from "lucide-react";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { SectionIntro } from "@/components/shared/section-intro";

const steps = [
  {
    title: "Create your seller profile",
    description:
      "Set your store name, subject strengths, and the kind of classroom resources you want to sell.",
    icon: UploadCloud,
  },
  {
    title: "Connect Stripe payouts",
    description:
      "Finish Stripe Connect Express onboarding so LessonForge can route your 60 percent share safely.",
    icon: BadgeDollarSign,
  },
  {
    title: "Upload and optimize listings",
    description:
      "Add files manually, preview the buyer experience, and use optional AI to improve titles, descriptions, and standards tags.",
    icon: WandSparkles,
  },
];

export default function SellPage() {
  return (
    <main className="page-shell min-h-screen">
      <SiteHeader />

      <section className="px-5 pb-20 pt-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-10">
          <section className="rounded-[36px] border border-black/5 bg-white/90 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
            <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr] xl:items-start">
              <div>
              <SectionIntro
                body="The seller path is designed to keep setup work lighter than traditional teacher marketplaces while preserving stronger review, payout, and listing-quality controls."
                eyebrow="Start selling"
                level="h1"
                title="Start selling without guessing how the marketplace works."
                titleClassName="max-w-3xl text-5xl leading-tight sm:text-6xl"
              />

                <div className="mt-6 grid gap-4 lg:grid-cols-3">
                  <div className="rounded-[1.5rem] bg-slate-50 p-5 text-sm leading-7 text-ink-soft">
                    <p className="font-semibold text-ink">Start with onboarding</p>
                    <p className="mt-1">
                      Finish seller onboarding first if you want payouts ready before publishing anything.
                    </p>
                  </div>
                  <div className="rounded-[1.5rem] bg-slate-50 p-5 text-sm leading-7 text-ink-soft">
                    <p className="font-semibold text-ink">Or open product creation first</p>
                    <p className="mt-1">
                      If you want to see the listing flow first, jump straight into creating a product.
                    </p>
                  </div>
                  <div className="rounded-[1.5rem] bg-slate-50 p-5 text-sm leading-7 text-ink-soft">
                    <p className="font-semibold text-ink">Next step is review and launch</p>
                    <p className="mt-1">
                      Once a listing is ready, it can move into review and eventually into the marketplace.
                    </p>
                  </div>
                </div>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-brand px-6 py-3.5 text-base font-semibold text-white transition hover:bg-brand-700"
                    href="/sell/onboarding"
                  >
                    Start seller onboarding
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-3.5 text-base font-semibold text-ink transition hover:border-slate-300"
                    href="/sell/products/new"
                  >
                    Create a product
                  </Link>
                </div>
              </div>

              <div className="rounded-[30px] bg-slate-950 p-7 text-white shadow-[0_18px_50px_rgba(15,23,42,0.18)]">
                <span className="inline-flex rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/80">
                  What to expect
                </span>
                <p className="mt-5 text-3xl font-semibold">
                  Seller setup stays simple
                </p>
                <div className="mt-5 space-y-3 text-sm text-white/80">
                  <p>Manual uploads are always available.</p>
                  <p>AI is optional and usage-capped.</p>
                  <p>Listings are built for stronger buyer trust from day one.</p>
                  <p>Stripe handles identity checks and payouts.</p>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-6 md:grid-cols-3">
            {steps.map((step, index) => (
              <article
                key={step.title}
                className="rounded-[30px] border border-black/5 bg-white p-7 shadow-[0_18px_50px_rgba(15,23,42,0.06)]"
              >
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${
                    index === 0
                      ? "bg-emerald-50 text-emerald-700"
                      : index === 1
                        ? "bg-amber-50 text-amber-700"
                        : "bg-slate-100 text-ink-soft"
                  }`}
                >
                  {index === 0 ? "Start here" : index === 1 ? "Set up next" : "Then optimize"}
                </span>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand">
                  <step.icon className="h-5 w-5" />
                </div>
                <h2 className="mt-6 text-2xl font-semibold text-ink">
                  {step.title}
                </h2>
                <p className="mt-4 text-sm leading-7 text-ink-soft">
                  {step.description}
                </p>
              </article>
            ))}
          </section>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
