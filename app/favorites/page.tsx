import { Heart } from "lucide-react";
import Link from "next/link";

import { AppAccessGate } from "@/components/account/app-access-gate";
import { HighlightChip } from "@/components/buyer/highlight-chip";
import { CheckoutButton } from "@/components/marketplace/checkout-button";
import { ProductCard } from "@/components/marketplace/product-card";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { SectionIntro } from "@/components/shared/section-intro";
import {
  secondaryActionLinkClassName,
  secondaryActionSurfaceClassName,
} from "@/components/shared/secondary-action-link";
import {
  getFavoriteListingsForViewer,
  getViewerContext,
  getViewerFavoriteProductIds,
  listLibraryItems,
} from "@/lib/lessonforge/server-operations";
import { buildCheckoutPreviewHref } from "@/lib/lessonforge/checkout-preview";
import { buildMarketplaceListingHref } from "@/lib/lessonforge/marketplace-navigation";
import { formatCurrency } from "@/lib/marketplace/config";

type FavoriteListing = Awaited<ReturnType<typeof getFavoriteListingsForViewer>>[number];

type FavoritesCompareMode = "all" | "budget" | "trusted" | "updated";

function parseFavoritesCompareMode(value?: string | string[]): FavoritesCompareMode {
  if (typeof value !== "string") {
    return "all";
  }

  if (value === "budget" || value === "trusted" || value === "updated") {
    return value;
  }

  return "all";
}

function buildFavoritesModeHref(mode: FavoritesCompareMode) {
  return mode === "all" ? "/favorites" : `/favorites?mode=${mode}`;
}

function getFeaturedShortlistReason(
  mode: FavoritesCompareMode,
  listing: FavoriteListing | null,
  helpers: {
    lowestPriceListing: FavoriteListing | null;
    strongestProofListing: FavoriteListing | null;
    mostUpdatedListing: FavoriteListing | null;
  },
) {
  if (!listing) {
    return null;
  }

  if (mode === "budget") {
    return {
      label: "Budget mode",
      tone: "border-emerald-200 bg-emerald-50 text-emerald-800",
      body: `One of your lowest-spend shortlist picks at ${formatCurrency(listing.priceCents)}.`,
    };
  }

  if (mode === "trusted") {
    return {
      label: "Trusted mode",
      tone: "border-sky-200 bg-sky-50 text-sky-800",
      body: listing.reviewSummary.reviewCount
        ? `${listing.reviewSummary.reviewCount} review-backed signals make this the strongest proof-led option here.`
        : "This option still leads the trusted view based on seller and buyer proof signals.",
    };
  }

  if (mode === "updated") {
    return {
      label: "Updated mode",
      tone: "border-amber-200 bg-amber-50 text-amber-800",
      body: `Version ${listing.assetVersionNumber} makes this one of the freshest asset sets in your shortlist.`,
    };
  }

  if (helpers.lowestPriceListing?.id === listing.id) {
    return {
      label: "Budget leader",
      tone: "border-emerald-200 bg-emerald-50 text-emerald-800",
      body: `This is currently your lowest-price saved option at ${formatCurrency(listing.priceCents)}.`,
    };
  }

  if (helpers.strongestProofListing?.id === listing.id) {
    return {
      label: "Proof leader",
      tone: "border-sky-200 bg-sky-50 text-sky-800",
      body: "This saved listing has the strongest review-backed proof in your shortlist.",
    };
  }

  if (helpers.mostUpdatedListing?.id === listing.id) {
    return {
      label: "Freshest assets",
      tone: "border-amber-200 bg-amber-50 text-amber-800",
      body: `Version ${listing.assetVersionNumber} makes this the most recently refreshed asset set you saved.`,
    };
  }

  return {
    label: "Balanced pick",
    tone: "border-brand/15 bg-brand-soft/70 text-brand",
    body: "This listing is the strongest overall starting point across price, proof, and asset readiness.",
  };
}

export default async function FavoritesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const activeMode = parseFavoritesCompareMode(params.mode);
  const [viewer, favoriteListings, favoriteProductIds, libraryItems] = await Promise.all([
    getViewerContext(),
    getFavoriteListingsForViewer(),
    getViewerFavoriteProductIds(),
    listLibraryItems(),
  ]);
  const highestFreshnessListing =
    favoriteListings.length > 0
      ? favoriteListings.reduce((best, listing) =>
          listing.freshnessScore > best.freshnessScore ? listing : best,
        )
      : null;
  const lowestPriceListing =
    favoriteListings.length > 0
      ? favoriteListings.reduce((best, listing) =>
          listing.priceCents < best.priceCents ? listing : best,
        )
      : null;
  const strongestProofListing =
    favoriteListings.length > 0
      ? favoriteListings.reduce((best, listing) => {
          const bestScore =
            best.reviewSummary.reviewCount * best.reviewSummary.averageRating;
          const listingScore =
            listing.reviewSummary.reviewCount *
            listing.reviewSummary.averageRating;

          if (listingScore === bestScore) {
            return listing.reviewSummary.reviewCount > best.reviewSummary.reviewCount
              ? listing
              : best;
          }

          return listingScore > bestScore ? listing : best;
        })
      : null;
  const mostUpdatedListing =
    favoriteListings.length > 0
      ? favoriteListings.reduce((best, listing) =>
          listing.assetVersionNumber > best.assetVersionNumber ? listing : best,
        )
      : null;
  const filteredFavoriteListings = favoriteListings.filter((listing) => {
    if (activeMode === "budget") {
      return lowestPriceListing ? listing.priceCents <= lowestPriceListing.priceCents + 300 : true;
    }

    if (activeMode === "trusted") {
      return listing.reviewSummary.reviewCount > 0 || listing.sellerTrustLabel === "Trusted seller";
    }

    if (activeMode === "updated") {
      return mostUpdatedListing
        ? listing.assetVersionNumber >= mostUpdatedListing.assetVersionNumber - 1
        : true;
    }

    return true;
  });
  const focusedCompareListings = Array.from(
    new Map(
      [
        lowestPriceListing,
        strongestProofListing,
        mostUpdatedListing,
        highestFreshnessListing,
      ]
        .filter(
          (listing): listing is FavoriteListing => listing !== null,
        )
        .map((listing) => [listing.id, listing]),
    ).values(),
  ).slice(0, 3);
  const compareHighlights = favoriteListings.map((listing) => {
    const reasons = [
      lowestPriceListing?.id === listing.id
        ? "Lowest price in your shortlist right now."
        : null,
      strongestProofListing?.id === listing.id
        ? "Strongest verified review signal among your saved options."
        : null,
      mostUpdatedListing?.id === listing.id
        ? "Most recently refreshed asset version in this shortlist."
        : null,
      highestFreshnessListing?.id === listing.id
        ? "Newest marketplace freshness boost among your saved listings."
        : null,
      listing.reviewSummary.reviewCount === 0
        ? "Best if you are comfortable trying a newer listing before reviews build up."
        : null,
    ].filter(Boolean) as string[];

    return {
      id: listing.id,
      reasons:
        reasons.length > 0
          ? reasons.slice(0, 2)
          : [
              "Balanced option across price, trust, and asset readiness.",
              "Worth opening the full listing if you want a middle-ground choice.",
            ],
    };
  });
  const filteredCompareHighlights = compareHighlights.filter((entry) =>
    filteredFavoriteListings.some((listing) => listing.id === entry.id),
  );
  const featuredShortlistListing =
    (activeMode === "budget"
      ? filteredFavoriteListings.reduce<FavoriteListing | null>((best, listing) => {
          if (!best || listing.priceCents < best.priceCents) {
            return listing;
          }

          return best;
        }, null)
      : activeMode === "trusted"
        ? filteredFavoriteListings.reduce<FavoriteListing | null>((best, listing) => {
            const bestScore = best
              ? best.reviewSummary.reviewCount * best.reviewSummary.averageRating
              : -1;
            const listingScore =
              listing.reviewSummary.reviewCount * listing.reviewSummary.averageRating;

            return listingScore > bestScore ? listing : best;
          }, null)
        : activeMode === "updated"
          ? filteredFavoriteListings.reduce<FavoriteListing | null>((best, listing) => {
              if (!best || listing.assetVersionNumber > best.assetVersionNumber) {
                return listing;
              }

              return best;
            }, null)
          : focusedCompareListings[0]) ??
    strongestProofListing ??
    lowestPriceListing ??
    mostUpdatedListing ??
    filteredFavoriteListings[0] ??
    null;
  const supportingShortlistListings = filteredFavoriteListings.filter(
    (listing) => listing.id !== featuredShortlistListing?.id,
  );
  const returnTo = "/favorites";
  const featuredShortlistReason = getFeaturedShortlistReason(activeMode, featuredShortlistListing, {
    lowestPriceListing,
    strongestProofListing,
    mostUpdatedListing,
  });
  const activeModeSummary =
    activeMode === "budget"
      ? {
          label: "Budget mode",
          title: `${filteredFavoriteListings.length} shortlist option${
            filteredFavoriteListings.length === 1 ? "" : "s"
          } focused on lower spend`,
          body: "This mode keeps the shortlist centered on your least expensive saved options so you can make a quicker budget-first decision.",
        }
      : activeMode === "trusted"
        ? {
            label: "Trusted mode",
            title: `${filteredFavoriteListings.length} shortlist option${
              filteredFavoriteListings.length === 1 ? "" : "s"
            } with stronger proof`,
            body: "This view narrows the shortlist around review-backed or trust-forward listings so social proof leads the compare.",
          }
        : activeMode === "updated"
          ? {
              label: "Updated mode",
              title: `${filteredFavoriteListings.length} shortlist option${
                filteredFavoriteListings.length === 1 ? "" : "s"
              } with the freshest assets`,
              body: "Use this mode when version freshness matters most and you want the shortlist centered around the newest asset updates.",
            }
          : {
              label: "Full shortlist",
              title: `${favoriteListings.length} saved listing${
                favoriteListings.length === 1 ? "" : "s"
              } ready to compare`,
              body: "Use the full shortlist to compare every saved option, or switch modes below to focus the decision faster.",
            };

  return (
    <main className="page-shell min-h-screen">
      <SiteHeader />

      <section className="px-5 pb-20 pt-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-8">
          <AppAccessGate area="buyer">
          <section className="rounded-[36px] border border-black/5 bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
            <SectionIntro
              body={`${viewer.name} can use this shortlist to compare saved options and move into the best next listing faster.`}
              eyebrow="Saved products"
              level="h1"
              title="Compare saved listings before you buy."
              titleClassName="text-5xl leading-tight"
            />
            <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
              <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-5 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
                    {activeModeSummary.label}
                  </p>
                  <HighlightChip
                    label={
                      activeMode === "all"
                        ? "All saved listings"
                        : activeMode === "budget"
                          ? "Budget mode"
                          : activeMode === "trusted"
                            ? "Trusted mode"
                            : "Updated mode"
                    }
                    testId="favorites-active-mode-pill"
                    toneClassName="bg-white text-ink shadow-sm"
                  />
                  {activeMode !== "all" ? (
                    <Link
                      className={secondaryActionLinkClassName("px-3 py-1 text-xs")}
                      data-testid="favorites-clear-mode"
                      href="/favorites"
                    >
                      Clear mode
                    </Link>
                  ) : null}
                </div>
                <h2 className="mt-3 text-2xl font-semibold text-ink">{activeModeSummary.title}</h2>
                <p className="mt-3 text-sm leading-7 text-ink-soft">{activeModeSummary.body}</p>
              </div>
              <div className="rounded-[24px] border border-slate-200 bg-white px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
                  Compare modes
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {[
                    { key: "all", label: `All (${favoriteListings.length})` },
                    { key: "budget", label: "Budget" },
                    { key: "trusted", label: "Trusted" },
                    { key: "updated", label: "Updated" },
                  ].map((mode) => (
                    <Link
                      key={mode.key}
                      className={`rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                        activeMode === mode.key
                          ? "bg-brand text-white"
                          : secondaryActionSurfaceClassName("px-4 py-2.5")
                      }`}
                      data-testid={`favorites-mode-${mode.key}`}
                      href={buildFavoritesModeHref(mode.key as FavoritesCompareMode)}
                    >
                      {mode.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-4 rounded-[1.5rem] bg-slate-50 px-4 py-4 text-sm leading-6 text-ink-soft">
              <p className="font-semibold text-ink">Start with one saved pick</p>
              <p className="mt-1">
                Open the option that wins on price, proof, or freshness first. Use compare modes only when you need a narrower view.
              </p>
            </div>
          </section>

          {favoriteListings.length ? (
            <>
              {filteredFavoriteListings.length === 0 ? (
                <section className="rounded-[32px] border border-dashed border-slate-300 bg-white p-10 text-center shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand">
                    No saved listings in this compare mode
                  </p>
                  <h2 className="mt-4 text-3xl font-semibold text-ink">
                    Try a different shortlist mode.
                  </h2>
                  <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-ink-soft">
                    This mode does not match any of your current saved listings yet. Switch back to the full shortlist or try another compare view.
                  </p>
                  <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                    <Link
                      className="inline-flex rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
                      data-testid="favorites-empty-clear-mode"
                      href="/favorites"
                    >
                      Back to full shortlist
                    </Link>
                  </div>
                </section>
              ) : null}

              <details className="rounded-[32px] border border-black/5 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
                <summary className="cursor-pointer text-xl font-semibold text-ink">
                  Open shortlist highlights
                </summary>
                <div className="mt-5 grid gap-4 xl:grid-cols-3">
                  {lowestPriceListing ? (
                    <article className="rounded-[28px] border border-emerald-100 bg-emerald-50/80 p-6 shadow-[0_16px_40px_rgba(16,185,129,0.08)]">
                      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-700">
                        Best budget pick
                      </p>
                      <h2 className="mt-3 text-2xl font-semibold text-ink">
                        {lowestPriceListing.title}
                      </h2>
                      <p className="mt-3 text-sm leading-6 text-ink-soft">
                        Lowest price in your shortlist at {formatCurrency(lowestPriceListing.priceCents)}.
                      </p>
                    </article>
                  ) : null}

                  {strongestProofListing ? (
                    <article className="rounded-[28px] border border-sky-100 bg-sky-50/80 p-6 shadow-[0_16px_40px_rgba(14,165,233,0.08)]">
                      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-sky-700">
                        Best social proof
                      </p>
                      <h2 className="mt-3 text-2xl font-semibold text-ink">
                        {strongestProofListing.title}
                      </h2>
                      <p className="mt-3 text-sm leading-6 text-ink-soft">
                        Strongest review signal in your shortlist with {strongestProofListing.reviewSummary.reviewCount || 0} verified reviews.
                      </p>
                    </article>
                  ) : null}

                  {mostUpdatedListing ? (
                    <article className="rounded-[28px] border border-amber-100 bg-amber-50/80 p-6 shadow-[0_16px_40px_rgba(245,158,11,0.08)]">
                      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-amber-700">
                        Best for latest assets
                      </p>
                      <h2 className="mt-3 text-2xl font-semibold text-ink">
                        {mostUpdatedListing.title}
                      </h2>
                      <p className="mt-3 text-sm leading-6 text-ink-soft">
                        Highest asset version in your shortlist at Version {mostUpdatedListing.assetVersionNumber}.
                      </p>
                    </article>
                  ) : null}
                </div>
              </details>

              <section className="rounded-[32px] border border-black/5 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand">
                      Quick decision guide
                    </p>
                    <h2 className="mt-3 text-3xl font-semibold text-ink">
                      Pick the saved listing that stands out fastest
                    </h2>
                    <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-soft">
                      Use this as the fast scan before opening full details or moving into checkout.
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 lg:grid-cols-2">
                  {filteredFavoriteListings.map((listing) => {
                    const highlight = filteredCompareHighlights.find(
                      (entry) => entry.id === listing.id,
                    );

                    return (
                      <article
                        key={`guide-${listing.id}`}
                        className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-5"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">
                              {listing.subject} · {listing.resourceType}
                            </p>
                            <h3 className="mt-2 text-xl font-semibold text-ink">
                              {listing.title}
                            </h3>
                          </div>
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink-soft">
                            {formatCurrency(listing.priceCents)}
                          </span>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium text-ink-soft">
                          <span className="rounded-full bg-white px-3 py-1">
                            {listing.reviewSummary.reviewCount
                              ? `${listing.reviewSummary.averageRating} stars`
                              : "No reviews yet"}
                          </span>
                          <span className="rounded-full bg-white px-3 py-1">
                            Version {listing.assetVersionNumber}
                          </span>
                          <span className="rounded-full bg-white px-3 py-1">
                            Freshness {listing.freshnessScore}/10
                          </span>
                        </div>

                        <div className="mt-4 space-y-2 text-sm leading-6 text-ink-soft">
                          {highlight?.reasons.map((reason) => (
                            <p key={`${listing.id}-${reason}`}>• {reason}</p>
                          ))}
                        </div>

                        <div className="mt-5 flex flex-wrap gap-3">
                          <Link
                            className="inline-flex rounded-full bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
                            href={buildMarketplaceListingHref({
                              returnTo,
                              slug: listing.slug,
                            })}
                          >
                            Open full details
                          </Link>
                          <CheckoutButton
                            className="inline-flex rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-70"
                            fallbackHref={buildCheckoutPreviewHref({
                              platformFeeCents: Math.round(listing.priceCents * 0.4),
                              priceCents: listing.priceCents,
                              productId: listing.id,
                              returnTo,
                              sellerId: listing.sellerId,
                              sellerName: listing.sellerName,
                              teacherPayoutCents: Math.round(listing.priceCents * 0.6),
                              title: listing.title,
                            })}
                            label="Buy from shortlist"
                            productId={listing.id}
                            returnTo={returnTo}
                          />
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>

              {focusedCompareListings.length >= 2 ? (
                <details className="rounded-[32px] border border-black/5 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
                  <summary className="cursor-pointer text-3xl font-semibold text-ink">
                    Open focused compare table
                  </summary>
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand">
                    Comparison view
                  </p>
                  <p className="mt-4 max-w-3xl text-sm leading-6 text-ink-soft">
                    This tighter compare view pulls the strongest options by price, proof, freshness, and recent asset updates so you can make a faster final call.
                  </p>

                  <div className="mt-6 overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-left text-sm text-ink-soft">
                      <thead>
                        <tr>
                          <th className="px-4 py-3 font-semibold text-ink">Criteria</th>
                          {focusedCompareListings.map((listing) => (
                            <th
                              key={`focused-head-${listing.id}`}
                              className="px-4 py-3 font-semibold text-ink"
                            >
                              <div className="space-y-1">
                                <p>{listing.title}</p>
                                <p className="text-xs font-medium text-ink-soft">
                                  {listing.subject} · {listing.resourceType}
                                </p>
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        <tr>
                          <td className="px-4 py-3 font-medium text-ink">Best for</td>
                          {focusedCompareListings.map((listing) => {
                            let label = "Balanced choice";

                            if (lowestPriceListing?.id === listing.id) {
                              label = "Saving money";
                            } else if (strongestProofListing?.id === listing.id) {
                              label = "Buying with proof";
                            } else if (mostUpdatedListing?.id === listing.id) {
                              label = "Latest asset refresh";
                            } else if (highestFreshnessListing?.id === listing.id) {
                              label = "Trying a newer listing";
                            }

                            return (
                              <td
                                key={`focused-best-for-${listing.id}`}
                                className="px-4 py-3"
                              >
                                {label}
                              </td>
                            );
                          })}
                        </tr>
                        <tr>
                          <td className="px-4 py-3 font-medium text-ink">Price</td>
                          {focusedCompareListings.map((listing) => (
                            <td
                              key={`focused-price-${listing.id}`}
                              className="px-4 py-3"
                            >
                              {formatCurrency(listing.priceCents)}
                            </td>
                          ))}
                        </tr>
                        <tr>
                          <td className="px-4 py-3 font-medium text-ink">Verified reviews</td>
                          {focusedCompareListings.map((listing) => (
                            <td
                              key={`focused-reviews-${listing.id}`}
                              className="px-4 py-3"
                            >
                              {listing.reviewSummary.reviewCount
                                ? `${listing.reviewSummary.averageRating} (${listing.reviewSummary.reviewCount})`
                                : "No reviews yet"}
                            </td>
                          ))}
                        </tr>
                        <tr>
                          <td className="px-4 py-3 font-medium text-ink">Asset version</td>
                          {focusedCompareListings.map((listing) => (
                            <td
                              key={`focused-version-${listing.id}`}
                              className="px-4 py-3"
                            >
                              Version {listing.assetVersionNumber}
                            </td>
                          ))}
                        </tr>
                        <tr>
                          <td className="px-4 py-3 font-medium text-ink">Freshness</td>
                          {focusedCompareListings.map((listing) => (
                            <td
                              key={`focused-freshness-${listing.id}`}
                              className="px-4 py-3"
                            >
                              {listing.freshnessScore}/10
                            </td>
                          ))}
                        </tr>
                        <tr>
                          <td className="px-4 py-3 font-medium text-ink">Trust</td>
                          {focusedCompareListings.map((listing) => (
                            <td
                              key={`focused-trust-${listing.id}`}
                              className="px-4 py-3"
                            >
                              {listing.buyerTrustLabel}
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </details>
              ) : null}

              {featuredShortlistListing ? (
                <section className="rounded-[32px] border border-black/5 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand">
                        Featured shortlist listing
                      </p>
                      <h2 className="mt-3 text-3xl font-semibold text-ink">
                        Start here
                      </h2>
                      <p className="mt-3 max-w-3xl text-sm leading-7 text-ink-soft">
                        This is the strongest next listing to open from your shortlist right now.
                      </p>
                      {featuredShortlistReason ? (
                        <HighlightChip
                          bordered
                          body={featuredShortlistReason.body}
                          className="mt-4"
                          label={featuredShortlistReason.label}
                          testId="favorites-featured-mode-reason"
                          toneClassName={featuredShortlistReason.tone}
                        />
                      ) : null}
                    </div>
                    <form action="/favorites/toggle" method="post">
                      <input name="productId" type="hidden" value={featuredShortlistListing.id} />
                      <input name="returnTo" type="hidden" value={returnTo} />
                      <button
                        className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition"
                        data-testid={`favorite-remove-${featuredShortlistListing.id}`}
                        type="submit"
                      >
                        <Heart className="h-4 w-4 fill-current" />
                        Remove
                      </button>
                    </form>
                  </div>

                  <div className="mt-7">
                    <ProductCard
                      buyTestId={`favorite-buy-${featuredShortlistListing.id}`}
                      checkoutReturnTo={returnTo}
                      featured
                      initiallyFavorited={favoriteProductIds.includes(featuredShortlistListing.id)}
                      listing={featuredShortlistListing}
                      returnTo={returnTo}
                      testId={`favorite-featured-${featuredShortlistListing.id}`}
                      viewTestId={`favorite-view-${featuredShortlistListing.id}`}
                    />
                  </div>
                </section>
              ) : null}

              {supportingShortlistListings.length ? (
                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3">
                  {supportingShortlistListings.map((listing) => (
                    <div
                      key={listing.id}
                      className="rounded-[30px] border border-black/5 bg-white p-4 shadow-[0_18px_50px_rgba(15,23,42,0.06)]"
                    >
                      <div className="mb-4 flex items-center justify-between gap-3 px-2">
                        <div className="flex flex-wrap gap-2 text-xs font-medium text-ink-soft">
                          <span className="rounded-full bg-brand-soft px-3 py-1 text-brand">
                            {listing.gradeBand}
                          </span>
                          <span className="rounded-full bg-slate-100 px-3 py-1">
                            {listing.resourceType}
                          </span>
                          <span className="rounded-full bg-slate-100 px-3 py-1">
                            {listing.licenseType}
                          </span>
                        </div>
                        <form action="/favorites/toggle" method="post">
                          <input name="productId" type="hidden" value={listing.id} />
                          <input name="returnTo" type="hidden" value={returnTo} />
                          <button
                            className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition"
                            data-testid={`favorite-remove-${listing.id}`}
                            type="submit"
                          >
                            <Heart className="h-4 w-4 fill-current" />
                            Remove
                          </button>
                        </form>
                      </div>

                      <ProductCard
                        buyTestId={`favorite-buy-${listing.id}`}
                        checkoutReturnTo={returnTo}
                        initiallyFavorited={favoriteProductIds.includes(listing.id)}
                        listing={listing}
                        returnTo={returnTo}
                        testId={`favorite-card-${listing.id}`}
                        viewTestId={`favorite-view-${listing.id}`}
                      />
                    </div>
                  ))}
                </section>
              ) : null}

              <section className="rounded-[32px] border border-black/5 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand">
                  Comparison view
                </p>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-soft">
                  Use this as the quick tradeoff sheet after the cards above if you still need one tighter side-by-side view.
                </p>
                <div className="mt-5 overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-left text-sm text-ink-soft">
                    <thead>
                      <tr>
                        <th className="px-4 py-3 font-semibold text-ink">Listing</th>
                        <th className="px-4 py-3 font-semibold text-ink">Price</th>
                        <th className="px-4 py-3 font-semibold text-ink">Reviews</th>
                        <th className="px-4 py-3 font-semibold text-ink">Asset version</th>
                        <th className="px-4 py-3 font-semibold text-ink">Trust</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredFavoriteListings.map((listing) => (
                        <tr key={`compare-${listing.id}`}>
                          <td className="px-4 py-3 font-medium text-ink">{listing.title}</td>
                          <td className="px-4 py-3">{formatCurrency(listing.priceCents)}</td>
                          <td className="px-4 py-3">
                            {listing.reviewSummary.reviewCount
                              ? `${listing.reviewSummary.averageRating} (${listing.reviewSummary.reviewCount})`
                              : "No reviews yet"}
                          </td>
                          <td className="px-4 py-3">Version {listing.assetVersionNumber}</td>
                          <td className="px-4 py-3">{listing.buyerTrustLabel}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          ) : (
            <section className="rounded-[32px] border border-dashed border-slate-300 bg-white p-10 text-center shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand">
                No saved listings yet
              </p>
              <h2 className="mt-4 text-3xl font-semibold text-ink">
                Save a few listings and compare them here.
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-ink-soft">
                Your shortlist helps you compare price, reviews, and asset trust before committing to a purchase.
              </p>
              {libraryItems.length ? (
                <p
                  className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-ink-soft"
                  data-testid="favorites-empty-library-note"
                >
                  You already have {libraryItems.length} purchased resource
                  {libraryItems.length === 1 ? "" : "s"} in your library if you want
                  to reopen something you already own before saving more listings.
                </p>
              ) : null}
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                {libraryItems.length ? (
                  <Link
                    className="inline-flex rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:border-slate-300"
                    data-testid="favorites-empty-view-library"
                    href="/library"
                  >
                    View library ({libraryItems.length} purchased)
                  </Link>
                ) : null}
                <Link
                  className="inline-flex rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
                  data-testid="favorites-empty-browse-marketplace"
                  href="/marketplace"
                >
                  Browse marketplace
                </Link>
              </div>
            </section>
          )}
          </AppAccessGate>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
