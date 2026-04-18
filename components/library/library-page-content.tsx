"use client";

import { AlertTriangle, Download, ExternalLink, LifeBuoy, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { HighlightChip } from "@/components/buyer/highlight-chip";
import { secondaryActionLinkClassName } from "@/components/shared/secondary-action-link";
import { buildMarketplaceListingHref } from "@/lib/lessonforge/marketplace-navigation";
import type { OrderRecord, ReportRecord, Viewer } from "@/types";

type LibraryItem = OrderRecord & {
  refundStatus: string | null;
  currentAssetVersion: number;
  hasNewerEligibleVersion: boolean;
  assetHealthStatus: string;
};

type LibraryFilter = "all" | "updated" | "support";

function parseLibraryFilter(value: string | null): LibraryFilter {
  if (value === "updated" || value === "support") {
    return value;
  }

  return "all";
}

export function LibraryPageContent({
  buyerLibraryItems,
  favoriteCount,
  viewer,
}: {
  buyerLibraryItems: LibraryItem[];
  favoriteCount: number;
  viewer: Viewer;
}) {
  const searchParams = useSearchParams();
  const urlFilter = parseLibraryFilter(searchParams.get("view"));
  const [activeFilter, setActiveFilter] = useState<LibraryFilter>(urlFilter);
  const [message, setMessage] = useState<string | null>(null);
  const [reportDetails, setReportDetails] = useState<Record<string, string>>({});
  const [reportCategories, setReportCategories] = useState<
    Record<string, ReportRecord["category"]>
  >({});
  const [submittedRefundStatuses, setSubmittedRefundStatuses] = useState<
    Record<string, string>
  >({});

  useEffect(() => {
    setActiveFilter(urlFilter);
  }, [urlFilter]);
  const filteredLibraryItems = buyerLibraryItems.filter((item) => {
    const effectiveRefundStatus = submittedRefundStatuses[item.id] ?? item.refundStatus;

    if (activeFilter === "updated") {
      return item.hasNewerEligibleVersion;
    }

    if (activeFilter === "support") {
      return (
        effectiveRefundStatus === "Submitted" ||
        item.assetHealthStatus !== "Preview and thumbnail ready"
      );
    }

    return true;
  });
  const featuredLibraryItem =
    filteredLibraryItems.length > 0
      ? filteredLibraryItems.reduce((best, item) => {
          const bestScore =
            (best.hasNewerEligibleVersion ? 3 : 0) +
            best.currentAssetVersion +
            (best.assetHealthStatus === "Preview and thumbnail ready" ? 1 : 0);
          const itemScore =
            (item.hasNewerEligibleVersion ? 3 : 0) +
            item.currentAssetVersion +
            (item.assetHealthStatus === "Preview and thumbnail ready" ? 1 : 0);

          return itemScore > bestScore ? item : best;
        })
      : null;
  const supportingLibraryItems = filteredLibraryItems.filter(
    (item) => item.id !== featuredLibraryItem?.id,
  );
  const supportAttentionCount = buyerLibraryItems.filter((item) => {
    const effectiveRefundStatus = submittedRefundStatuses[item.id] ?? item.refundStatus;
    return (
      effectiveRefundStatus === "Submitted" ||
      item.assetHealthStatus !== "Preview and thumbnail ready"
    );
  }).length;
  const activeFilterSummary =
    activeFilter === "updated"
      ? {
          label: "Updated",
          title: `${filteredLibraryItems.length} updated purchase${
            filteredLibraryItems.length === 1 ? "" : "s"
          } ready to review`,
          body: "Focus on purchases where a newer eligible version is already ready for you.",
        }
      : activeFilter === "support"
        ? {
            label: "Needs support",
            title: `${filteredLibraryItems.length} purchase${
              filteredLibraryItems.length === 1 ? "" : "s"
            } needing attention`,
            body: "Use this view for purchases with an open refund, delivery issue, or access item that needs follow-up.",
        }
        : {
            label: "All purchases",
            title: `${buyerLibraryItems.length} purchased resource${
              buyerLibraryItems.length === 1 ? "" : "s"
            } in one place`,
          body: "Start in the full library, then narrow into updates or support when you need a faster path to the right file.",
        };
  const activeFilterPill =
    activeFilter === "updated"
      ? "Updated purchases"
      : activeFilter === "support"
        ? "Needs support"
        : "All purchases";

  function slugify(value: string) {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function formatCurrency(amountCents: number) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amountCents / 100);
  }

  function getLibraryPreviewImage(item: LibraryItem) {
    return `/api/lessonforge/thumbnail-assets/${encodeURIComponent(slugify(item.productTitle))}`;
  }

  function getLibraryPreviewLabel(item: LibraryItem) {
    if (item.hasNewerEligibleVersion) {
      return "Updated since purchase";
    }

    if (item.assetHealthStatus === "Preview and thumbnail ready") {
      return "Protected preview ready";
    }

    return "Purchased resource";
  }

  function getLibrarySpotlightCopy(item: LibraryItem) {
    if (item.hasNewerEligibleVersion) {
      return "Fresh asset update now available in your protected library delivery.";
    }

    if (item.assetHealthStatus === "Preview and thumbnail ready") {
      return "Strong preview quality and protected delivery are both in place.";
    }

    return "This resource is ready to revisit with all purchased files kept behind protected access.";
  }

  function getFeaturedLibraryReason(item: LibraryItem) {
    if (item.hasNewerEligibleVersion) {
      return {
        label: "Latest update",
        tone: "border-emerald-200 bg-emerald-50 text-emerald-800",
        body: `Version ${item.currentAssetVersion} is now available for this purchase.`,
      };
    }

    if (item.refundStatus === "Submitted") {
      return {
        label: "Support in progress",
        tone: "border-amber-200 bg-amber-50 text-amber-800",
        body: "A refund request is already open for this purchase.",
      };
    }

    if (item.assetHealthStatus === "Preview and thumbnail ready") {
      return {
        label: "Best next action",
        tone: "border-sky-200 bg-sky-50 text-sky-800",
        body: "This purchase is ready for a clean reopen, preview revisit, or download.",
      };
    }

    return {
      label: "Featured now",
      tone: "border-brand/15 bg-brand-soft/70 text-brand",
      body: "This purchase currently has the strongest overall library signal.",
    };
  }

  function getSupportingLibraryReason(item: LibraryItem, effectiveRefundStatus: string | null) {
    if (item.hasNewerEligibleVersion) {
      return {
        label: "Updated",
        tone: "bg-emerald-100 text-emerald-800",
      };
    }

    if (effectiveRefundStatus === "Submitted") {
      return {
        label: "Support open",
        tone: "bg-amber-100 text-amber-800",
      };
    }

    if (item.assetHealthStatus === "Preview and thumbnail ready") {
      return {
        label: "Ready to reopen",
        tone: "bg-sky-100 text-sky-800",
      };
    }

    return {
      label: "Purchased",
      tone: "bg-brand-soft text-brand",
    };
  }

  async function handleRefundRequest(item: OrderRecord) {
    setMessage(null);

    const response = await fetch("/api/lessonforge/refund-requests", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        orderId: item.id,
        productId: item.productId,
        productTitle: item.productTitle,
        buyerName: viewer.name,
        buyerEmail: viewer.email,
        sellerName: item.sellerName,
        reason: "Demo buyer requested a refund from the library.",
      }),
    });

    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      setMessage(payload.error || "Unable to submit refund request.");
      return;
    }

    setSubmittedRefundStatuses((current) => ({
      ...current,
      [item.id]: "Submitted",
    }));
    setMessage(`Refund request submitted for ${item.productTitle}.`);
  }

  async function handleReportIssue(item: OrderRecord) {
    setMessage(null);

    const response = await fetch("/api/lessonforge/reports", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        report: {
          id: `report-${Date.now()}`,
          productId: item.productId,
          productTitle: item.productTitle,
          reporterName: viewer.name,
          reporterEmail: viewer.email,
          category: reportCategories[item.id] || "Access issue",
          status: "Open",
          details:
            reportDetails[item.id]?.trim() ||
            "Buyer reported an issue from the library flow.",
          createdAt: new Date().toISOString(),
        } satisfies ReportRecord,
      }),
    });

    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      setMessage(payload.error || "Unable to submit report.");
      return;
    }

    setReportDetails((current) => ({
      ...current,
      [item.id]: "",
    }));
    setMessage(`Issue report submitted for ${item.productTitle}.`);
  }

  function renderLibrarySupportPanel(item: LibraryItem, effectiveRefundStatus: string | null) {
    return (
      <div className="mt-5 rounded-[24px] border border-slate-200 bg-slate-50/80 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
              Need help with this purchase?
            </p>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-soft">
              Download the protected files again, reopen the listing or storefront, or report a real access, broken-file, misleading-listing, duplicate-charge, or rights issue.
            </p>
          </div>
          <div className="rounded-[18px] border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-900">
            <div className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4" />
              <span>
                Purchased originals are delivered through protected access. Public product pages continue to show only watermarked previews.
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
          <div className="rounded-[20px] border border-white bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
              Reopen access
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <a
                className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
                href={`/api/lessonforge/library-delivery?orderId=${encodeURIComponent(item.id)}`}
                data-testid={`library-download-${item.id}`}
                onClick={() =>
                  setMessage(
                    `Preparing a protected download for ${item.productTitle}.`,
                  )
                }
                rel="noreferrer"
                target="_blank"
              >
                <Download className="h-4 w-4" />
                Download files
              </a>
              <a
                className={secondaryActionLinkClassName("px-5 py-3")}
                href={buildMarketplaceListingHref({
                  returnTo: "/library",
                  slug: slugify(item.productTitle),
                })}
                data-testid={`library-open-linked-asset-${item.id}`}
                onClick={() =>
                  setMessage(`Opened the purchased listing page for ${item.productTitle}.`)
                }
                rel="noreferrer"
                target="_blank"
              >
                <ExternalLink className="h-4 w-4" />
                Open purchased listing
              </a>
              <a
                className={secondaryActionLinkClassName("px-5 py-3")}
                href={`/store/${encodeURIComponent(item.sellerId)}`}
                data-testid={`library-open-storefront-${item.id}`}
                onClick={() =>
                  setMessage(`Opened ${item.sellerName}'s storefront.`)
                }
                rel="noreferrer"
                target="_blank"
              >
                <ExternalLink className="h-4 w-4" />
                Visit seller storefront
              </a>
            </div>
          </div>

          <div className="rounded-[20px] border border-white bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
              Refunds and issue reporting
            </p>
            <p className="mt-2 text-sm leading-6 text-ink-soft">
              Digital purchases are usually final after access is delivered. Refunds are reviewed for broken files, missing access, materially misleading listings, duplicate charges, or rights issues.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                className={secondaryActionLinkClassName("px-5 py-3")}
                data-testid={`library-refund-${item.id}`}
                disabled={effectiveRefundStatus === "Submitted"}
                onClick={() => void handleRefundRequest(item)}
                type="button"
              >
                <LifeBuoy className="h-4 w-4" />
                {effectiveRefundStatus === "Submitted"
                  ? "Refund submitted"
                  : "Request refund"}
              </button>
              {effectiveRefundStatus ? (
                <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-amber-800">
                  {effectiveRefundStatus}
                </span>
              ) : null}
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-[220px_1fr_auto]">
              <select
                className="rounded-[1rem] border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-brand"
                data-testid={`library-report-category-${item.id}`}
                onChange={(event) =>
                  setReportCategories((current) => ({
                    ...current,
                    [item.id]: event.target.value as ReportRecord["category"],
                  }))
                }
                value={reportCategories[item.id] ?? "Access issue"}
              >
                <option>Broken file</option>
                <option>Copyright</option>
                <option>Misleading listing</option>
                <option>Low quality</option>
                <option>Spam</option>
                <option>Access issue</option>
              </select>
              <input
                className="rounded-[1rem] border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-brand"
                data-testid={`library-report-details-${item.id}`}
                onChange={(event) =>
                  setReportDetails((current) => ({
                    ...current,
                    [item.id]: event.target.value,
                  }))
                }
                placeholder="Report an issue with this product or access experience."
                value={reportDetails[item.id] ?? ""}
              />
              <button
                className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink transition hover:border-slate-300"
                data-testid={`library-report-${item.id}`}
                onClick={() => void handleReportIssue(item)}
                type="button"
              >
                <AlertTriangle className="h-4 w-4" />
                Report issue
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function getLibraryFilterHref(nextFilter: LibraryFilter) {
    const params = new URLSearchParams(searchParams.toString());

    if (nextFilter === "all") {
      params.delete("view");
    } else {
      params.set("view", nextFilter);
    }

    const nextQuery = params.toString();
    return nextQuery ? `/library?${nextQuery}` : "/library";
  }

  return (
    <>
      <section className="grid gap-4">
        {buyerLibraryItems.length ? (
          <>
            <section className="rounded-[28px] border border-black/5 bg-white p-5 shadow-[0_12px_35px_rgba(15,23,42,0.05)]">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="max-w-3xl">
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand">
                    Browse your library
                  </p>
                  <p className="mt-2 text-sm leading-7 text-ink-soft">
                    Switch between all purchases, updates, and support views so you can reopen the right resource without digging.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: "all", label: `All purchases (${buyerLibraryItems.length})` },
                    {
                      key: "updated",
                      label: `Updated (${buyerLibraryItems.filter((item) => item.hasNewerEligibleVersion).length})`,
                    },
                    {
                      key: "support",
                      label: `Needs support (${supportAttentionCount})`,
                    },
                  ].map((option) => (
                    <Link
                      key={option.key}
                      className={`rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                        activeFilter === option.key
                          ? "bg-brand text-white"
                          : "border border-slate-200 bg-white text-ink hover:border-slate-300"
                      }`}
                      data-testid={`library-filter-${option.key}`}
                      href={getLibraryFilterHref(option.key as LibraryFilter)}
                      onClick={() => setActiveFilter(option.key as LibraryFilter)}
                    >
                      {option.label}
                    </Link>
                  ))}
                </div>
              </div>
              <div className="mt-5 grid gap-3 xl:grid-cols-[minmax(0,1.2fr)_minmax(240px,0.8fr)]">
                <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-5 py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
                      {activeFilterSummary.label}
                    </p>
                    <HighlightChip
                      testId="library-active-filter-pill"
                      label={activeFilterPill}
                      toneClassName="bg-white text-ink shadow-sm"
                    />
                    {activeFilter !== "all" ? (
                      <Link
                        className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-ink transition hover:border-slate-300"
                        data-testid="library-clear-filter"
                        href="/library"
                        onClick={() => setActiveFilter("all")}
                      >
                        Clear filter
                      </Link>
                    ) : null}
                  </div>
                  <h2 className="mt-3 text-2xl font-semibold text-ink">
                    {activeFilterSummary.title}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-ink-soft">
                    {activeFilterSummary.body}
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  <article className="rounded-[20px] border border-slate-200 bg-white px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
                      Showing now
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-ink">
                      {filteredLibraryItems.length}
                    </p>
                  </article>
                  <article className="rounded-[20px] border border-slate-200 bg-white px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
                      Needs support
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-ink">
                      {supportAttentionCount}
                    </p>
                  </article>
                </div>
              </div>
            </section>

            {filteredLibraryItems.length === 0 ? (
              <article className="rounded-[28px] border border-dashed border-slate-300 bg-white p-8 text-sm leading-7 text-ink-soft">
                {activeFilter === "updated"
                  ? `No updated purchases for ${viewer.name} yet. When sellers publish a newer eligible version, it will surface here automatically.`
                  : `No purchases needing support attention for ${viewer.name} right now. Refund requests or delivery issues will surface here when they exist.`}
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    className="inline-flex rounded-full bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
                    href="/library"
                    onClick={() => setActiveFilter("all")}
                  >
                    View all purchases
                  </Link>
                  <Link
                    className="inline-flex rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink transition hover:border-slate-300"
                    href="/marketplace"
                  >
                    Browse more resources
                  </Link>
                </div>
              </article>
            ) : null}

            {featuredLibraryItem ? (
              <section className="rounded-[32px] border border-black/5 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand">
                      {activeFilter === "all" ? "Start Here" : "Best Match In This View"}
                    </p>
                    <h2 className="mt-3 text-3xl font-semibold text-ink">
                      {activeFilter === "updated"
                        ? "Start with the strongest updated purchase"
                        : activeFilter === "support"
                          ? "Start with the purchase that needs attention"
                          : "Start with the best next purchase to reopen"}
                    </h2>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-soft">
                      {activeFilter === "all"
                        ? "This purchase rises first because it has the clearest next step in your library right now."
                        : "This purchase rises first because it is the strongest match for the current view."}
                    </p>
                  </div>
                </div>

                <div className="mt-6">
                  {(() => {
                    const item = featuredLibraryItem;
                    const effectiveRefundStatus =
                      submittedRefundStatuses[item.id] ?? item.refundStatus;
                    const featuredReason = getFeaturedLibraryReason(item);

                    return (
                      <article
                        key={`featured-${item.id}`}
                        className="rounded-[32px] border border-brand/15 bg-white p-6 shadow-[0_22px_60px_rgba(15,23,42,0.08)]"
                        data-testid={`library-item-${item.id}`}
                        data-featured-library-item="true"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand">
                              Featured library resource
                            </p>
                            <h3 className="mt-3 text-3xl font-semibold text-ink">{item.productTitle}</h3>
                            <p className="mt-2 text-sm text-ink-soft">Sold by {item.sellerName}</p>
                            <HighlightChip
                              bordered
                              body={featuredReason.body}
                              className="mt-4"
                              label={featuredReason.label}
                              testId="featured-library-reason"
                              toneClassName={featuredReason.tone}
                            />
                          </div>
                          <div className="rounded-[24px] bg-brand-soft/70 px-4 py-3 text-sm leading-6 text-ink">
                            <p className="font-semibold text-brand">
                              {item.hasNewerEligibleVersion
                                ? "Updated since purchase"
                                : "Current protected version ready"}
                            </p>
                            <p className="mt-1">{item.versionLabel}</p>
                          </div>
                        </div>

                        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
                          <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-slate-50 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
                            <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white/90 px-5 py-4">
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">
                                  Purchased preview
                                </p>
                                <p className="mt-1 text-sm text-ink-soft">
                                  {getLibraryPreviewLabel(item)}
                                </p>
                              </div>
                              <div className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-brand">
                                {formatCurrency(item.amountCents)}
                              </div>
                            </div>
                            <div className="p-5">
                              <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.08)]">
                                <img
                                  alt={`${item.productTitle} purchased preview`}
                                  className="aspect-[5/6] w-full bg-slate-100 object-contain object-top"
                                  decoding="async"
                                  loading="lazy"
                                  sizes="(min-width: 1280px) 52vw, 100vw"
                                  src={getLibraryPreviewImage(item)}
                                />
                              </div>
                              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                <div className="rounded-[20px] border border-slate-200 bg-white px-4 py-3">
                                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand">
                                    Product type
                                  </p>
                                  <p className="mt-2 text-sm font-semibold text-ink">
                                    Purchased resource
                                  </p>
                                </div>
                                <div className="rounded-[20px] border border-slate-200 bg-white px-4 py-3">
                                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand">
                                    Library status
                                  </p>
                                  <p className="mt-2 text-sm font-semibold text-ink">
                                    {getLibraryPreviewLabel(item)}
                                  </p>
                                </div>
                                <div className="rounded-[20px] border border-slate-200 bg-white px-4 py-3">
                                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand">
                                    Current version
                                  </p>
                                  <p className="mt-2 text-sm font-semibold text-ink">
                                    {item.versionLabel}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col gap-4">
                            <div className="rounded-[24px] border border-slate-200 bg-white px-5 py-5">
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
                                Why open this now
                              </p>
                              <p className="mt-3 text-lg font-semibold leading-8 text-ink">
                                {getLibrarySpotlightCopy(item)}
                              </p>
                              <p className="mt-3 text-sm leading-7 text-ink-soft">
                                {item.instructions}
                              </p>
                            </div>

                            <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-ink-soft">
                              <p className="font-semibold text-ink">Quick access check</p>
                              <div className="mt-2 space-y-1.5">
                                <p>Your library is currently pointing to {item.versionLabel}.</p>
                                <p>{item.accessType}</p>
                                <p className="font-medium text-brand">{item.updatedLabel}</p>
                                <p>Asset health: {item.assetHealthStatus}</p>
                                {item.hasNewerEligibleVersion ? (
                                  <p className="font-medium text-emerald-600">
                                    New eligible version available: Version {item.currentAssetVersion}
                                  </p>
                                ) : null}
                                {effectiveRefundStatus ? (
                                  <p className="font-medium text-amber-600">
                                    Refund: {effectiveRefundStatus}
                                  </p>
                                ) : null}
                              </div>
                            </div>

                            <details className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-ink-soft">
                              <summary className="cursor-pointer font-semibold text-ink">
                                More access detail
                              </summary>
                              <div className="mt-3 space-y-3">
                                <p>
                                  Your library is currently pointing to {item.versionLabel}.{" "}
                                  {item.hasNewerEligibleVersion
                                    ? `A newer eligible asset version (${item.currentAssetVersion}) is now available for this purchase.`
                                    : "When eligible updates are published, this protected delivery flow should move you to the newest allowed version automatically."}
                                </p>
                              </div>
                            </details>

                            <div className="grid gap-3 sm:grid-cols-2">
                              <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-ink-soft">
                                <p className="font-semibold text-ink">Quick next action</p>
                                <p className="mt-2">
                                  {item.hasNewerEligibleVersion
                                    ? "Open the files again to use the newer eligible version."
                                    : "Use the protected download action if you want the files again right now."}
                                </p>
                              </div>
                              <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-ink-soft">
                                <p className="font-semibold text-ink">Need support?</p>
                                <p className="mt-2">
                                  Open the support area below if you need a refund, need to report a problem, or want to revisit the seller.
                                </p>
                              </div>
                            </div>

                            {item.hasNewerEligibleVersion ? (
                              <div className="rounded-[22px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-900">
                                The seller has refreshed this resource since your purchase. Your protected delivery flow now points to the newest eligible asset version.
                              </div>
                            ) : null}
                          </div>
                        </div>

                        {renderLibrarySupportPanel(item, effectiveRefundStatus)}
                      </article>
                    );
                  })()}
                </div>
              </section>
            ) : null}

            {supportingLibraryItems.length ? (
              <section className="rounded-[32px] border border-black/5 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand">
                      {activeFilter === "all" ? "Everything Else You Own" : "More In This View"}
                    </p>
                    <h2 className="mt-3 text-3xl font-semibold text-ink">
                      {activeFilter === "updated"
                        ? "Other updated purchases in your library"
                        : activeFilter === "support"
                          ? "Other purchases that may need attention"
                          : "Everything else in your library"}
                    </h2>
                    <p className="mt-3 max-w-3xl text-sm leading-7 text-ink-soft">
                      {activeFilter === "all"
                        ? "Use these cards to reopen files, revisit listings, or handle support without leaving your library flow."
                        : "These purchases are grouped from the current filter so the rest of the list stays easy to scan."}
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 xl:grid-cols-2">
                  {supportingLibraryItems.map((item) => (
                (() => {
                  const effectiveRefundStatus =
                    submittedRefundStatuses[item.id] ?? item.refundStatus;
                  const supportingReason = getSupportingLibraryReason(
                    item,
                    effectiveRefundStatus,
                  );

                  return (
                    <article
                      key={item.id}
                      className="rounded-[28px] border border-black/5 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)]"
                      data-testid={`library-item-${item.id}`}
                    >
                      <div className="flex flex-col gap-5">
                        <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-slate-50 shadow-[0_14px_35px_rgba(15,23,42,0.06)]">
                          <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white/90 px-4 py-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
                                {getLibraryPreviewLabel(item)}
                              </p>
                              <HighlightChip
                                className="px-2.5 py-1 text-[11px]"
                                label={supportingReason.label}
                                testId={`library-supporting-reason-${item.id}`}
                                toneClassName={supportingReason.tone}
                              />
                            </div>
                            <p className="text-sm font-semibold text-ink">
                              {formatCurrency(item.amountCents)}
                            </p>
                          </div>
                          <div className="relative">
                            <img
                              alt={`${item.productTitle} purchased preview`}
                              className="aspect-[16/10] w-full bg-slate-100 object-contain object-top"
                              decoding="async"
                              loading="lazy"
                              sizes="(min-width: 1024px) 42vw, 100vw"
                              src={getLibraryPreviewImage(item)}
                            />
                            <div className="absolute inset-x-0 bottom-0 p-4">
                              <div className="rounded-[18px] border border-white/30 bg-gradient-to-t from-slate-950/92 via-slate-900/72 to-slate-900/10 p-4 backdrop-blur-sm">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/72">
                                  Purchased resource
                                </p>
                                <p className="mt-2 line-clamp-2 text-lg font-semibold leading-tight text-white">
                                  {item.productTitle}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <h2 className="text-2xl font-semibold text-ink">{item.productTitle}</h2>
                            <p className="mt-2 text-sm text-ink-soft">Sold by {item.sellerName}</p>
                            {item.hasNewerEligibleVersion ? (
                              <div className="mt-4 inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-800">
                                Updated since your purchase
                              </div>
                            ) : null}
                            <p className="mt-3 text-sm leading-7 text-ink-soft">
                              {item.instructions}
                            </p>
                          </div>
                          <div className="grid gap-3 text-sm text-ink-soft sm:grid-cols-2">
                            <div className="rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand">
                                Version
                              </p>
                              <p className="mt-2 font-medium text-ink">{item.versionLabel}</p>
                            </div>
                            <div className="rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand">
                                Library access
                              </p>
                              <p className="mt-2 font-medium text-ink">{item.accessType}</p>
                            </div>
                            <div className="rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand">
                                Updated
                              </p>
                              <p className="mt-2 font-medium text-brand">{item.updatedLabel}</p>
                            </div>
                            <div className="rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand">
                                Asset health
                              </p>
                              <p className="mt-2 font-medium text-ink">{item.assetHealthStatus}</p>
                            </div>
                          </div>
                        </div>
                      </div>

              <details className="mt-4 rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-ink-soft">
                <summary className="cursor-pointer font-semibold text-ink">More access detail</summary>
                <p className="mt-3">
                  Your library is currently pointing to {item.versionLabel}.{" "}
                  {item.hasNewerEligibleVersion
                    ? `A newer eligible asset version (${item.currentAssetVersion}) is now available for this purchase.`
                    : "When eligible updates are published, this protected delivery flow should move you to the newest allowed version automatically."}
                </p>
              </details>
              {item.hasNewerEligibleVersion ? (
                <div className="mt-4 rounded-[1rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-900">
                  The seller has refreshed this resource since your purchase. Your protected delivery flow now points to the newest eligible asset version.
                </div>
              ) : null}
              {effectiveRefundStatus ? (
                <div className="mt-4 rounded-[1rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
                  Refund status: {effectiveRefundStatus}
                </div>
              ) : null}

              {renderLibrarySupportPanel(item, effectiveRefundStatus)}
                    </article>
                  );
                })()
              ))}
                </div>
              </section>
            ) : null}
          </>
        ) : (
          <article className="rounded-[28px] border border-dashed border-slate-300 bg-white p-8 text-sm leading-7 text-ink-soft">
            <p className="font-semibold text-ink">No purchases yet for {viewer.name}.</p>
            <p className="mt-2">
              Complete a purchase from any live marketplace listing and it will appear here automatically with protected download access, listing follow-up, and support options.
            </p>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {[
                {
                  title: "Preview first",
                  body: "Open product previews before buying so you know what you are choosing.",
                },
                {
                  title: "Save strong options",
                  body: "Use favorites to build a shortlist before checkout.",
                },
                {
                  title: "Return here later",
                  body: "Completed purchases appear in this library for signed-in access.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3"
                >
                  <p className="font-semibold text-ink">{item.title}</p>
                  <p className="mt-1">{item.body}</p>
                </div>
              ))}
            </div>
            {favoriteCount > 0 ? (
              <p
                className="mt-4"
                data-testid="library-empty-shortlist-note"
              >
                You already have {favoriteCount} saved item
                {favoriteCount === 1 ? "" : "s"} waiting in your shortlist if you want a faster
                way back into comparing options.
              </p>
            ) : null}
            <div className="mt-6 flex flex-wrap gap-3">
              {favoriteCount > 0 ? (
                <Link
                  className="inline-flex rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink transition hover:border-slate-300"
                  data-testid="library-empty-view-shortlist"
                  href="/favorites"
                >
                  View shortlist ({favoriteCount} saved)
                </Link>
              ) : null}
              <Link
                className="inline-flex rounded-full bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
                data-testid="library-empty-browse-marketplace"
                href="/marketplace"
              >
                Browse marketplace
              </Link>
            </div>
          </article>
        )}
      </section>
      {message ? <p className="text-sm text-ink-soft">{message}</p> : null}
    </>
  );
}
