import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { SectionIntro } from "@/components/shared/section-intro";
import { secondaryActionLinkClassName } from "@/components/shared/secondary-action-link";
import { getIntegrationReadiness } from "@/lib/lessonforge/integration-readiness";
import { getPersistenceReadiness } from "@/lib/lessonforge/persistence-readiness";

export default async function LiveReadinessPage() {
  const [integrationReadiness, persistenceReadiness] = await Promise.all([
    getIntegrationReadiness(),
    getPersistenceReadiness(),
  ]);

  const readyProbes = integrationReadiness.probes.filter((probe) => probe.ready);
  const blockedProbes = integrationReadiness.probes.filter((probe) => !probe.ready);

  return (
    <main className="page-shell min-h-screen">
      <SiteHeader />

      <section className="px-5 pb-20 pt-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-8">
          <section className="rounded-[36px] border border-black/5 bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
            <SectionIntro
              body="This page explains what already works on LessonForge right now and what is still waiting on real Supabase, Stripe, or database setup."
              eyebrow="Live readiness"
              level="h1"
              title="What you can trust now, and what still needs setup."
              titleClassName="text-5xl leading-tight"
            />
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                className="inline-flex items-center justify-center rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
                href="/marketplace"
              >
                Open marketplace
              </Link>
              <Link
                className={secondaryActionLinkClassName("px-5 py-3")}
                href="/launch-checklist"
              >
                Open launch checklist
              </Link>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-[28px] border border-black/5 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
              <p className="text-sm text-ink-soft">Integration checks ready</p>
              <p className="mt-2 text-4xl font-semibold text-ink">
                {integrationReadiness.readyCount}/{integrationReadiness.totalCount}
              </p>
              <p className="mt-3 text-sm leading-6 text-ink-soft">
                Sign-in, Stripe, webhook, billing, and hosted callback setup.
              </p>
            </article>
            <article className="rounded-[28px] border border-black/5 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
              <p className="text-sm text-ink-soft">Readiness summary</p>
              <p className="mt-2 text-2xl font-semibold text-ink">{integrationReadiness.summary}</p>
              <p className="mt-3 text-sm leading-6 text-ink-soft">
                Use this as the quick answer to whether the live money path is fully wired yet.
              </p>
            </article>
            <article className="rounded-[28px] border border-black/5 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
              <p className="text-sm text-ink-soft">Persistence mode</p>
              <p className="mt-2 text-3xl font-semibold text-ink">
                {persistenceReadiness.persistenceStatus.label}
              </p>
              <p className="mt-3 text-sm leading-6 text-ink-soft">
                {persistenceReadiness.persistenceStatus.detail}
              </p>
            </article>
            <article className="rounded-[28px] border border-black/5 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
              <p className="text-sm text-ink-soft">Best next move</p>
              <p className="mt-2 text-2xl font-semibold text-ink">
                {blockedProbes.length > 0 ? "Finish setup blockers" : "Run live test mode"}
              </p>
              <p className="mt-3 text-sm leading-6 text-ink-soft">
                {blockedProbes.length > 0
                  ? "The main remaining work is environment setup, not a redesign."
                  : "The app is ready for real test-mode sign-in and payment validation."}
              </p>
            </article>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <article className="rounded-[30px] border border-emerald-100 bg-emerald-50/80 p-7 shadow-[0_18px_50px_rgba(16,185,129,0.08)]">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
                Working now
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-ink">
                These parts can be reviewed without waiting on more keys.
              </h2>
              <ul className="mt-5 space-y-2 text-sm leading-7 text-ink-soft">
                <li>Homepage and marketplace browsing</li>
                <li>Product pages and pricing presentation</li>
                <li>Seller onboarding and dashboard wording review</li>
                <li>Admin and owner privacy review</li>
                <li>Anonymous protection on checkout and delivery routes</li>
                <li>Current integration checks that are already configured below</li>
              </ul>
              <div className="mt-5 rounded-[22px] bg-white/80 px-5 py-4">
                <p className="font-semibold text-ink">Configured checks</p>
                <ul className="mt-3 space-y-2 text-sm leading-7 text-ink-soft">
                  {readyProbes.length > 0 ? (
                    readyProbes.map((probe) => (
                      <li key={probe.key}>
                        <span className="font-semibold text-ink">{probe.label}:</span>{" "}
                        {probe.detail}
                      </li>
                    ))
                  ) : (
                    <li>Live integrations are still in setup, so keep this review focused on product experience and access protection.</li>
                  )}
                </ul>
              </div>
            </article>

            <article className="rounded-[30px] border border-amber-100 bg-amber-50/80 p-7 shadow-[0_18px_50px_rgba(245,158,11,0.10)]">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-700">
                Still blocked by setup
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-ink">
                These areas need real external configuration before they can be trusted end to end.
              </h2>
              <ul className="mt-5 space-y-2 text-sm leading-7 text-ink-soft">
                {blockedProbes.map((probe) => (
                  <li key={probe.key}>
                    <span className="font-semibold text-ink">{probe.label}:</span> {probe.detail}
                  </li>
                ))}
              </ul>
              <div className="mt-5 rounded-[22px] bg-white/80 px-5 py-4 text-sm leading-7 text-ink-soft">
                <p className="font-semibold text-ink">Database note</p>
                <p className="mt-1">{persistenceReadiness.founderSummary}</p>
              </div>
            </article>
          </section>

          <section className="rounded-[32px] border border-black/5 bg-white p-8 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
            <h2 className="text-2xl font-semibold text-ink">Exact setup still needed</h2>
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <div className="rounded-[24px] bg-slate-50 px-5 py-5">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
                  Supabase
                </p>
                <ul className="mt-3 space-y-2 text-sm leading-7 text-ink-soft">
                  <li>`NEXT_PUBLIC_SUPABASE_URL`</li>
                  <li>`NEXT_PUBLIC_SUPABASE_ANON_KEY`</li>
                  <li>`SUPABASE_SERVICE_ROLE_KEY`</li>
                  <li>`NEXT_PUBLIC_SITE_URL`</li>
                  <li>`LESSONFORGE_ACCESS_COOKIE_SECRET`</li>
                </ul>
              </div>
              <div className="rounded-[24px] bg-slate-50 px-5 py-5">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
                  Stripe
                </p>
                <ul className="mt-3 space-y-2 text-sm leading-7 text-ink-soft">
                  <li>`STRIPE_SECRET_KEY`</li>
                  <li>`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`</li>
                  <li>`STRIPE_WEBHOOK_SECRET`</li>
                  <li>`STRIPE_PRICE_SELLER_BASIC_MONTHLY`</li>
                  <li>`STRIPE_PRICE_SELLER_PRO_MONTHLY`</li>
                  <li>`STRIPE_CONNECT_WEBHOOK_SECRET`</li>
                </ul>
              </div>
            </div>
          </section>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
