import type { Metadata } from "next";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { FAQPreview } from "@/components/marketing/faq-preview";
import { PricingPreview } from "@/components/marketing/pricing-preview";
import { SectionIntro } from "@/components/shared/section-intro";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Pricing",
  description:
    "Review LessonForgeHub seller plans, revenue splits, and digital marketplace pricing in one place.",
  path: "/pricing",
});

export default function PricingPage() {
  return (
    <main className="page-shell min-h-screen">
      <SiteHeader />

      <section className="px-5 pb-20 pt-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-8">
          <section className="rounded-[36px] border border-black/5 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:p-8">
            <SectionIntro
              eyebrow="Pricing"
              level="h1"
              title="Simple seller plans for a digital teacher marketplace."
              titleClassName="text-4xl leading-tight sm:text-5xl"
              body="LessonForgeHub sells digital educational resources. Sellers choose a monthly plan, upload original materials they own or have rights to sell, and receive buyer payments through the platform after a confirmed purchase."
            />
            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              <div className="rounded-[1.5rem] bg-slate-50 p-5 text-sm leading-7 text-ink-soft">
                <p className="font-semibold text-ink">Digital delivery</p>
                <p className="mt-1">
                  Buyers receive digital library access after a confirmed purchase. There is no physical shipping.
                </p>
              </div>
              <div className="rounded-[1.5rem] bg-slate-50 p-5 text-sm leading-7 text-ink-soft">
                <p className="font-semibold text-ink">Plain revenue splits</p>
                <p className="mt-1">
                  Each plan clearly shows how much the seller keeps from each sale and how many AI credits are included.
                </p>
              </div>
              <div className="rounded-[1.5rem] bg-slate-50 p-5 text-sm leading-7 text-ink-soft">
                <p className="font-semibold text-ink">Support and policy links</p>
                <p className="mt-1">
                  Review refund, seller, privacy, and support policies before launch or before you start selling.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-[36px] border border-black/5 bg-white p-2 shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:p-4">
            <PricingPreview />
          </section>

          <section className="rounded-[30px] border border-amber-100 bg-amber-50 p-6 text-sm leading-7 text-amber-950 shadow-[0_18px_50px_rgba(15,23,42,0.05)] sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700">
              Before sellers publish
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-ink">
              Sellers still review every listing before it goes live.
            </h2>
            <div className="mt-4 grid gap-3 lg:grid-cols-3">
              <p className="rounded-[1.15rem] border border-amber-100 bg-white/75 px-4 py-3">
                Sellers must only upload content they created or have rights to sell.
              </p>
              <p className="rounded-[1.15rem] border border-amber-100 bg-white/75 px-4 py-3">
                Digital purchases are generally final after delivery unless there is an access, broken file, misleading listing, duplicate charge, or legal issue.
              </p>
              <p className="rounded-[1.15rem] border border-amber-100 bg-white/75 px-4 py-3">
                Support is available at support@lessonforgehub.com for buyer, seller, and policy questions.
              </p>
            </div>
          </section>

          <FAQPreview />
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
