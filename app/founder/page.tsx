import type { Metadata } from "next";

import Link from "next/link";

import { CutoverSummaryCard } from "@/components/admin/cutover-summary-card";
import { PersistenceStatusClient } from "@/components/admin/persistence-status-client";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { DisclosureSummary } from "@/components/shared/disclosure-summary";
import { SectionIntro } from "@/components/shared/section-intro";
import { secondaryActionLinkClassName } from "@/components/shared/secondary-action-link";
import { getOwnerAccessContext } from "@/lib/auth/owner-access";
import { featureFlags } from "@/lib/config/feature-flags";
import { normalizePlanKey, planConfig } from "@/lib/config/plans";
import { siteConfig } from "@/lib/config/site";
import { listPrivateFeedback } from "@/lib/lessonforge/data-access";
import { getIntegrationReadiness } from "@/lib/lessonforge/integration-readiness";
import { getAdminOverview } from "@/lib/lessonforge/server-operations";
import { getPersistenceReadiness } from "@/lib/lessonforge/persistence-readiness";
import { buildNoIndexMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildNoIndexMetadata(
  "Founder",
  "Private LessonForgeHub founder controls and launch readiness area.",
);

function formatBoolean(value: boolean) {
  return value ? "On" : "Off";
}

function formatFeedbackDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function FounderPage() {
  const ownerAccess = await getOwnerAccessContext();

  if (!ownerAccess.isOwner) {
    return (
      <main className="page-shell min-h-screen">
        <SiteHeader />
        <section className="px-5 pb-20 pt-10 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl rounded-[36px] border border-black/5 bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
            <SectionIntro
              body="Owner tools are only available to the signed-in owner account configured for this site."
              eyebrow="Private owner area"
              level="h1"
              title="Owner access is private."
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
                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:border-slate-300"
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

  const [adminOverview, persistenceReadiness, integrationReadiness, privateFeedback] = await Promise.all([
    getAdminOverview(),
    getPersistenceReadiness(),
    getIntegrationReadiness(),
    listPrivateFeedback(),
  ]);
  const launchReadyListings = adminOverview.persistedProducts.filter(
    (product) =>
      product.productStatus === "Published" &&
      product.previewIncluded &&
      product.thumbnailIncluded &&
      product.rightsConfirmed,
  ).length;
  const friction = {
    needsPreview: adminOverview.persistedProducts.filter((product) => !product.previewIncluded)
      .length,
    needsThumbnail: adminOverview.persistedProducts.filter(
      (product) => !product.thumbnailIncluded,
    ).length,
    needsRights: adminOverview.persistedProducts.filter((product) => !product.rightsConfirmed)
      .length,
    moderationBlocked: adminOverview.persistedProducts.filter(
      (product) =>
        product.productStatus === "Pending review" ||
        product.productStatus === "Flagged" ||
        product.productStatus === "Rejected",
    ).length,
  };
  const nextReviewItems = [
    friction.needsPreview > 0
      ? `${friction.needsPreview} listing${friction.needsPreview === 1 ? "" : "s"} still need preview pages.`
      : null,
    friction.needsThumbnail > 0
      ? `${friction.needsThumbnail} listing${friction.needsThumbnail === 1 ? "" : "s"} still need thumbnails.`
      : null,
    friction.needsRights > 0
      ? `${friction.needsRights} listing${friction.needsRights === 1 ? "" : "s"} still need rights confirmation.`
      : null,
    adminOverview.openRefundRequests > 0
      ? `${adminOverview.openRefundRequests} refund request${adminOverview.openRefundRequests === 1 ? "" : "s"} are still open.`
      : null,
    adminOverview.openReports > 0
      ? `${adminOverview.openReports} buyer report${adminOverview.openReports === 1 ? "" : "s"} still need triage.`
      : null,
  ].filter(Boolean) as string[];

  return (
    <main className="page-shell min-h-screen">
      <SiteHeader />

      <section className="px-5 pb-20 pt-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-8">
          <section className="rounded-[36px] border border-black/5 bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
            <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr] xl:items-start">
              <div>
                <SectionIntro
                  body="This is the founder-friendly checkpoint for the current build. It keeps launch readiness, friction, and product health in plain language so you do not have to start inside the full admin controls."
                  eyebrow="Owner View"
                  level="h1"
                  title={`${siteConfig.productName} marketplace health at a glance`}
                  titleClassName="max-w-4xl leading-tight"
                />
                <div className="mt-6 grid gap-4 lg:grid-cols-3">
                  <div className="rounded-[1.5rem] bg-slate-50 p-5 text-sm leading-7 text-ink-soft">
                    <p className="font-semibold text-ink">Start with launch readiness</p>
                    <p className="mt-1">
                      Check how much of the catalog is truly buyer-ready right now.
                    </p>
                  </div>
                  <div className="rounded-[1.5rem] bg-slate-50 p-5 text-sm leading-7 text-ink-soft">
                    <p className="font-semibold text-ink">Then review friction</p>
                    <p className="mt-1">
                      Use moderation, preview, thumbnail, and rights counts to see what is slowing launch momentum down.
                    </p>
                  </div>
                  <div className="rounded-[1.5rem] bg-slate-50 p-5 text-sm leading-7 text-ink-soft">
                    <p className="font-semibold text-ink">Only open deeper controls if needed</p>
                    <p className="mt-1">
                      Use admin and seller links when you need the exact listings or workflows behind these numbers.
                    </p>
                  </div>
                </div>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    className="inline-flex items-center justify-center rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
                    href="/admin"
                  >
                    Open moderation dashboard
                  </Link>
                  <Link
                    className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:border-slate-300"
                    href="/founder/operations"
                  >
                    Open monitoring dashboard
                  </Link>
                  <Link
                    className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:border-slate-300"
                    href="/marketplace"
                  >
                    Back to storefront
                  </Link>
                  <Link
                    className={secondaryActionLinkClassName()}
                    href="/account"
                  >
                    Open account view
                  </Link>
                </div>
              </div>

              <div className="rounded-[30px] bg-slate-950 p-7 text-white">
                <p className="text-sm uppercase tracking-[0.2em] text-white/60">
                  Founder quick read
                </p>
                <p className="mt-5 text-3xl font-semibold">
                  {launchReadyListings > 0 ? "Catalog is partly buyer-ready" : "Catalog still needs launch work"}
                </p>
                <p className="mt-4 text-sm leading-7 text-white/70">
                  {launchReadyListings > 0
                    ? "Use the cards below to judge whether launch-ready listings outweigh the remaining moderation and asset friction."
                    : "Use the cards below to see whether moderation or seller setup gaps are the main reason launch still feels blocked."}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-[32px] border border-black/5 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-8">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">
                  Feedback inbox
                </p>
                <h2 className="mt-3 text-3xl font-semibold text-ink">
                  Private user feedback for the owner.
                </h2>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-soft">
                  These notes are private. They are not public reviews, ratings, testimonials, seller scores, payout signals, or ranking inputs.
                </p>
              </div>
              <Link
                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:border-slate-300"
                href="/feedback?source=founder_preview"
              >
                Open feedback form
              </Link>
            </div>

            <div className="mt-6 grid gap-4">
              {privateFeedback.length ? (
                privateFeedback.slice(0, 8).map((feedback) => (
                  <article
                    key={feedback.id}
                    className="rounded-[1.35rem] border border-ink/5 bg-surface-subtle px-5 py-4"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-ink">
                          {feedback.rating ?? "No quick rating"}
                        </p>
                        <p className="mt-1 text-xs uppercase tracking-[0.16em] text-ink-muted">
                          {formatFeedbackDate(feedback.createdAt)}
                          {feedback.source ? ` · ${feedback.source}` : ""}
                          {feedback.pageContext ? ` · ${feedback.pageContext}` : ""}
                        </p>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink-soft">
                        {feedback.signedIn ? feedback.userRole ?? "signed in" : "anonymous"}
                      </span>
                    </div>
                    {feedback.confusingText ? (
                      <div className="mt-4 rounded-[1rem] bg-white px-4 py-3 text-sm leading-6 text-ink-soft">
                        <p className="font-semibold text-ink">Confusing or frustrating</p>
                        <p className="mt-1">{feedback.confusingText}</p>
                      </div>
                    ) : null}
                    {feedback.improvementText ? (
                      <div className="mt-3 rounded-[1rem] bg-white px-4 py-3 text-sm leading-6 text-ink-soft">
                        <p className="font-semibold text-ink">Suggested improvement</p>
                        <p className="mt-1">{feedback.improvementText}</p>
                      </div>
                    ) : null}
                    {(feedback.contact || feedback.userEmail) ? (
                      <p className="mt-3 text-sm leading-6 text-ink-soft">
                        Contact: {feedback.contact || feedback.userEmail}
                      </p>
                    ) : null}
                  </article>
                ))
              ) : (
                <div className="rounded-[1.35rem] border border-dashed border-slate-300 bg-slate-50 px-5 py-5 text-sm leading-6 text-ink-soft">
                  No private feedback has been submitted yet. When users send feedback, newest notes will appear here first.
                </div>
              )}
            </div>
          </section>

          <section className="rounded-[32px] border border-black/5 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-8">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">
                  Owner controls
                </p>
                <h2 className="mt-3 text-3xl font-semibold text-ink">
                  Open moderation and platform controls
                </h2>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-soft">
                  Use the admin workspace to review reports, hide or remove listings, resolve refund issues, and adjust AI or maintenance controls.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  className="inline-flex items-center justify-center rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
                  href="/admin"
                >
                  Open moderation dashboard
                </Link>
                <Link
                  className={secondaryActionLinkClassName()}
                  href="/launch-checklist"
                >
                  Open launch checklist
                </Link>
              </div>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-[28px] border border-black/5 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
              <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
                Start here
              </span>
              <p className="text-sm text-ink-soft">Launch-ready listings</p>
              <p className="mt-2 text-4xl font-semibold text-ink">{launchReadyListings}</p>
              <p className="mt-3 text-sm leading-6 text-ink-soft">
                Published listings with preview, thumbnail, and rights confirmation all in place.
              </p>
              <p className="mt-4 rounded-[1rem] bg-slate-50 px-4 py-3 text-sm leading-6 text-ink-soft">
                Read this first if you want the quickest signal for launch readiness.
              </p>
              <p className="mt-3 rounded-[1rem] border border-emerald-100 bg-emerald-50/70 px-4 py-3 text-sm leading-6 text-emerald-900">
                Next move: {launchReadyListings > 0
                  ? "Review the marketplace itself to see whether these launch-ready listings feel trustworthy enough for buyers."
                  : "Focus on seller friction and moderation below, because the catalog is not launch-ready yet."}
              </p>
            </article>
            <article className="rounded-[28px] border border-black/5 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
              <span className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-700">
                Watch next
              </span>
              <p className="text-sm text-ink-soft">Moderation attention</p>
              <p className="mt-2 text-4xl font-semibold text-ink">{friction.moderationBlocked}</p>
              <p className="mt-3 text-sm leading-6 text-ink-soft">
                Listings currently held up by pending review, flags, or rejection.
              </p>
              <p className="mt-4 rounded-[1rem] bg-slate-50 px-4 py-3 text-sm leading-6 text-ink-soft">
                Use this to judge how much launch drag is coming from moderation pressure.
              </p>
              <p className="mt-3 rounded-[1rem] border border-amber-100 bg-amber-50/70 px-4 py-3 text-sm leading-6 text-amber-900">
                Next move: {friction.moderationBlocked > 0
                  ? "Open the admin dashboard and inspect which listings are blocked, flagged, or rejected right now."
                  : "Moderation pressure is light, so keep your attention on asset friction and buyer experience instead."}
              </p>
            </article>
            <article className="rounded-[28px] border border-black/5 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
              <span className="inline-flex rounded-full bg-rose-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-rose-700">
                Buyer risk
              </span>
              <p className="text-sm text-ink-soft">Open buyer issues</p>
              <p className="mt-2 text-4xl font-semibold text-ink">
                {adminOverview.openReports + adminOverview.openRefundRequests}
              </p>
              <p className="mt-3 text-sm leading-6 text-ink-soft">
                Combined open reports and refund requests that still need marketplace attention.
              </p>
              <p className="mt-4 rounded-[1rem] bg-slate-50 px-4 py-3 text-sm leading-6 text-ink-soft">
                This is the fastest view of unresolved buyer-facing risk.
              </p>
              <p className="mt-3 rounded-[1rem] border border-rose-100 bg-rose-50/70 px-4 py-3 text-sm leading-6 text-rose-900">
                Next move: {adminOverview.openReports + adminOverview.openRefundRequests > 0
                  ? "Review admin refund and report queues before treating the marketplace as stable for launch."
                  : "Buyer risk looks relatively quiet, so the next review should focus on product polish and conversion trust."}
              </p>
            </article>
            <article className="rounded-[28px] border border-black/5 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
              <span className="inline-flex rounded-full bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700">
                Platform status
              </span>
              <p className="text-sm text-ink-soft">AI guardrail status</p>
              <p className="mt-2 text-4xl font-semibold text-ink">
                {adminOverview.aiKillSwitchEnabled ? "Paused" : "Available"}
              </p>
              <p className="mt-3 text-sm leading-6 text-ink-soft">
                Current owner-controlled AI availability across the seller experience.
              </p>
              <p className="mt-4 rounded-[1rem] bg-slate-50 px-4 py-3 text-sm leading-6 text-ink-soft">
                This matters most when platform risk or AI cost pressure starts rising.
              </p>
              <p className="mt-3 rounded-[1rem] border border-sky-100 bg-sky-50/70 px-4 py-3 text-sm leading-6 text-sky-900">
                Next move: {adminOverview.aiKillSwitchEnabled
                  ? "Confirm whether AI should stay paused, then review the seller experience without AI assistance."
                  : "AI is available, so only revisit this if costs, output quality, or launch risk begin to climb."}
              </p>
            </article>
          </section>

          <section className="rounded-[30px] border border-black/5 bg-white p-8 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-ink">Real integration status</h2>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-ink-soft">
                  {integrationReadiness.summary}
                </p>
              </div>
              <p className="rounded-full bg-slate-50 px-4 py-2 text-sm font-medium text-ink-soft">
                {integrationReadiness.readyCount} of {integrationReadiness.totalCount} checks ready
              </p>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {integrationReadiness.probes.map((probe) => (
                <article
                  key={probe.key}
                  className={`rounded-[24px] border px-5 py-4 ${
                    probe.ready
                      ? "border-emerald-100 bg-emerald-50/70"
                      : "border-amber-100 bg-amber-50/70"
                  }`}
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-soft">
                    {probe.label}
                  </p>
                  <p className="mt-2 text-lg font-semibold text-ink">
                    {probe.ready ? "Ready" : "Needs setup"}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-ink-soft">{probe.detail}</p>
                </article>
              ))}
            </div>
            <div className="mt-6">
              <Link
                className="inline-flex items-center justify-center rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
                href="/launch-checklist"
              >
                Open launch checklist
              </Link>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <article className="rounded-[30px] border border-black/5 bg-white p-7 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
              <h2 className="text-2xl font-semibold text-ink">Seller upgrade pressure</h2>
              <p className="mt-3 text-sm leading-7 text-ink-soft">
                This is the founder version of monetization health: are sellers proving enough demand, or hitting enough plan limits, that upgrades should start happening naturally?
              </p>
              <p className="mt-5 rounded-[1rem] bg-slate-50 px-4 py-3 text-sm leading-6 text-ink-soft">
                {adminOverview.monetizationRead}
              </p>
              <p className="mt-3 rounded-[1rem] border border-ink/5 bg-white px-4 py-3 text-sm leading-6 text-ink-soft">
                Main upgrade trigger right now:{" "}
                <span className="font-semibold text-ink">
                  {adminOverview.primaryUpgradeTrigger.label}
                </span>
                . {adminOverview.primaryUpgradeTrigger.detail}
              </p>
              <p className="mt-3 rounded-[1rem] border border-ink/5 bg-white px-4 py-3 text-sm leading-6 text-ink-soft">
                {adminOverview.recentUpgradePressureRead}
              </p>
              <p className="mt-3 rounded-[1rem] border border-ink/5 bg-white px-4 py-3 text-sm leading-6 text-ink-soft">
                {adminOverview.conversionGapRead}
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[1rem] bg-slate-50 px-4 py-4 text-sm text-ink-soft">
                  Paid conversion score
                  <p className="mt-1 text-2xl font-semibold text-ink">
                    {adminOverview.conversionGapSummary.conversionScorePercent}%
                  </p>
                  <p className="mt-1">{adminOverview.conversionScoreLabel}</p>
                </div>
                <div className="rounded-[1rem] bg-slate-50 px-4 py-4 text-sm text-ink-soft">
                  Starter sellers ready to upgrade
                  <p className="mt-1 text-2xl font-semibold text-ink">
                    {adminOverview.monetizationSummary.starterSellersReadyToUpgrade}
                  </p>
                </div>
                <div className="rounded-[1rem] bg-slate-50 px-4 py-4 text-sm text-ink-soft">
                  Upgrade clicks
                  <p className="mt-1 text-2xl font-semibold text-ink">
                    {adminOverview.monetizationSummary.upgradeClicks}
                  </p>
                </div>
                <div className="rounded-[1rem] bg-slate-50 px-4 py-4 text-sm text-ink-soft">
                  Legacy listing prompts
                  <p className="mt-1 text-2xl font-semibold text-ink">
                    {adminOverview.monetizationSummary.listingLimitHits}
                  </p>
                </div>
                <div className="rounded-[1rem] bg-slate-50 px-4 py-4 text-sm text-ink-soft">
                  AI credit limit hits
                  <p className="mt-1 text-2xl font-semibold text-ink">
                    {adminOverview.monetizationSummary.aiCreditLimitHits}
                  </p>
                </div>
              </div>
              <div className="mt-5 rounded-[1rem] bg-slate-50 px-4 py-4">
                <p className="text-sm font-semibold text-ink">Who to watch</p>
                <div className="mt-3 space-y-3">
                  {adminOverview.monetizationSummary.sellerWatchlist.length ? (
                    adminOverview.monetizationSummary.sellerWatchlist.slice(0, 3).map((seller) => (
                      <div key={seller.sellerId} className="rounded-[1rem] bg-white px-4 py-4 text-sm leading-6 text-ink-soft">
                        <p className="font-semibold text-ink">{seller.sellerName}</p>
                        <p className="mt-1">{seller.sellerEmail}</p>
                        <p className="mt-2">
                          {seller.storefrontTrustLabel} · {seller.publishedListingCount} published listing
                          {seller.publishedListingCount === 1 ? "" : "s"}
                          {seller.totalReviewCount > 0
                            ? ` · ${seller.averageRating} average rating`
                            : ""}
                        </p>
                        <p className="mt-2">
                          Gross sales{" "}
                          {seller.grossSalesCents.toLocaleString("en-US", {
                            style: "currency",
                            currency: "USD",
                            maximumFractionDigits: 0,
                          })}
                          {" "}· about{" "}
                          {seller.extraKeepOnBasicCents.toLocaleString("en-US", {
                            style: "currency",
                            currency: "USD",
                            maximumFractionDigits: 0,
                          })}
                          {" "}more kept on Basic
                        </p>
                        <p className="mt-2">
                          Recommended next plan:{" "}
                          <span className="font-semibold text-ink">
                            {planConfig[normalizePlanKey(seller.recommendedNextPlan)].label}
                          </span>
                        </p>
                        <p className="mt-1">
                          {seller.latestTriggerLabel}
                        </p>
                        <p className="mt-1">{seller.recommendationReason}</p>
                        <div className="mt-3 flex flex-wrap gap-3">
                          <Link
                            className={secondaryActionLinkClassName()}
                            href={`/store/${seller.sellerId}`}
                          >
                            Open storefront
                          </Link>
                          <Link
                            className={secondaryActionLinkClassName()}
                            href="/#pricing"
                          >
                            Review {planConfig[normalizePlanKey(seller.recommendedNextPlan)].label}
                          </Link>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm leading-6 text-ink-soft">
                      No individual Starter sellers have enough traction yet to show here.
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-5 rounded-[1rem] border border-ink/5 bg-surface-subtle px-4 py-4 text-sm leading-6 text-ink-soft">
                <p className="font-semibold text-ink">Best next move</p>
                <p className="mt-1">
                  {adminOverview.monetizationSummary.starterSellersReadyToUpgrade > 0
                    ? "Review the seller dashboard and pricing experience to make sure the paid-plan jump feels obvious and worth it for sellers who already proved demand."
                    : "Upgrade pressure still looks light, so focus more on seller activation and first sales before expecting subscriptions to carry real momentum."}
                </p>
              </div>
            </article>

            <article className="rounded-[30px] border border-black/5 bg-white p-7 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
              <h2 className="text-2xl font-semibold text-ink">What to review next</h2>
              <div className="mt-5 space-y-3 text-sm leading-7 text-ink-soft">
                {nextReviewItems.length ? (
                  nextReviewItems.map((item) => (
                    <div
                      key={item}
                      className="rounded-[1rem] bg-slate-50 px-4 py-4"
                    >
                      {item}
                    </div>
                  ))
                ) : (
                  <div className="rounded-[1rem] bg-slate-50 px-4 py-4">
                    The current marketplace is in a relatively healthy state. The next founder review should focus on product polish, seller flow clarity, and whether the trust signals feel strong enough for launch.
                  </div>
                )}
              </div>
              <div className="mt-5 rounded-[1rem] border border-ink/5 bg-surface-subtle px-4 py-4 text-sm leading-6 text-ink-soft">
                <p className="font-semibold text-ink">Best next move</p>
                <p className="mt-1">
                  {nextReviewItems.length
                    ? "Open the admin dashboard if you need exact operational causes, or open the marketplace if you want to judge whether the buyer-facing experience still feels launch-ready."
                    : "The urgent issues are relatively calm, so the next founder pass should be a live buyer-experience review rather than another operations check."}
                </p>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  className="inline-flex rounded-full bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
                  href="/admin"
                >
                  Open admin dashboard
                </Link>
                <Link
                  className={secondaryActionLinkClassName()}
                  href="/marketplace"
                >
                  Review marketplace
                </Link>
                <Link
                  className={secondaryActionLinkClassName()}
                  href="/sell/dashboard"
                >
                  Review seller dashboard
                </Link>
                <Link
                  className={secondaryActionLinkClassName()}
                  href="/api-reference"
                >
                  Review API reference
                </Link>
              </div>
            </article>

            <article className="rounded-[30px] border border-black/5 bg-white p-7 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
              <h2 className="text-2xl font-semibold text-ink">Current friction points</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[1rem] bg-slate-50 px-4 py-4 text-sm text-ink-soft">
                  Need preview
                  <p className="mt-1 text-2xl font-semibold text-ink">{friction.needsPreview}</p>
                </div>
                <div className="rounded-[1rem] bg-slate-50 px-4 py-4 text-sm text-ink-soft">
                  Need thumbnail
                  <p className="mt-1 text-2xl font-semibold text-ink">{friction.needsThumbnail}</p>
                </div>
                <div className="rounded-[1rem] bg-slate-50 px-4 py-4 text-sm text-ink-soft">
                  Need rights check
                  <p className="mt-1 text-2xl font-semibold text-ink">{friction.needsRights}</p>
                </div>
                <div className="rounded-[1rem] bg-slate-50 px-4 py-4 text-sm text-ink-soft">
                  Published listings
                  <p className="mt-1 text-2xl font-semibold text-ink">{adminOverview.publishedProducts}</p>
                </div>
              </div>
              <p className="mt-5 text-sm leading-7 text-ink-soft">
                Right now the most important founder question is whether seller friction is coming more from listing asset setup or from moderation. That is the clearest lever for improving launch readiness.
              </p>
              <div className="mt-5 rounded-[1rem] border border-ink/5 bg-surface-subtle px-4 py-4 text-sm leading-6 text-ink-soft">
                <p className="font-semibold text-ink">Best next move</p>
                <p className="mt-1">
                  {friction.needsPreview >= friction.needsThumbnail && friction.needsPreview >= friction.needsRights
                    ? "Preview creation is the biggest drag right now, so the seller workflow should keep steering people to preview fixes first."
                    : friction.needsThumbnail >= friction.needsRights
                      ? "Thumbnail readiness is the biggest drag right now, so seller listing cards should keep pushing cover-image fixes early."
                      : "Rights confirmation is the biggest drag right now, so seller guidance should keep making ownership checks impossible to miss."}
                </p>
              </div>
            </article>
          </section>

          <details className="group rounded-[30px] border border-black/5 bg-white p-7 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
            <DisclosureSummary
              body="Open this when you want the lower-priority product switches, persistence checks, and seller-plan rules, without crowding the main founder read."
              eyebrow="Build settings"
              meta="4 sections inside"
              title="Open feature status, persistence, cutover, and plan guardrails"
            />
            <div className="mt-6 space-y-6">
              <CutoverSummaryCard
                commandTestId="founder-cutover-command"
                headlineTestId="founder-cutover-headline"
                report={persistenceReadiness.cutoverReport}
                runtimeDetail={persistenceReadiness.persistenceStatus.detail}
                runtimeLabel={persistenceReadiness.persistenceStatus.label}
                runtimeMode={persistenceReadiness.persistenceStatus.mode}
                summary={persistenceReadiness.founderSummary}
                summaryTestId="founder-cutover-summary"
                testId="founder-cutover-card"
              />

              <PersistenceStatusClient
                heading="Persistence status"
                initialReadiness={persistenceReadiness}
              />

              <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
              <article className="rounded-[30px] border border-black/5 bg-white p-7 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
                <h2 className="text-2xl font-semibold text-ink">Feature status</h2>
                <p className="mt-3 text-sm leading-7 text-ink-soft">
                  This is the simplest answer to which major product capabilities are on for the current build.
                </p>
                <ul className="mt-5 space-y-3 text-sm text-ink-soft">
                  <li>AI enabled: {formatBoolean(featureFlags.aiEnabled)}</li>
                  <li>Guided walkthrough enabled: {formatBoolean(featureFlags.demoModeEnabled)}</li>
                  <li>Stripe enabled: {formatBoolean(featureFlags.stripeEnabled)}</li>
                  <li>Reviews enabled: {formatBoolean(featureFlags.reviewsEnabled)}</li>
                  <li>Refunds enabled: {formatBoolean(featureFlags.refundsEnabled)}</li>
                  <li>Admin tools enabled: {formatBoolean(featureFlags.adminEnabled)}</li>
                </ul>
              </article>

              <article className="rounded-[30px] border border-black/5 bg-white p-7 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
                <h2 className="text-2xl font-semibold text-ink">Plan guardrails</h2>
                <p className="mt-3 text-sm leading-7 text-ink-soft">
                  Use this section when you want a quick read on how seller plan limits and AI credit rules are set up.
                </p>
                <div className="mt-5 space-y-4">
                  {Object.values(planConfig).map((plan) => (
                    <div
                      key={plan.key}
                      className="rounded-[1.25rem] border border-slate-200 bg-slate-50/80 p-5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="font-semibold text-ink">{plan.label}</p>
                        <p className="text-xs uppercase tracking-[0.14em] text-ink-muted">
                          Best for: {plan.label === "Starter" ? "light seller testing" : plan.label === "Basic" ? "regular seller activity" : "higher-volume selling"}
                        </p>
                      </div>
                      <p className="mt-3 text-sm text-ink-soft">
                        {plan.creditGrantLabel}, reset: {plan.creditResetPolicy}, rollover policy: {plan.rolloverPolicy}
                      </p>
                    </div>
                  ))}
                </div>
              </article>
              </div>
            </div>
          </details>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
