import { ArrowUpRight, BadgeCheck, Star } from "lucide-react";
import Link from "next/link";

import { HighlightChip } from "@/components/buyer/highlight-chip";
import { CheckoutButton } from "@/components/marketplace/checkout-button";
import { FavoriteFormButton } from "@/components/marketplace/favorite-form-button";
import { secondaryActionLinkClassName } from "@/components/shared/secondary-action-link";
import { buildCheckoutPreviewHref } from "@/lib/lessonforge/checkout-preview";
import { buildMarketplaceListingHref } from "@/lib/lessonforge/marketplace-navigation";
import { formatCurrency } from "@/lib/marketplace/config";
import type { MarketplaceListing } from "@/lib/demo/catalog";

function getRankingReasons(listing: MarketplaceListing) {
  const reasons = [
    listing.sellerTrustLabel === "Trusted seller" ||
    listing.sellerTrustLabel === "Review-backed store"
      ? "Trusted seller"
      : null,
    listing.reviewSummary.reviewCount > 0 ? "Review backed" : null,
    listing.assetVersionNumber > 1 ? "Updated assets" : null,
    listing.freshnessScore >= 10 ? "Fresh listing" : null,
    listing.assetHealthStatus === "Preview and thumbnail ready"
      ? "Asset ready"
      : null,
  ].filter(Boolean) as string[];

  return reasons.slice(0, 1);
}

function getFeaturedLabel(listing: MarketplaceListing) {
  if (
    listing.sellerTrustLabel === "Trusted seller" ||
    listing.sellerTrustLabel === "Review-backed store"
  ) {
    return "Trusted seller";
  }

  if (listing.reviewSummary.reviewCount >= 20) {
    return "Buyer favorite";
  }

  if (listing.assetVersionNumber > 1) {
    return "Fresh update";
  }

  if (listing.assetHealthStatus === "Preview and thumbnail ready") {
    return "Strong preview";
  }

  return "Featured listing";
}

function getSubjectTheme(subject: string) {
  switch (subject) {
    case "Math":
      return {
        frame: "border-sky-200 bg-sky-50",
        accent: "bg-sky-500",
        accentSoft: "bg-sky-100 text-sky-800",
        text: "text-sky-900",
        gradient: "from-sky-300 via-sky-100 to-white",
      };
    case "ELA":
      return {
        frame: "border-rose-200 bg-rose-50",
        accent: "bg-rose-500",
        accentSoft: "bg-rose-100 text-rose-800",
        text: "text-rose-900",
        gradient: "from-rose-300 via-rose-100 to-white",
      };
    case "Science":
      return {
        frame: "border-emerald-200 bg-emerald-50",
        accent: "bg-emerald-500",
        accentSoft: "bg-emerald-100 text-emerald-800",
        text: "text-emerald-900",
        gradient: "from-emerald-300 via-emerald-100 to-white",
      };
    default:
      return {
        frame: "border-amber-200 bg-amber-50",
        accent: "bg-amber-500",
        accentSoft: "bg-amber-100 text-amber-800",
        text: "text-amber-900",
        gradient: "from-amber-300 via-amber-100 to-white",
      };
  }
}

export function ProductCard({
  listing,
  initiallyFavorited = false,
  returnTo = "/marketplace",
  testId,
  featured = false,
  buyTestId,
  checkoutReturnTo,
  viewTestId,
}: {
  listing: MarketplaceListing;
  initiallyFavorited?: boolean;
  returnTo?: string;
  testId?: string;
  featured?: boolean;
  buyTestId?: string;
  checkoutReturnTo?: string;
  viewTestId?: string;
}) {
  const rankingReasons = getRankingReasons(listing);
  const listingHref = buildMarketplaceListingHref({
    returnTo,
    slug: listing.slug,
  });
  const checkoutHref = buildCheckoutPreviewHref({
    platformFeeCents: Math.round(listing.priceCents * 0.4),
    priceCents: listing.priceCents,
    productId: listing.id,
    returnTo: checkoutReturnTo ?? listingHref,
    sellerId: listing.sellerId,
    sellerName: listing.sellerName,
    teacherPayoutCents: Math.round(listing.priceCents * 0.6),
    title: listing.title,
  });
  const theme = getSubjectTheme(listing.subject);
  const coverImage = listing.thumbnailUrl ?? listing.previewAssets[0]?.previewUrl;
  const featuredLabel = getFeaturedLabel(listing);

  return (
    <article
      className={`group flex h-full flex-col rounded-[30px] border bg-white p-5 transition duration-300 hover:-translate-y-1 ${
        featured
          ? "border-brand/20 shadow-[0_24px_70px_rgba(37,99,235,0.14)] hover:shadow-[0_30px_90px_rgba(37,99,235,0.18)]"
          : "border-black/5 shadow-[0_18px_50px_rgba(15,23,42,0.06)] hover:shadow-[0_28px_70px_rgba(15,23,42,0.10)]"
      }`}
      data-testid={testId}
    >
      <div className="flex items-start justify-end">
        <FavoriteFormButton
          compact
          initialFavorited={initiallyFavorited}
          productId={listing.id}
          returnTo={returnTo}
          testId={`product-card-favorite-${listing.id}`}
        />
      </div>

      <Link className="block" href={listingHref}>
        <div
          className={`relative overflow-hidden rounded-[24px] border ${theme.frame} ${
            featured ? "shadow-[0_18px_50px_rgba(15,23,42,0.12)]" : "shadow-[0_14px_40px_rgba(15,23,42,0.08)]"
          }`}
        >
          <div className={`absolute inset-0 bg-gradient-to-b ${theme.gradient}`} />
          {coverImage ? (
            <img
              alt={`${listing.title} cover preview`}
              className={`relative z-10 w-full object-cover ${featured ? "aspect-[6/7]" : "aspect-[5/6]"}`}
              src={coverImage}
            />
          ) : (
            <div className="relative z-10 flex aspect-[4/5] flex-col justify-between p-5">
              <div className="flex items-start justify-between gap-3">
                <span className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${theme.accentSoft}`}>
                  {listing.subject}
                </span>
                <span className="rounded-full bg-white/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink">
                  {listing.gradeBand}
                </span>
              </div>
              <div className="rounded-[20px] border border-white/70 bg-white/90 p-4 backdrop-blur">
                <p className={`text-[11px] font-semibold uppercase tracking-[0.24em] ${theme.text}`}>
                  {listing.format}
                </p>
                <h3 className="mt-3 text-3xl font-semibold leading-tight text-ink">
                  {listing.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-ink-soft">
                  {listing.shortDescription}
                </p>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold ${theme.accentSoft}`}>
                  {listing.standardsTag}
                </span>
                <span className="rounded-full bg-slate-950 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white">
                  Preview included
                </span>
              </div>
            </div>
          )}

          <div className="absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-3 p-4">
            <span className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${theme.accentSoft}`}>
              {listing.subject}
            </span>
            <span className="rounded-full bg-white/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink shadow-sm">
              {listing.gradeBand}
            </span>
          </div>

          <div className="absolute inset-x-0 bottom-0 z-20 p-4">
            <div className="overflow-hidden rounded-[22px] border border-white/30 bg-gradient-to-t from-slate-950/90 via-slate-900/68 to-slate-900/8 p-4 shadow-[0_18px_44px_rgba(15,23,42,0.22)] backdrop-blur-sm">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/72">
                {listing.format}
              </p>
              <h3 className={`mt-2 font-semibold leading-tight text-white ${featured ? "line-clamp-3 text-[1.8rem]" : "line-clamp-2 text-[1.32rem]"}`}>
                {listing.title}
              </h3>
              <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-medium">
                {featured ? (
                  <>
                    <HighlightChip
                      className="text-[11px]"
                      label={featuredLabel}
                      toneClassName="bg-white text-slate-900"
                    />
                  </>
                ) : (
                  <HighlightChip
                    className="text-[11px]"
                    label={listing.standardsTag}
                    toneClassName="bg-white/18 text-white"
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </Link>

      <div className="flex flex-1 flex-col justify-between px-2 pb-2 pt-5">
        <Link className="block" href={listingHref}>
          {featured ? (
            <>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-ink-soft">
                Sold by {listing.sellerName}
              </p>
              <p className="mt-3 line-clamp-3 text-sm leading-7 text-ink-soft">
                {listing.shortDescription}
              </p>
            </>
          ) : (
            <>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-ink-soft">
                {listing.sellerName}
              </p>
              <p className="mt-2 line-clamp-2 text-base leading-7 text-ink-soft">
                {listing.shortDescription}
              </p>
            </>
          )}
        </Link>

        <div className="mt-5 space-y-4">
          {featured ? (
            <div className="rounded-[22px] border border-brand/15 bg-brand-soft/70 px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand">
                Why this stands out
              </p>
              <p className="mt-2 text-sm leading-6 text-ink">
                {featuredLabel}
              </p>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-ink-soft">
            <HighlightChip
              label={listing.licenseType}
              toneClassName="bg-brand-soft text-brand"
            />
            {featured ? (
              <HighlightChip
                label={listing.supportLabel}
                toneClassName="bg-slate-100 text-ink-soft"
              />
            ) : null}
            {!featured && rankingReasons[0] ? (
              <HighlightChip
                label={rankingReasons[0]}
                toneClassName="bg-amber-50 text-amber-800"
              />
            ) : null}
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink">
                {featured ? listing.sellerName : listing.sellerTrustLabel}
              </p>
              <p className="text-sm text-ink-soft">
                {featured ? listing.sellerTrustLabel : listing.sellerName}
              </p>
            </div>
            <div className="flex items-center gap-1 text-sm font-semibold text-ink">
              <Star className="h-4 w-4 fill-current text-amber-500" />
              {listing.reviewSummary.averageRating}
              <span className="font-normal text-ink-soft">
                ({listing.reviewSummary.reviewCount})
              </span>
            </div>
          </div>

          <div className="flex items-end justify-between gap-4 border-t border-slate-100 pt-4">
            <div className="min-w-0">
              <p className={`${featured ? "text-[2.2rem]" : "text-2xl"} font-semibold text-ink`}>
                {formatCurrency(listing.priceCents)}
              </p>
              <p className="mt-1 text-xs text-ink-soft">
                Preview first, buy now, or save to compare later
              </p>
            </div>
            <div className="flex min-w-[140px] flex-col items-end gap-2">
              <CheckoutButton
                className={`inline-flex items-center justify-center gap-2 rounded-full ${featured ? "px-5 py-2.5" : "px-4 py-2.5"} bg-brand text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70`}
                fallbackHref={checkoutHref}
                label="Buy now"
                productId={listing.id}
                returnTo={checkoutReturnTo ?? listingHref}
                testId={buyTestId}
              />
              <Link
                className={secondaryActionLinkClassName("px-3.5 py-2")}
                href={listingHref}
                data-testid={viewTestId}
              >
                Open details
                <ArrowUpRight className="h-4 w-4" />
              </Link>
              {returnTo !== "/favorites" ? (
                <Link
                  className="text-xs font-semibold text-ink-soft transition hover:text-ink"
                  href="/favorites"
                >
                  Compare in saved items
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
