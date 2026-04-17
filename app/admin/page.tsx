import Link from "next/link";
import { AlertTriangle, Bot, CreditCard, ShieldCheck } from "lucide-react";

import { AdminAiControlsClient } from "@/components/admin/admin-ai-controls-client";
import { CutoverSummaryCard } from "@/components/admin/cutover-summary-card";
import { AdminDashboardClient } from "@/components/admin/admin-dashboard-client";
import { OwnerSystemControlsClient } from "@/components/admin/owner-system-controls-client";
import { PersistenceStatusClient } from "@/components/admin/persistence-status-client";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { DisclosureSummary } from "@/components/shared/disclosure-summary";
import { SectionIntro } from "@/components/shared/section-intro";
import { StartHerePanel } from "@/components/shared/start-here-panel";
import { canAccessAdmin, getPrivateAccessRole } from "@/lib/auth/private-access";
import { getCurrentViewer } from "@/lib/auth/viewer";
import { normalizePlanKey, planConfig } from "@/lib/config/plans";
import { getIntegrationReadiness } from "@/lib/lessonforge/integration-readiness";
import { getSystemSettings } from "@/lib/lessonforge/data-access";
import { getPersistenceReadiness } from "@/lib/lessonforge/persistence-readiness";
import {
  getAdminOverview,
  getAdminRankingOverview,
} from "@/lib/lessonforge/server-operations";

export default async function AdminPage() {
  const [viewer, systemSettings, persistenceReadiness, privateAccessRole, integrationReadiness] = await Promise.all([
    getCurrentViewer(),
    getSystemSettings(),
    getPersistenceReadiness(),
    getPrivateAccessRole(),
    getIntegrationReadiness(),
  ]);
  const isOwner = viewer.role === "owner";

  if (
    (viewer.role !== "admin" && viewer.role !== "owner") ||
    !canAccessAdmin(privateAccessRole)
  ) {
    return (
      <main className="page-shell min-h-screen">
        <SiteHeader />
        <section className="px-5 pb-20 pt-10 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl rounded-[36px] border border-black/5 bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
            <SectionIntro
              body="This area is private and only opens after a valid access code unlocks admin or owner tools on this device."
              eyebrow="Restricted area"
              level="h1"
              title="Admin access is private."
              titleClassName="text-4xl leading-tight"
            />
            <StartHerePanel
              className="border-slate-200 bg-slate-50/80"
              items={[
                {
                  label: "What happened",
                  detail: "You opened an operations page that is reserved for private marketplace work.",
                },
                {
                  label: "Private unlock",
                  detail: "If this is your site, unlock private tools on this device first, then return here.",
                },
                {
                  label: "Or keep browsing",
                  detail: "If you are shopping or selling, go back to the marketplace, saved items, library, or seller dashboard instead.",
                },
              ]}
              title="This page is for marketplace operations, not normal buyer or seller browsing."
            />
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                className="inline-flex items-center justify-center rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
                href="/owner-access"
              >
                Open private access
              </a>
              <a
                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:border-slate-300"
                href="/marketplace"
              >
                Open marketplace
              </a>
            </div>
          </div>
        </section>
        <SiteFooter />
      </main>
    );
  }

  const [adminOverview, rankingOverview] = await Promise.all([
    getAdminOverview(),
    getAdminRankingOverview(),
  ]);

  const adminCards = [
    {
      label: "Flagged products",
      value: adminOverview.flaggedProducts,
      icon: AlertTriangle,
      detail: "Listings that need moderation attention before buyers should trust them.",
    },
    {
      label: "Open refund requests",
      value: adminOverview.openRefundRequests,
      icon: CreditCard,
      detail: "Buyer purchase issues that still need a decision or follow-up.",
    },
    {
      label: "Open reports",
      value: adminOverview.openReports,
      icon: AlertTriangle,
      detail: "Reported listing or buyer concerns that still need review.",
    },
    {
      label: "Active subscriptions",
      value: adminOverview.activeSubscriptions,
      icon: ShieldCheck,
      detail: "Seller plans currently in good standing across the marketplace.",
    },
    {
      label: "AI credits used",
      value: adminOverview.aiCreditsUsedThisCycle,
      icon: Bot,
      detail: "How much seller AI usage has been consumed in the current cycle.",
    },
  ];
  const launchReadyListings = adminOverview.persistedProducts.filter(
    (product) =>
      product.productStatus === "Published" &&
      product.previewIncluded &&
      product.thumbnailIncluded &&
      product.rightsConfirmed,
  ).length;
  const sellerFrictionSummary = {
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
  const sellerFrictionLead =
    sellerFrictionSummary.needsPreview >= sellerFrictionSummary.needsThumbnail &&
    sellerFrictionSummary.needsPreview >= sellerFrictionSummary.needsRights
      ? "Preview creation is the biggest current seller friction point."
      : sellerFrictionSummary.needsThumbnail >= sellerFrictionSummary.needsRights
        ? "Thumbnail readiness is the biggest current seller friction point."
        : "Rights confirmation is the biggest current seller friction point.";
  return (
    <main className="page-shell min-h-screen">
      <SiteHeader />

      <section className="px-5 pb-20 pt-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-8">
          <section className="rounded-[36px] border border-black/5 bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
            <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr] xl:items-start">
              <div>
              <SectionIntro
                body="This shell is the admin control surface for the three biggest MVP platform risks: listing quality, refund operations, and AI cost control. It keeps those concerns visible instead of buried."
                eyebrow="Admin controls"
                level="h1"
                title="Moderate risk, refunds, subscriptions, and AI usage from one place."
                titleClassName="text-5xl leading-tight"
              />

                <div className="mt-6 grid gap-4 lg:grid-cols-3">
                  <div className="rounded-[1.5rem] bg-slate-50 p-5 text-sm leading-7 text-ink-soft">
                    <p className="font-semibold text-ink">Start with today&apos;s risk</p>
                    <p className="mt-1">
                      Check flagged listings, refund requests, and reports before anything else.
                    </p>
                  </div>
                  <div className="rounded-[1.5rem] bg-slate-50 p-5 text-sm leading-7 text-ink-soft">
                    <p className="font-semibold text-ink">Then open the queue</p>
                    <p className="mt-1">
                      Use the moderation panel below to review listing issues and decide next actions.
                    </p>
                  </div>
                  <div className="rounded-[1.5rem] bg-slate-50 p-5 text-sm leading-7 text-ink-soft">
                    <p className="font-semibold text-ink">Only open deeper system detail if needed</p>
                    <p className="mt-1">
                      AI controls, persistence checks, and owner controls stay lower on the page so the main work stays first.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-[30px] bg-slate-950 p-7 text-white">
                <p className="text-sm uppercase tracking-[0.2em] text-white/60">
                  AI guardrail status
                </p>
                <p className="mt-5 text-3xl font-semibold">
                  Kill switch: {adminOverview.aiKillSwitchEnabled ? "On" : "Off"}
                </p>
                <p className="mt-4 text-sm leading-7 text-white/70">
                  {isOwner
                    ? "Owner controls can disable AI globally or pause the marketplace during operational risk."
                    : "AI controls and system settings are reserved for the owner. Admins stay focused on moderation and refund operations."}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-[32px] border border-black/5 bg-white p-8 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-ink">Focus now</h2>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-ink-soft">
                  Keep the first scan simple: check what needs attention today, then open the moderation queue.
                </p>
              </div>
              <p className="rounded-full bg-slate-50 px-4 py-2 text-sm font-medium text-ink-soft">
                Main workflow first, system detail later
              </p>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {adminCards.slice(0, 4).map((card) => (
                <article key={card.label} className="rounded-[1.5rem] bg-slate-50 p-5">
                  <p className="text-sm text-ink-soft">{card.label}</p>
                  <p className="mt-2 text-3xl font-semibold text-ink">{card.value}</p>
                  <p className="mt-3 text-sm leading-6 text-ink-soft">{card.detail}</p>
                </article>
              ))}
            </div>

            <details className="mt-4 rounded-[1.5rem] bg-slate-50 p-5 text-sm leading-7 text-ink-soft">
              <summary className="cursor-pointer font-semibold text-ink">
                Open extra admin summary
              </summary>
              <div className="mt-4 grid gap-4 md:grid-cols-[1fr_1fr]">
                <div className="rounded-[1.25rem] bg-white p-4">
                  <p className="text-sm text-ink-soft">Active subscriptions</p>
                  <p className="mt-2 text-2xl font-semibold text-ink">
                    {adminOverview.activeSubscriptions}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-ink-soft">
                    Sellers currently in good standing across the marketplace.
                  </p>
                </div>
                <div className="rounded-[1.25rem] bg-white p-4">
                  <p className="text-sm text-ink-soft">AI credits used</p>
                  <p className="mt-2 text-2xl font-semibold text-ink">
                    {adminOverview.aiCreditsUsedThisCycle}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-ink-soft">
                    Current-cycle seller AI usage across the platform.
                  </p>
                </div>
              </div>
            </details>
          </section>

          <section className="rounded-[32px] border border-black/5 bg-white p-8 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
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

          <section className="grid gap-5 xl:grid-cols-[1.05fr_1.05fr_0.9fr]">
            <article className="rounded-[32px] border border-black/5 bg-white p-8 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
              <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
                Start with this
              </span>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">
                Marketplace health
              </p>
              <h2 className="mt-4 text-3xl font-semibold text-ink">
                {launchReadyListings} launch-ready listing
                {launchReadyListings === 1 ? "" : "s"}
              </h2>
              <p className="mt-3 text-sm leading-7 text-ink-soft">
                These listings are already published and have preview, thumbnail, and rights confirmation in place.
              </p>
              <p className="mt-4 rounded-[1rem] bg-slate-50 px-4 py-3 text-sm leading-6 text-ink-soft">
                Read this as: how much of the catalog a buyer could trust right now without hitting setup gaps.
              </p>
            </article>

            <article className="rounded-[32px] border border-black/5 bg-white p-8 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
              <span className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-700">
                Watch next
              </span>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">
                Seller friction
              </p>
              <h2 className="mt-4 text-3xl font-semibold text-ink">
                {sellerFrictionSummary.moderationBlocked} listing
                {sellerFrictionSummary.moderationBlocked === 1 ? "" : "s"} blocked
              </h2>
              <p className="mt-3 text-sm leading-7 text-ink-soft">
                {sellerFrictionLead}
              </p>
              <p className="mt-4 rounded-[1rem] bg-slate-50 px-4 py-3 text-sm leading-6 text-ink-soft">
                Read this as: the biggest reason sellers are still getting slowed down before launch.
              </p>
            </article>

            <article className="rounded-[32px] border border-black/5 bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_100%)] p-8 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
              <span className="inline-flex rounded-full bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700">
                Quick summary
              </span>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">
                Founder read
              </p>
              <p className="mt-4 text-base leading-8 text-ink-soft">
                The marketplace is healthiest when listings are publish-ready before moderation pressure builds. Right now the main friction is coming from asset-readiness gaps and moderation-blocked listings, not from AI usage.
              </p>
              <p className="mt-4 rounded-[1rem] bg-white/80 px-4 py-3 text-sm leading-6 text-ink-soft">
                If you only read one thing on this page, read this summary first.
              </p>
            </article>
          </section>

          <section className="rounded-[32px] border border-black/5 bg-white p-8 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-ink">Upgrade pressure</h2>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-ink-soft">
                  This shows whether sellers are running into plan limits often enough that monetization pressure is becoming real.
                </p>
              </div>
              <p className="rounded-full bg-slate-50 px-4 py-2 text-sm font-medium text-ink-soft">
                Read this as seller upgrade readiness
              </p>
            </div>
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
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
              <article className="rounded-[1.5rem] bg-slate-50 p-5">
                <p className="text-sm text-ink-soft">Paid conversion score</p>
                <p className="mt-2 text-3xl font-semibold text-ink">
                  {adminOverview.conversionGapSummary.conversionScorePercent}%
                </p>
                <p className="mt-3 text-sm leading-6 text-ink-soft">
                  {adminOverview.conversionScoreLabel} paid-plan follow-through from current upgrade-ready sellers.
                </p>
              </article>
              <article className="rounded-[1.5rem] bg-slate-50 p-5">
                <p className="text-sm text-ink-soft">Starter sellers ready to upgrade</p>
                <p className="mt-2 text-3xl font-semibold text-ink">
                  {adminOverview.monetizationSummary.starterSellersReadyToUpgrade}
                </p>
                <p className="mt-3 text-sm leading-6 text-ink-soft">
                  Free sellers who have already crossed the sales threshold for the Basic upgrade nudge.
                </p>
              </article>
              <article className="rounded-[1.5rem] bg-slate-50 p-5">
                <p className="text-sm text-ink-soft">Upgrade clicks</p>
                <p className="mt-2 text-3xl font-semibold text-ink">
                  {adminOverview.monetizationSummary.upgradeClicks}
                </p>
                <p className="mt-3 text-sm leading-6 text-ink-soft">
                  Times sellers opened an upgrade action from a monetization prompt.
                </p>
              </article>
              <article className="rounded-[1.5rem] bg-slate-50 p-5">
                <p className="text-sm text-ink-soft">Listing cap hits</p>
                <p className="mt-2 text-3xl font-semibold text-ink">
                  {adminOverview.monetizationSummary.listingLimitHits}
                </p>
                <p className="mt-3 text-sm leading-6 text-ink-soft">
                  Times sellers hit plan listing limits and saw an upgrade prompt.
                </p>
              </article>
              <article className="rounded-[1.5rem] bg-slate-50 p-5">
                <p className="text-sm text-ink-soft">AI credit limit hits</p>
                <p className="mt-2 text-3xl font-semibold text-ink">
                  {adminOverview.monetizationSummary.aiCreditLimitHits}
                </p>
                <p className="mt-3 text-sm leading-6 text-ink-soft">
                  Times sellers ran out of AI room and were blocked from more optimization.
                </p>
              </article>
              <article className="rounded-[1.5rem] bg-slate-50 p-5">
                <p className="text-sm text-ink-soft">Locked feature clicks</p>
                <p className="mt-2 text-3xl font-semibold text-ink">
                  {adminOverview.monetizationSummary.lockedFeatureClicks}
                </p>
                <p className="mt-3 text-sm leading-6 text-ink-soft">
                  How often sellers tried to open premium tools from free-plan screens.
                </p>
              </article>
            </div>
            <div className="mt-5 rounded-[1.5rem] bg-slate-50 p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-ink-muted">
                Seller watchlist
              </p>
              <div className="mt-4 space-y-3">
                {adminOverview.monetizationSummary.sellerWatchlist.length ? (
                  adminOverview.monetizationSummary.sellerWatchlist.slice(0, 3).map((seller: any) => (
                    <div
                      key={seller.sellerId}
                      className="rounded-[1.25rem] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <p className="font-semibold text-ink">{seller.sellerName}</p>
                        <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">
                          {seller.reachedUpgradeThreshold ? "Ready to upgrade" : "Watch progress"}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-ink-soft">{seller.sellerEmail}</p>
                      <p className="mt-2 text-sm text-ink-soft">
                        {seller.storefrontTrustLabel} · {seller.publishedListingCount} published listing
                        {seller.publishedListingCount === 1 ? "" : "s"}
                        {seller.totalReviewCount > 0
                          ? ` · ${seller.averageRating} average rating from ${seller.totalReviewCount} review${seller.totalReviewCount === 1 ? "" : "s"}`
                          : ""}
                      </p>
                      <p className="mt-2 text-sm text-ink-soft">
                        Gross sales {seller.grossSalesCents.toLocaleString("en-US", {
                          style: "currency",
                          currency: "USD",
                          maximumFractionDigits: 0,
                        })} · would keep about {seller.extraKeepOnBasicCents.toLocaleString("en-US", {
                          style: "currency",
                          currency: "USD",
                          maximumFractionDigits: 0,
                        })} more on Basic
                      </p>
                      <p className="mt-2 text-sm text-ink-soft">
                        Recommended next plan:{" "}
                        <span className="font-semibold text-ink">
                          {planConfig[normalizePlanKey(seller.recommendedNextPlan)].label}
                        </span>
                      </p>
                      <p className="mt-1 text-sm text-ink-soft">
                        {seller.latestTriggerLabel}
                        {seller.latestTriggerSource ? ` Source: ${seller.latestTriggerSource.replace(/_/g, " ")}.` : ""}
                      </p>
                      <p className="mt-1 text-sm text-ink-soft">{seller.recommendationReason}</p>
                      <div className="mt-3 flex flex-wrap gap-3">
                        <Link
                          className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:border-slate-300"
                          href={`/store/${seller.sellerId}`}
                        >
                          Open storefront
                        </Link>
                        <Link
                          className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:border-slate-300"
                          href={`/#pricing`}
                        >
                          Review {planConfig[normalizePlanKey(seller.recommendedNextPlan)].label}
                        </Link>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-ink-soft">No sellers in the watchlist yet.</p>
                )}
              </div>
            </div>
          </section>

          <details className="rounded-[30px] border border-black/5 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
            <summary className="cursor-pointer text-xl font-semibold text-ink">
              Open seller-friction breakdown
            </summary>
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <article className="rounded-[30px] border border-black/5 bg-slate-50 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">
                  Need preview
                </p>
                <p className="mt-3 text-3xl font-semibold text-ink">{sellerFrictionSummary.needsPreview}</p>
                <p className="mt-2 text-sm leading-6 text-ink-soft">
                  Seller-created listings still missing preview pages.
                </p>
              </article>
              <article className="rounded-[30px] border border-black/5 bg-slate-50 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">
                  Need thumbnail
                </p>
                <p className="mt-3 text-3xl font-semibold text-ink">{sellerFrictionSummary.needsThumbnail}</p>
                <p className="mt-2 text-sm leading-6 text-ink-soft">
                  Listings that still need a browse-ready thumbnail.
                </p>
              </article>
              <article className="rounded-[30px] border border-black/5 bg-slate-50 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">
                  Need rights
                </p>
                <p className="mt-3 text-3xl font-semibold text-ink">{sellerFrictionSummary.needsRights}</p>
                <p className="mt-2 text-sm leading-6 text-ink-soft">
                  Listings that still need rights-to-sell confirmation.
                </p>
              </article>
              <article className="rounded-[30px] border border-black/5 bg-slate-50 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">
                  Published
                </p>
                <p className="mt-3 text-3xl font-semibold text-ink">{adminOverview.publishedProducts}</p>
                <p className="mt-2 text-sm leading-6 text-ink-soft">
                  Listings currently visible to marketplace buyers.
                </p>
              </article>
            </div>
          </details>

          <section className="grid gap-6">
            <AdminDashboardClient
              initialProducts={adminOverview.persistedProducts}
              initialReports={adminOverview.reports}
              initialRefundRequests={adminOverview.refundRequests}
            />
          </section>

          <details className="rounded-[30px] border border-black/5 bg-white p-7 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
            <summary className="cursor-pointer text-xl font-semibold text-ink">
              Open ranking watchlist
            </summary>
            <p className="mt-3 text-sm leading-7 text-ink-soft">
              Use this when you need to understand which listings are being helped or held back the most by the current ranking rules.
            </p>
            <div className="mt-6 grid gap-5 xl:grid-cols-[1fr_1fr_0.7fr]">
              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-ink-muted">
                  Top boosted listings
                </p>
                <div className="mt-4 space-y-3">
                  {rankingOverview.topBoostedListings.map((listing) => (
                    <div key={listing.id} className="rounded-[1.25rem] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
                      <p className="font-semibold text-ink">{listing.title}</p>
                      <p className="mt-1 text-sm text-ink-soft">
                        {listing.sellerName} · freshness {listing.freshnessScore.toFixed(0)} · {listing.conversionLabel}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-ink-muted">
                  Most suppressed listings
                </p>
                <div className="mt-4 space-y-3">
                  {rankingOverview.mostSuppressedListings.map((listing) => (
                    <div key={listing.id} className="rounded-[1.25rem] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
                      <p className="font-semibold text-ink">{listing.title}</p>
                      <p className="mt-1 text-sm text-ink-soft">
                        {listing.sellerName} · {listing.issueCountLabel} · penalties {listing.reportPenalty + listing.refundPenalty}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <div className="rounded-[1.25rem] bg-slate-50 p-4 text-sm text-ink-soft">
                  Orders recorded
                  <p className="mt-2 text-2xl font-semibold text-ink">{adminOverview.orders.length}</p>
                </div>
                <div className="rounded-[1.25rem] bg-slate-50 p-4 text-sm text-ink-soft">
                  Verified reviews stored
                  <p className="mt-2 text-2xl font-semibold text-ink">{adminOverview.reviews.length}</p>
                </div>
              </div>
            </div>
          </details>

          <details className="group rounded-[30px] border border-black/5 bg-white p-7 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
            <DisclosureSummary
              body="Open this section when you need cutover status, persistence detail, plan mix, AI pressure, or owner-only controls."
              eyebrow="System detail"
              meta={isOwner ? "5 sections inside" : "4 sections inside"}
              title="Open cutover, persistence, plan, and owner controls"
            />

            <div className="mt-6 space-y-6">
              <CutoverSummaryCard
                commandTestId="admin-cutover-command"
                headlineTestId="admin-cutover-headline"
                report={persistenceReadiness.cutoverReport}
                runtimeDetail={persistenceReadiness.persistenceStatus.detail}
                runtimeLabel={persistenceReadiness.persistenceStatus.label}
                runtimeMode={persistenceReadiness.persistenceStatus.mode}
                summary={persistenceReadiness.founderSummary}
                summaryTestId="admin-cutover-summary"
                testId="admin-cutover-card"
              />

              <PersistenceStatusClient initialReadiness={persistenceReadiness} />

              <section className="grid gap-6 lg:grid-cols-2">
                {isOwner ? (
                  <AdminAiControlsClient
                    initialSettings={adminOverview.aiSettings}
                    initialSummary={adminOverview.aiCostRiskSummary}
                  />
                ) : (
                  <article className="rounded-[30px] border border-black/5 bg-white p-7 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
                    <h2 className="text-2xl font-semibold text-ink">Owner-only controls</h2>
                    <p className="mt-3 text-sm leading-7 text-ink-soft">
                      AI kill switch, warning thresholds, maintenance mode, pricing, and system controls are restricted to the owner role in Prompt V2.
                    </p>
                    <div className="mt-6 rounded-[1.25rem] bg-slate-50 p-4 text-sm text-ink-soft">
                      Current AI status: {adminOverview.aiKillSwitchEnabled ? "Paused" : "Available"}
                    </div>
                    <div className="mt-3 rounded-[1.25rem] bg-slate-50 p-4 text-sm text-ink-soft">
                      Maintenance mode: {systemSettings.maintenanceModeEnabled ? "Enabled" : "Off"}
                    </div>
                  </article>
                )}

                <article className="rounded-[30px] border border-black/5 bg-white p-7 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
                  <h2 className="text-2xl font-semibold text-ink">Plan mix</h2>
                  <p className="mt-3 text-sm leading-7 text-ink-soft">
                    This shows how seller subscriptions are distributed across the current plans.
                  </p>
                  <p className="mt-4 rounded-[1rem] bg-slate-50 px-4 py-3 text-sm leading-6 text-ink-soft">
                    Read this as: which level of seller the marketplace is mostly serving right now.
                  </p>
                  <div className="mt-6 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-[1.25rem] bg-slate-50 p-4">
                      <p className="text-sm text-ink-soft">Starter</p>
                      <p className="mt-2 text-3xl font-semibold text-ink">{adminOverview.planMix.starter}</p>
                    </div>
                    <div className="rounded-[1.25rem] bg-slate-50 p-4">
                      <p className="text-sm text-ink-soft">Basic</p>
                      <p className="mt-2 text-3xl font-semibold text-ink">{adminOverview.planMix.basic}</p>
                    </div>
                    <div className="rounded-[1.25rem] bg-slate-50 p-4">
                      <p className="text-sm text-ink-soft">Pro</p>
                      <p className="mt-2 text-3xl font-semibold text-ink">{adminOverview.planMix.pro}</p>
                    </div>
                  </div>
                </article>

                <article className="rounded-[30px] border border-black/5 bg-white p-7 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
                  <h2 className="text-2xl font-semibold text-ink">AI pressure watch</h2>
                  <p className="mt-3 text-sm leading-7 text-ink-soft">
                    Sellers at the top of this list are using the highest share of their current monthly AI allowance.
                  </p>
                  <p className="mt-4 rounded-[1rem] bg-slate-50 px-4 py-3 text-sm leading-6 text-ink-soft">
                    Open this only when you are checking for plan strain or deciding whether AI limits need attention.
                  </p>
                  <div className="mt-6 space-y-3">
                    {adminOverview.highestAiPressureSellers.length ? (
                      adminOverview.highestAiPressureSellers.map((seller) => (
                        <div key={seller.sellerId} className="rounded-[1.25rem] bg-slate-50 p-4">
                          <div className="flex items-center justify-between gap-4">
                            <p className="font-semibold text-ink">{seller.sellerEmail}</p>
                            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">
                              {planConfig[normalizePlanKey(seller.planKey)].label}
                            </span>
                          </div>
                          <p className="mt-2 text-sm text-ink-soft">
                            {seller.creditsSpent} used of {seller.monthlyCredits} cycle credits
                          </p>
                          <p className="mt-1 text-sm text-ink-soft">
                            {Math.round(seller.pressureRatio * 100)}% of allowance used · {seller.availableCredits} remaining
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm leading-7 text-ink-soft">
                        No seller subscriptions are active yet, so AI pressure is still quiet.
                      </p>
                    )}
                  </div>
                </article>
                {isOwner ? (
                  <OwnerSystemControlsClient initialSettings={systemSettings} />
                ) : null}
              </section>
            </div>
          </details>

          <details className="group rounded-[30px] border border-black/5 bg-white p-7 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
            <DisclosureSummary
              body="Use this when you need to answer who changed something and what happened most recently."
              eyebrow="Admin history"
              meta={`${Math.min(adminOverview.auditLogs.length, 8)} recent entries`}
              title="Open the recent admin audit log"
            />
            <div className="mt-6">
              <p className="text-sm leading-7 text-ink-soft">
                This shows the latest owner and admin control actions, including moderation changes, refund decisions, report triage, AI settings changes, and maintenance mode updates.
              </p>
              <div className="mt-6 space-y-3">
                {adminOverview.auditLogs.length ? (
                  adminOverview.auditLogs.slice(0, 8).map((entry) => (
                    <article key={entry.id} className="rounded-[1.25rem] bg-slate-50 p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <p className="font-semibold text-ink">{entry.action}</p>
                        <span className="text-xs uppercase tracking-[0.14em] text-ink-muted">
                          {entry.createdAt}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-ink-soft">
                        {entry.actorEmail ?? "System"} · {entry.actorRole ?? "system"} · {entry.targetType} / {entry.targetId}
                      </p>
                      {entry.metadata ? (
                        <p className="mt-2 text-sm text-ink-soft">
                          {Object.entries(entry.metadata)
                            .map(([key, value]) => `${key}: ${String(value)}`)
                            .join(" · ")}
                        </p>
                      ) : null}
                    </article>
                  ))
                ) : (
                  <p className="text-sm leading-7 text-ink-soft">
                    No admin audit entries yet. Owner and admin actions will appear here once controls are used.
                  </p>
                )}
              </div>
            </div>
          </details>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
