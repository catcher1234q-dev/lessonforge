import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { DisclosureSummary } from "@/components/shared/disclosure-summary";
import { SectionIntro } from "@/components/shared/section-intro";
import { secondaryActionLinkClassName } from "@/components/shared/secondary-action-link";
import { canAccessAdmin, getPrivateAccessRole } from "@/lib/auth/private-access";
import { getIntegrationReadiness } from "@/lib/lessonforge/integration-readiness";
import { getPersistenceReadiness } from "@/lib/lessonforge/persistence-readiness";
import { getAdminOverview } from "@/lib/lessonforge/server-operations";

const launchFlowSteps = [
  {
    title: "Sign in with Supabase",
    detail:
      "Use the real sign-in sheet and confirm the account callback finishes cleanly without throwing you back to a public page.",
    href: "/",
    actionLabel: "Open homepage sign-in",
  },
  {
    title: "Check seller upgrade flow",
    detail:
      "Open seller onboarding or the seller dashboard, start a Basic or Pro upgrade, and confirm Stripe Checkout opens instead of a placeholder flow.",
    href: "/sell/dashboard",
    actionLabel: "Open seller dashboard",
  },
  {
    title: "Confirm webhook sync",
    detail:
      "After checkout succeeds in Stripe test mode, confirm the seller plan updates and paid tools stop behaving like Starter.",
    href: "/founder",
    actionLabel: "Open founder view",
  },
  {
    title: "Run a buyer purchase",
    detail:
      "Buy one listing in test mode and confirm the success page opens, the purchase reaches the library, and the protected download link works.",
    href: "/marketplace",
    actionLabel: "Open marketplace",
  },
  {
    title: "Check owner privacy",
    detail:
      "Verify normal visitors cannot see owner or admin tools until the correct private access code is used on that device.",
    href: "/owner-access",
    actionLabel: "Open private access",
  },
  {
    title: "Review admin queues",
    detail:
      "Open admin and founder pages and confirm the listing counts, order counts, and platform health cards look believable after the test flows.",
    href: "/admin",
    actionLabel: "Open admin view",
  },
] as const;

export default async function LaunchChecklistPage() {
  const privateAccessRole = await getPrivateAccessRole();

  if (!canAccessAdmin(privateAccessRole)) {
    return (
      <main className="page-shell min-h-screen">
        <SiteHeader />
        <section className="px-5 pb-20 pt-10 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl rounded-[36px] border border-black/5 bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
            <SectionIntro
              body="This launch checklist is private because it points directly at owner and admin review steps."
              eyebrow="Private checklist"
              level="h1"
              title="Launch checklist access is private."
              titleClassName="text-4xl leading-tight"
            />
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                className="inline-flex items-center justify-center rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
                href="/owner-access"
              >
                Open private access
              </Link>
              <Link
                className={secondaryActionLinkClassName("px-5 py-3")}
                href="/marketplace"
              >
                Open marketplace
              </Link>
            </div>
          </div>
        </section>
        <SiteFooter />
      </main>
    );
  }

  const [integrationReadiness, persistenceReadiness, adminOverview] = await Promise.all([
    getIntegrationReadiness(),
    getPersistenceReadiness(),
    getAdminOverview(),
  ]);

  const buyerIssueCount = adminOverview.openReports + adminOverview.openRefundRequests;

  return (
    <main className="page-shell min-h-screen">
      <SiteHeader />

      <section className="px-5 pb-20 pt-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-8">
          <section className="rounded-[36px] border border-black/5 bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
            <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr] xl:items-start">
              <div>
                <SectionIntro
                  body="This page turns the real launch path into a simple founder-friendly walkthrough: sign in, upgrade a seller, confirm the webhook, make a buyer purchase, then check the private dashboards."
                  eyebrow="Launch checklist"
                  level="h1"
                  title="Use this page to walk the real sign-in and payment flow."
                  titleClassName="text-5xl leading-tight"
                />
                <div className="mt-6 grid gap-4 lg:grid-cols-3">
                  <div className="rounded-[1.5rem] bg-slate-50 p-5 text-sm leading-7 text-ink-soft">
                    <p className="font-semibold text-ink">Start with readiness</p>
                    <p className="mt-1">
                      Make sure the main Supabase and Stripe checks are ready before you test the live path.
                    </p>
                  </div>
                  <div className="rounded-[1.5rem] bg-slate-50 p-5 text-sm leading-7 text-ink-soft">
                    <p className="font-semibold text-ink">Then test the flow in order</p>
                    <p className="mt-1">
                      That keeps you from chasing a later payment problem that was really an earlier sign-in problem.
                    </p>
                  </div>
                  <div className="rounded-[1.5rem] bg-slate-50 p-5 text-sm leading-7 text-ink-soft">
                    <p className="font-semibold text-ink">Finish with the dashboards</p>
                    <p className="mt-1">
                      Founder and admin pages should confirm the platform numbers still make sense after the test run.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-[30px] bg-slate-950 p-7 text-white">
                <p className="text-sm uppercase tracking-[0.2em] text-white/60">
                  Quick status
                </p>
                <p className="mt-5 text-3xl font-semibold">
                  {integrationReadiness.readyCount} of {integrationReadiness.totalCount} live-flow checks ready
                </p>
                <p className="mt-4 text-sm leading-7 text-white/70">
                  {integrationReadiness.summary}
                </p>
              </div>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-[28px] border border-black/5 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
              <p className="text-sm text-ink-soft">Integration checks ready</p>
              <p className="mt-2 text-4xl font-semibold text-ink">
                {integrationReadiness.readyCount}/{integrationReadiness.totalCount}
              </p>
              <p className="mt-3 text-sm leading-6 text-ink-soft">
                Supabase, Stripe, seller billing, webhooks, and return URLs.
              </p>
            </article>
            <article className="rounded-[28px] border border-black/5 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
              <p className="text-sm text-ink-soft">Persistence status</p>
              <p className="mt-2 text-4xl font-semibold text-ink">
                {persistenceReadiness.persistenceStatus.label}
              </p>
              <p className="mt-3 text-sm leading-6 text-ink-soft">
                {persistenceReadiness.founderSummary}
              </p>
            </article>
            <article className="rounded-[28px] border border-black/5 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
              <p className="text-sm text-ink-soft">Published listings</p>
              <p className="mt-2 text-4xl font-semibold text-ink">{adminOverview.publishedProducts}</p>
              <p className="mt-3 text-sm leading-6 text-ink-soft">
                Public listings that should be usable for the buyer purchase test.
              </p>
            </article>
            <article className="rounded-[28px] border border-black/5 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
              <p className="text-sm text-ink-soft">Open buyer issues</p>
              <p className="mt-2 text-4xl font-semibold text-ink">{buyerIssueCount}</p>
              <p className="mt-3 text-sm leading-6 text-ink-soft">
                Good to review after the purchase test so you know the platform still feels stable.
              </p>
            </article>
          </section>

          <section className="rounded-[32px] border border-black/5 bg-white p-8 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
            <h2 className="text-2xl font-semibold text-ink">Live-flow checklist</h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-ink-soft">
              Work through these in order. If one step breaks, fix that before trusting anything later in the chain.
            </p>
            <div className="mt-6 grid gap-4">
              {launchFlowSteps.map((step, index) => (
                <article
                  key={step.title}
                  className="rounded-[24px] border border-slate-200 bg-slate-50 px-5 py-5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="max-w-3xl">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
                        Step {index + 1}
                      </p>
                      <h3 className="mt-2 text-xl font-semibold text-ink">{step.title}</h3>
                      <p className="mt-2 text-sm leading-7 text-ink-soft">{step.detail}</p>
                    </div>
                    <Link
                      className={secondaryActionLinkClassName("px-5 py-3")}
                      href={step.href}
                    >
                      {step.actionLabel}
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <details className="rounded-[30px] border border-black/5 bg-white p-7 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
              <DisclosureSummary
                actionLabel="Open checks"
                body="Use this to confirm the core integrations are configured before spending time on the manual flow."
                eyebrow="Readiness detail"
                meta={`${integrationReadiness.readyCount}/${integrationReadiness.totalCount} ready`}
                title="Integration checklist"
              />
              <div className="mt-6 grid gap-4">
                {integrationReadiness.probes.map((probe) => (
                  <article
                    key={probe.key}
                    className={`rounded-[22px] border px-5 py-4 ${
                      probe.ready
                        ? "border-emerald-100 bg-emerald-50/70"
                        : "border-amber-100 bg-amber-50/70"
                    }`}
                  >
                    <p className="text-sm font-semibold text-ink">{probe.label}</p>
                    <p className="mt-2 text-sm leading-6 text-ink-soft">{probe.detail}</p>
                  </article>
                ))}
              </div>
            </details>

            <details className="rounded-[30px] border border-black/5 bg-white p-7 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
              <DisclosureSummary
                actionLabel="Open notes"
                body="This keeps the technical setup summary in plain language so you know whether the app is still using fallback behavior."
                eyebrow="Persistence detail"
                meta={persistenceReadiness.persistenceStatus.label}
                title="Database and storage notes"
              />
              <div className="mt-6 space-y-4 text-sm leading-7 text-ink-soft">
                <p>{persistenceReadiness.persistenceStatus.detail}</p>
                <p>{persistenceReadiness.cutoverReport.summary}</p>
                <div className="rounded-[22px] bg-slate-50 px-5 py-4">
                  <p className="font-semibold text-ink">Best next move</p>
                  <p className="mt-1">
                    If the integration checks are ready, run the manual flow above. If not, finish the missing env setup first so the results mean something.
                  </p>
                </div>
              </div>
            </details>
          </section>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
