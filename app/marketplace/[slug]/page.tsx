import type { Metadata } from "next";
import { BadgeCheck, Download, Eye, FileText, ShieldCheck, Star } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { FavoriteFormButton } from "@/components/marketplace/favorite-form-button";
import { CheckoutButton } from "@/components/marketplace/checkout-button";
import { SiteFooter } from "@/components/layout/site-footer";
import { WatermarkedPreviewStack } from "@/components/marketplace/watermarked-preview-stack";
import { SiteHeader } from "@/components/layout/site-header";
import { ReviewPanel } from "@/components/marketplace/review-panel";
import { buildCheckoutPreviewHref } from "@/lib/lessonforge/checkout-preview";
import {
  buildMarketplaceListingHref,
  getMarketplaceReturnActionLabel,
  getMarketplaceReturnLabel,
  getSafeReturnTo,
  getStorefrontAction,
} from "@/lib/lessonforge/marketplace-navigation";
import {
  getReviewsForProduct,
  getViewerFavoriteProductIds,
  getViewerContext,
} from "@/lib/lessonforge/server-operations";
import {
  getMarketplaceListingBySlug,
  getRelatedListings,
} from "@/lib/lessonforge/server-catalog";
import { formatCurrency } from "@/lib/marketplace/config";
import { buildNoIndexMetadata, buildPageMetadata } from "@/lib/seo/metadata";

function getBestForLabel(listing: Awaited<ReturnType<typeof getMarketplaceListingBySlug>>) {
  if (!listing) {
    return "Flexible classroom use";
  }

  if (listing.reviewSummary.reviewCount >= 10) {
    return "Teachers who want proof before they buy";
  }

  if (listing.assetVersionNumber > 1) {
    return "Buyers who want the latest refreshed assets";
  }

  if (
    listing.sellerTrustLabel === "Trusted seller" ||
    listing.sellerTrustLabel === "Review-backed store"
  ) {
    return "Buyers who prefer stronger seller track records";
  }

  return "Teachers who want a polished ready-to-use resource";
}

function getPurchaseReasons(listing: Awaited<ReturnType<typeof getMarketplaceListingBySlug>>) {
  if (!listing) {
    return [];
  }

  return [
    listing.assetHealthStatus === "Preview and thumbnail ready"
      ? "Protected preview and thumbnail are already ready before purchase."
      : null,
    listing.reviewSummary.reviewCount > 0
      ? `${listing.reviewSummary.reviewCount} verified buyer review${listing.reviewSummary.reviewCount === 1 ? "" : "s"} already support this listing.`
      : "This is an earlier-stage listing, so the preview and seller trust cues matter more than reviews yet.",
    listing.assetVersionNumber > 1
      ? `Current delivery is on asset version ${listing.assetVersionNumber}, showing recent seller updates.`
      : "Current delivery is still on the original protected asset baseline.",
    listing.sellerTrustLabel === "Trusted seller" ||
    listing.sellerTrustLabel === "Review-backed store"
      ? `${listing.sellerName} brings stronger storefront trust history across ${listing.sellerListingCount} listing${listing.sellerListingCount === 1 ? "" : "s"}.`
      : null,
  ].filter(Boolean) as string[];
}

function getRelatedSectionIntro(listing: Awaited<ReturnType<typeof getMarketplaceListingBySlug>>) {
  if (!listing) {
    return "A few nearby picks if you want one more option before checkout.";
  }

  if (listing.sellerListingCount > 1) {
    return `If this exact resource is not the one, compare a few nearby ${listing.subject.toLowerCase()} picks or return to ${listing.sellerName}'s store.`;
  }

  return `If you want one more option before buying, compare a few nearby ${listing.subject.toLowerCase()} picks from the marketplace.`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const listing = await getMarketplaceListingBySlug(slug);

  if (!listing) {
    return buildNoIndexMetadata(
      "Resource not found",
      "This LessonForgeHub marketplace resource could not be found.",
    );
  }

  const description = `${listing.title} is a ${listing.subject} ${listing.gradeBand} classroom resource from ${listing.sellerName}. Preview the listing, review details, and unlock files after verified checkout.`;

  return buildPageMetadata({
    title: listing.title,
    description,
    path: `/marketplace/${listing.slug}`,
    image: listing.thumbnailUrl ?? listing.previewAssets[0]?.previewUrl ?? undefined,
  });
}

export default async function ProductDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const listing = await getMarketplaceListingBySlug(slug);

  if (!listing) {
    notFound();
  }

  const rawReturnTo = resolvedSearchParams.returnTo;
  const rawCheckout = resolvedSearchParams.checkout;
  const returnTo = getSafeReturnTo(
    typeof rawReturnTo === "string" ? rawReturnTo : null,
    "/marketplace",
  );
  const checkoutState = typeof rawCheckout === "string" ? rawCheckout : null;
  const currentListingHref = buildMarketplaceListingHref({
    returnTo,
    slug: listing.slug,
  });
  const returnLabel = getMarketplaceReturnLabel(returnTo);
  const relatedActionLabel = getMarketplaceReturnActionLabel(returnTo);
  const storefrontAction = getStorefrontAction({
    returnTo,
    sellerId: listing.sellerId,
  });
  const [relatedListings, reviews, viewer, favoriteProductIds] = await Promise.all([
    getRelatedListings(listing.subject, listing.id),
    getReviewsForProduct(listing.id),
    getViewerContext(),
    getViewerFavoriteProductIds(),
  ]);
  const checkoutHref = buildCheckoutPreviewHref({
    platformFeeCents: Math.round(listing.priceCents * 0.4),
    priceCents: listing.priceCents,
    productId: listing.id,
    returnTo: currentListingHref,
    sellerId: listing.sellerId,
    sellerName: listing.sellerName,
    teacherPayoutCents: Math.round(listing.priceCents * 0.6),
    title: listing.title,
  });
  const bestForLabel = getBestForLabel(listing);
  const purchaseReasons = getPurchaseReasons(listing);
  const relatedSectionIntro = getRelatedSectionIntro(listing);
  const previewHeroImage = listing.thumbnailUrl ?? listing.previewAssets[0]?.previewUrl ?? null;
  const previewAssetCount = Math.max(listing.previewAssets.length, 1);

  return (
    <main className="page-shell min-h-screen">
      <SiteHeader />

      <section className="px-5 pb-20 pt-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-8">
          <Link className="text-sm font-medium text-ink-soft transition hover:text-ink" href={returnTo}>
            <span data-testid="product-back-marketplace">{returnLabel}</span>
          </Link>

          {checkoutState === "cancelled" ? (
            <section className="rounded-[28px] border border-amber-200 bg-amber-50 px-6 py-5 shadow-[0_18px_50px_rgba(245,158,11,0.10)]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-800">
                    Checkout not completed
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-ink">
                    Nothing was charged for {listing.title}
                  </h2>
                  <p className="mt-2 text-sm leading-7 text-ink-soft">
                    You can review the preview again, save this listing for later, or return to browsing without losing your place.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link
                    className="inline-flex items-center justify-center rounded-full bg-amber-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-700"
                    href={checkoutHref}
                  >
                    Try checkout again
                  </Link>
                  <Link
                    className="inline-flex items-center justify-center rounded-full border border-amber-200 bg-white px-5 py-3 text-sm font-semibold text-amber-900 transition hover:border-amber-300"
                    href={returnTo}
                  >
                    {relatedActionLabel}
                  </Link>
                </div>
              </div>
            </section>
          ) : null}

          <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
            <section className="space-y-8">
              <div className="rounded-[34px] border border-black/5 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:p-8">
                <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-brand">
                  <span>{listing.subject}</span>
                  <span className="rounded-full bg-brand-soft px-3 py-1 tracking-[0.08em] text-brand">
                    {listing.gradeBand}
                  </span>
                </div>
                <h1 className="mt-5 font-[family-name:var(--font-display)] text-4xl leading-tight text-ink sm:text-5xl">
                  {listing.title}
                </h1>
                <p className="mt-5 max-w-3xl text-lg leading-8 text-ink-soft">
                  {listing.fullDescription}
                </p>

                <div className="mt-6 rounded-[1.5rem] border border-sky-100 bg-sky-50/80 px-5 py-4 text-sm leading-6 text-ink-soft">
                  <p className="font-semibold text-ink">Quick path</p>
                  <p className="mt-1">
                    Start with the cover and quick facts, check what is included, then use the protected preview to decide before you buy.
                  </p>
                </div>

                <div className="mt-8 flex flex-wrap gap-3 text-sm text-ink-soft">
                  <span className="rounded-full bg-slate-100 px-4 py-2">
                    {listing.format}
                  </span>
                  <span className="rounded-full bg-slate-100 px-4 py-2">
                    {listing.licenseType}
                  </span>
                  <span className="rounded-full bg-slate-100 px-4 py-2">
                    {listing.standardsTag}
                  </span>
                  <span className="rounded-full bg-slate-100 px-4 py-2">
                    {listing.updatedAtLabel}
                  </span>
                </div>
              </div>

              {listing.assetVersionNumber > 1 ? (
                <section className="rounded-[28px] border border-emerald-200 bg-emerald-50 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.04)]">
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-800">
                    Recently refreshed preview assets
                  </p>
                  <p className="mt-3 text-base leading-7 text-emerald-900">
                    This listing is now on protected asset version {listing.assetVersionNumber}. Preview surfaces and post-purchase delivery have been refreshed since the original baseline release.
                  </p>
                </section>
              ) : null}

              <section className="rounded-[28px] border border-black/5 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-7">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
                      Start here
                    </span>
                    <h2 className="mt-3 text-xl font-semibold text-ink">Quick facts and included files</h2>
                  </div>
                  <p className="max-w-xl text-sm leading-6 text-ink-soft">
                    Scan the essential facts first, then check what the buyer receives and which file formats are included.
                  </p>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-3xl bg-slate-50 p-5">
                    <p className="text-sm text-ink-soft">Grade level</p>
                    <p className="mt-2 text-lg font-semibold text-ink">{listing.gradeBand}</p>
                  </div>
                  <div className="rounded-3xl bg-slate-50 p-5">
                    <p className="text-sm text-ink-soft">Resource type</p>
                    <p className="mt-2 text-lg font-semibold text-ink">{listing.format}</p>
                  </div>
                  <div className="rounded-3xl bg-slate-50 p-5">
                    <p className="text-sm text-ink-soft">License</p>
                    <p className="mt-2 text-lg font-semibold text-ink">{listing.licenseType}</p>
                  </div>
                  <div className="rounded-3xl bg-slate-50 p-5">
                    <p className="text-sm text-ink-soft">Preview pages</p>
                    <p className="mt-2 text-lg font-semibold text-ink">
                      {previewAssetCount} preview page{previewAssetCount === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                  <div>
                    <p className="text-sm font-semibold text-ink">What is included</p>
                    <ul className="mt-4 space-y-3 text-sm leading-6 text-ink-soft">
                      {listing.includedItems.map((item) => (
                        <li key={item} className="flex items-start gap-3">
                          <BadgeCheck className="mt-1 h-4 w-4 shrink-0 text-brand" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-ink">File types</p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      {listing.fileTypes.map((fileType) => (
                        <span
                          key={fileType}
                          className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-ink-soft"
                        >
                          <FileText className="h-4 w-4 text-brand" />
                          {fileType}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              <details
                className="rounded-[28px] border border-black/5 bg-white p-7 shadow-[0_18px_50px_rgba(15,23,42,0.06)]"
                id="selected-preview"
              >
                <summary className="cursor-pointer text-xl font-semibold text-ink">
                  Open buyer confidence summary
                </summary>
                <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-3xl bg-slate-50 p-5">
                    <p className="text-sm text-ink-soft">Verified reviews</p>
                    <p className="mt-2 text-2xl font-semibold text-ink">
                      {listing.reviewSummary.reviewCount}
                    </p>
                  </div>
                  <div className="rounded-3xl bg-slate-50 p-5">
                    <p className="text-sm text-ink-soft">Average rating</p>
                    <p className="mt-2 text-2xl font-semibold text-ink">
                      {listing.reviewSummary.reviewCount
                        ? listing.reviewSummary.averageRating
                        : "New"}
                    </p>
                  </div>
                  <div className="rounded-3xl bg-slate-50 p-5">
                    <p className="text-sm text-ink-soft">Recent momentum</p>
                    <p className="mt-2 text-2xl font-semibold text-ink">
                      {listing.salesVelocityLabel}
                    </p>
                  </div>
                  <div className="rounded-3xl bg-slate-50 p-5">
                    <p className="text-sm text-ink-soft">Issue history</p>
                    <p className="mt-2 text-2xl font-semibold text-ink">
                      {listing.issueCountLabel}
                    </p>
                  </div>
                </div>
                <div className="mt-5 rounded-3xl bg-slate-50 p-5 text-sm leading-7 text-ink-soft">
                  <p className="font-semibold text-ink">{listing.assetHealthStatus}</p>
                  <p className="mt-2">{listing.buyerTrustLabel}</p>
                  <p className="mt-2">
                    Current protected asset version: {listing.assetVersionNumber}
                  </p>
                </div>
              </details>

              <section className="rounded-[28px] border border-black/5 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-7">
                <div className="max-w-3xl">
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand">
                    Product preview
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold text-ink sm:text-3xl">
                    See the product like a buyer would.
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-ink-soft">
                    Start with the cover preview, then scan the preview pages below.
                  </p>
                </div>

                <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                  <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-slate-100 shadow-[0_16px_40px_rgba(15,23,42,0.08)]">
                    {previewHeroImage ? (
                      <img
                        alt={`${listing.title} large preview`}
                        className="h-full max-h-[680px] w-full bg-slate-100 object-contain object-top"
                        decoding="async"
                        loading="eager"
                        sizes="(min-width: 1024px) 60vw, 100vw"
                        src={previewHeroImage}
                      />
                    ) : null}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
                    {listing.previewAssets.slice(0, 3).map((asset, index) => (
                      <a
                        key={asset.id}
                        className="group overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.06)] transition hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(15,23,42,0.1)]"
                        href={asset.previewUrl}
                        target="_blank"
                      >
                        <div className="overflow-hidden bg-slate-100">
                          <img
                            alt={asset.label}
                            className="h-44 w-full bg-slate-100 object-contain object-top transition duration-300 group-hover:scale-[1.02]"
                            decoding="async"
                            loading="lazy"
                            sizes="(min-width: 1024px) 28vw, (min-width: 640px) 33vw, 100vw"
                            src={asset.previewUrl}
                          />
                        </div>
                        <div className="p-4">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand">
                            Preview page {index + 1}
                          </p>
                          <p className="mt-2 text-sm font-semibold leading-6 text-ink">
                            {asset.label}
                          </p>
                          <p className="mt-1 text-xs leading-5 text-ink-soft">
                            {asset.pageRangeLabel}
                          </p>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>

                <div className="mt-6 rounded-[24px] bg-slate-50 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-ink">Preview access</p>
                      <p className="mt-1 text-sm leading-6 text-ink-soft">
                        Buyers can open a few protected preview pages before purchase. Full files unlock after checkout.
                      </p>
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
                      {listing.previewAssets.length} preview page{listing.previewAssets.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    {listing.previewAssets.slice(0, 3).map((asset) => (
                      <div
                        key={`access-${asset.id}`}
                        className="rounded-[20px] bg-white px-4 py-4 text-sm text-ink-soft"
                      >
                        <p className="font-semibold text-ink">{asset.label}</p>
                        <div className="mt-2 space-y-1">
                          <p>{asset.pageRangeLabel}</p>
                          <p>Watermarked preview before purchase</p>
                          <p>Full file unlocks after checkout</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <details className="mt-6 rounded-[24px] bg-slate-50 p-4">
                  <summary className="cursor-pointer text-sm font-semibold text-ink">
                    Open the full protected preview stack
                  </summary>
                  <WatermarkedPreviewStack
                    className="mt-4"
                    format={listing.format}
                    fileTypes={listing.fileTypes}
                    gradeBand={listing.gradeBand}
                    includedItems={listing.includedItems}
                    previewAssets={listing.previewAssets}
                    previewLabels={listing.previewSlides}
                    sellerName={listing.sellerName}
                    standardsTag={listing.standardsTag}
                    subject={listing.subject}
                    summary={listing.summary}
                    title={listing.title}
                  />
                </details>
              </section>

              <section className="rounded-[28px] border border-black/5 bg-white p-7 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="max-w-3xl">
                    <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand">
                      Sell on LessonForge
                    </p>
                    <h2 className="mt-3 text-3xl font-semibold text-ink">
                      Want to sell resources like this too?
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-ink-soft">
                      Start free with one listing, then move into Basic or Pro when you want stronger payout, more AI support, and enough room to publish consistently.
                    </p>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Link
                      className="inline-flex items-center justify-center rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
                      href="/sell/onboarding"
                    >
                      Start selling
                    </Link>
                    <Link
                      className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:border-slate-300"
                      href="/#pricing"
                    >
                      Compare plans
                    </Link>
                  </div>
                </div>

                <div className="mt-6 grid gap-3 md:grid-cols-3">
                  <div className="rounded-[22px] bg-slate-50 px-5 py-4 text-sm leading-6 text-ink-soft">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">
                      Starter
                    </p>
                    <p className="mt-2 font-semibold text-ink">Start with one listing and test demand.</p>
                  </div>
                  <div className="rounded-[22px] border border-brand/15 bg-brand-soft/45 px-5 py-4 text-sm leading-6 text-ink-soft">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">
                      Basic
                    </p>
                    <p className="mt-2 font-semibold text-ink">
                      Most sellers will want this next for better payout, more AI support, and room to keep publishing.
                    </p>
                  </div>
                  <div className="rounded-[22px] bg-slate-50 px-5 py-4 text-sm leading-6 text-ink-soft">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">
                      Pro
                    </p>
                    <p className="mt-2 font-semibold text-ink">
                      Built for heavier selling with the strongest payout and premium growth support.
                    </p>
                  </div>
                </div>
              </section>

              <ReviewPanel
                initialReviews={reviews}
                productId={listing.id}
                productTitle={listing.title}
                viewer={viewer}
              />
            </section>

            <aside className="space-y-8 lg:sticky lg:top-28 lg:self-start">
              <section className="overflow-hidden rounded-[32px] border border-black/5 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
                <div className="border-b border-black/5 px-8 pb-5 pt-7">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">
                    Seller preview
                  </p>
                  <p className="mt-2 text-sm leading-6 text-ink-soft">
                    Start with the cover, then open the first preview page if you want a closer look before checkout.
                  </p>
                </div>

                <div className="space-y-5 p-6">
                  <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-slate-100">
                    {previewHeroImage ? (
                      <img
                        alt={`${listing.title} preview`}
                        className="h-[400px] w-full bg-slate-100 object-contain object-top"
                        decoding="async"
                        loading="lazy"
                        sizes="(min-width: 1024px) 34vw, 100vw"
                        src={previewHeroImage}
                      />
                    ) : (
                      <div className="flex h-[340px] items-end bg-[linear-gradient(180deg,#eff6ff_0%,#ffffff_100%)] p-7">
                        <div className="space-y-3">
                          <span className="inline-flex rounded-full bg-brand-soft px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand">
                            {listing.subject}
                          </span>
                          <h2 className="max-w-[14rem] text-3xl font-semibold leading-tight text-ink">
                            {listing.title}
                          </h2>
                          <p className="text-sm leading-6 text-ink-soft">
                            {listing.gradeBand} · {listing.format}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.14em]">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-ink-soft">
                      {listing.gradeBand}
                    </span>
                    <span className="rounded-full bg-brand-soft px-3 py-1 text-brand">
                      {listing.standardsTag}
                    </span>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">
                      {previewAssetCount} protected preview page{previewAssetCount === 1 ? "" : "s"}
                    </span>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                    <a
                      className="inline-flex min-h-11 items-center justify-center rounded-full bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
                      data-testid="product-preview-jump"
                      href="#selected-preview"
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      See full preview
                    </a>
                    {listing.previewAssets[0]?.previewUrl ? (
                      <Link
                        className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold text-ink transition hover:border-brand/30 hover:text-brand"
                        href={listing.previewAssets[0].previewUrl}
                        target="_blank"
                      >
                        Open cached preview
                      </Link>
                    ) : null}
                  </div>
                </div>
              </section>

              <section className="rounded-[32px] border border-black/5 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:p-8">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">
                  Buy and unlock files
                </p>
                <p className="mt-4 text-4xl font-semibold text-ink">
                  {formatCurrency(listing.priceCents)}
                </p>
                <p className="mt-2 text-sm leading-6 text-ink-soft">
                  {listing.licenseType} license. Buy now and open the full files from your library right after checkout.
                </p>
                <div className="mt-5 grid gap-3">
                  <div className="rounded-[1rem] bg-slate-50 px-4 py-3 text-sm leading-6 text-ink-soft">
                    Secure checkout is handled by Stripe.
                  </div>
                  <div className="rounded-[1rem] bg-slate-50 px-4 py-3 text-sm leading-6 text-ink-soft">
                    Full files unlock after verified payment and stay in your library.
                  </div>
                  <div className="rounded-[1rem] bg-slate-50 px-4 py-3 text-sm leading-6 text-ink-soft">
                    Protected previews let you check the resource before you commit.
                  </div>
                  <div className="rounded-[1rem] bg-slate-50 px-4 py-3 text-sm leading-6 text-ink-soft">
                    Digital purchases are usually final after access is delivered, except for broken files, missing access, misleading listings, duplicate charges, or rights issues.
                  </div>
                  <Link
                    className="rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold leading-6 text-ink transition hover:border-slate-300"
                    data-analytics-event="support_link_clicked"
                    data-analytics-props={JSON.stringify({ surface: "product_purchase_panel" })}
                    href="/support"
                  >
                    Need help before buying? Review support and policies.
                  </Link>
                </div>

                <div className="mt-7 space-y-3">
                  <CheckoutButton
                    className="inline-flex w-full items-center justify-center rounded-full bg-brand px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
                    label="Buy now"
                    productId={listing.id}
                    returnTo={currentListingHref}
                  />
                  {listing.previewAssets[0]?.previewUrl ? (
                    <Link
                      className="inline-flex w-full items-center justify-center rounded-full border border-slate-200 px-5 py-3.5 text-sm font-semibold text-ink transition hover:border-brand/30 hover:text-brand"
                      data-analytics-event="product_preview_opened"
                      data-analytics-props={JSON.stringify({ productId: listing.id, surface: "product_purchase_panel" })}
                      href={listing.previewAssets[0].previewUrl}
                      target="_blank"
                    >
                      Preview before buying
                    </Link>
                  ) : null}
                  <Link
                    className="inline-flex w-full items-center justify-center rounded-full border border-slate-200 px-5 py-3.5 text-sm font-semibold text-ink transition hover:border-brand/30 hover:text-brand"
                    data-analytics-event="checkout_preview_opened"
                    data-analytics-props={JSON.stringify({ productId: listing.id })}
                    href={checkoutHref}
                  >
                    Open checkout preview
                  </Link>
                  {viewer.role === "buyer" ? (
                    <FavoriteFormButton
                      initialFavorited={favoriteProductIds.includes(listing.id)}
                      productId={listing.id}
                      returnTo={currentListingHref}
                      testId={`product-favorite-${listing.id}`}
                    />
                  ) : null}
                </div>
                {viewer.role === "buyer" ? (
                  <div className="mt-4 rounded-[20px] bg-slate-50 px-4 py-4 text-sm leading-6 text-ink-soft">
                    <p className="font-semibold text-ink">Not ready to buy yet?</p>
                    <p className="mt-1">
                      Save this listing for a shorter compare path, or keep browsing if you want one more strong option before checkout.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-3">
                      <Link
                        className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink transition hover:border-slate-300"
                        href="/favorites"
                      >
                        Open saved items
                      </Link>
                      <Link
                        className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink transition hover:border-slate-300"
                        href={returnTo}
                      >
                        Keep browsing
                      </Link>
                    </div>
                  </div>
                ) : null}

                <div className="mt-7 grid gap-3">
                  <div className="rounded-[22px] border border-emerald-100 bg-emerald-50 px-5 py-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-800">
                      Best for
                    </p>
                    <p className="mt-2 text-sm font-semibold text-emerald-950">
                      {bestForLabel}
                    </p>
                  </div>
                  <div className="rounded-[22px] bg-slate-50 px-5 py-4 text-sm leading-6 text-ink-soft">
                    <p className="font-semibold text-ink">Quick buyer check</p>
                    <div className="mt-2 space-y-2">
                      {purchaseReasons.slice(0, 2).map((reason) => (
                        <p key={reason}>{reason}</p>
                      ))}
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="flex items-start gap-3 rounded-[20px] bg-slate-50 px-4 py-4 text-sm text-ink-soft">
                      <ShieldCheck className="mt-0.5 h-4 w-4 text-brand" />
                      Verified purchaser reviews unlock only after completed orders.
                    </div>
                    <div className="flex items-start gap-3 rounded-[20px] bg-slate-50 px-4 py-4 text-sm text-ink-soft">
                      <Download className="mt-0.5 h-4 w-4 text-brand" />
                      Buyers receive download access plus updated versions when eligible.
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-[32px] border border-black/5 bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
                <p className="text-sm uppercase tracking-[0.2em] text-ink-muted">
                  Seller info
                </p>
                <h2 className="mt-4 text-2xl font-semibold text-ink">{listing.sellerName}</h2>
                <p className="mt-2 text-sm text-ink-soft">{listing.sellerHandle}</p>
                <div className="mt-4 inline-flex rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">
                  {listing.sellerTrustLabel}
                </div>
                <div className="mt-6 grid gap-3">
                  <div className="rounded-[22px] bg-slate-50 px-5 py-4">
                    <p className="text-sm text-ink-soft">Store reputation</p>
                    <p className="mt-2 text-lg font-semibold text-ink">
                      {listing.sellerAverageRating} from {listing.sellerTotalReviewCount} reviews
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[22px] bg-slate-50 px-5 py-4">
                      <p className="text-sm text-ink-soft">Published listings</p>
                      <p className="mt-2 text-lg font-semibold text-ink">
                        {listing.sellerListingCount}
                      </p>
                    </div>
                    <div className="rounded-[22px] bg-slate-50 px-5 py-4">
                      <p className="text-sm text-ink-soft">Conversion trend</p>
                      <p className="mt-2 text-lg font-semibold text-ink">
                        {listing.conversionLabel}
                      </p>
                    </div>
                  </div>
                </div>
                <Link
                  className="mt-5 inline-flex text-sm font-semibold text-brand transition hover:text-brand-700"
                  data-testid="product-visit-storefront"
                  href={storefrontAction.href}
                >
                  {storefrontAction.label}
                </Link>

                <details className="mt-6 rounded-[24px] bg-slate-50 px-5 py-4 text-sm text-ink-soft">
                  <summary className="cursor-pointer font-semibold text-ink">
                    More seller detail
                  </summary>
                  <div className="mt-4 grid gap-3">
                    <div className="flex items-center justify-between gap-4 rounded-[18px] bg-white px-4 py-4">
                      <span>Seller trust signal</span>
                      <span className="font-medium text-ink">{listing.sellerTrustLabel}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4 rounded-[18px] bg-white px-4 py-4">
                      <span>Seller payout share</span>
                      <span className="font-medium text-ink">{listing.supportLabel}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4 rounded-[18px] bg-white px-4 py-4">
                      <span>Freshness support</span>
                      <span className="font-medium text-ink">{listing.freshnessScore.toFixed(0)} point boost</span>
                    </div>
                    <div className="flex items-center justify-between gap-4 rounded-[18px] bg-white px-4 py-4">
                      <span>Asset version</span>
                      <span className="font-medium text-ink">Version {listing.assetVersionNumber}</span>
                    </div>
                  </div>
                </details>
              </section>

              <section className="rounded-[30px] border border-black/5 bg-white p-7 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
                <div className="flex items-center gap-2 text-ink">
                  <Star className="h-5 w-5 fill-current text-amber-500" />
                  <span className="font-semibold">
                    {listing.reviewSummary.reviewCount
                      ? `${listing.reviewSummary.averageRating} average from ${listing.reviewSummary.reviewCount} verified buyers`
                      : "No verified reviews yet"}
                  </span>
                </div>
                <p className="mt-4 text-sm leading-6 text-ink-soft">
                  {listing.reviewSummary.reviewCount
                    ? "Reviews appear only after completed orders. That keeps rating quality higher and prevents drive-by feedback from non-buyers."
                    : "This listing has not collected verified buyer reviews yet. Reviews unlock only after real completed orders."}
                </p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[20px] bg-slate-50 px-4 py-4 text-sm text-ink-soft">
                    Seller reputation
                    <p className="mt-1 font-semibold text-ink">
                      {listing.sellerTrustLabel}
                    </p>
                  </div>
                  <div className="rounded-[20px] bg-slate-50 px-4 py-4 text-sm text-ink-soft">
                    Asset readiness
                    <p className="mt-1 font-semibold text-ink">
                      {listing.assetHealthStatus}
                    </p>
                  </div>
                </div>
              </section>
            </aside>
          </div>

          <section className="rounded-[32px] border border-black/5 bg-white p-8 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
            <div className="flex items-center justify-between gap-6">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand">
                  Next options
                </p>
                <h2 className="mt-3 text-3xl font-semibold text-ink">
                  More {listing.subject} picks
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-ink-soft">
                  {relatedSectionIntro}
                </p>
              </div>
              <Link
                className="text-sm font-semibold text-ink-soft transition hover:text-ink"
                data-testid="related-return-action"
                href={returnTo}
              >
                {relatedActionLabel}
              </Link>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {relatedListings.map((related) => (
                <Link
                  key={related.id}
                  className="group overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_14px_36px_rgba(15,23,42,0.06)] transition hover:-translate-y-1 hover:border-brand/30 hover:shadow-[0_22px_50px_rgba(15,23,42,0.12)]"
                  data-testid={`related-product-${related.slug}`}
                  href={buildMarketplaceListingHref({
                    returnTo: currentListingHref,
                    slug: related.slug,
                  })}
                >
                  <div className="relative overflow-hidden bg-slate-100">
                    {related.thumbnailUrl ?? related.previewAssets[0]?.previewUrl ? (
                      <img
                        alt={`${related.title} preview`}
                        className="h-64 w-full bg-slate-100 object-contain object-top transition duration-300 group-hover:scale-[1.02]"
                        decoding="async"
                        loading="lazy"
                        sizes="(min-width: 1024px) 33vw, 100vw"
                        src={related.thumbnailUrl ?? related.previewAssets[0]?.previewUrl ?? undefined}
                      />
                    ) : null}
                    <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4">
                      <span className="rounded-full bg-white/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink shadow-sm">
                        {related.subject}
                      </span>
                      <span className="rounded-full bg-white/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink shadow-sm">
                        {related.gradeBand}
                      </span>
                    </div>
                    <div className="absolute inset-x-0 bottom-0 p-4">
                      <div className="rounded-[20px] border border-white/30 bg-gradient-to-t from-slate-950/92 via-slate-900/72 to-slate-900/10 p-4 backdrop-blur-sm">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/72">
                          {related.format}
                        </p>
                        <h3 className="mt-2 line-clamp-2 text-[1.35rem] font-semibold leading-tight text-white">
                          {related.title}
                        </h3>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 p-5">
                    <p className="line-clamp-2 text-sm leading-6 text-ink-soft">
                      {related.shortDescription}
                    </p>
                    <div className="flex flex-wrap gap-2 text-xs font-medium">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-ink-soft">
                        {related.sellerName}
                      </span>
                      <span className="rounded-full bg-brand-soft px-3 py-1 text-brand">
                        {related.sellerTrustLabel}
                      </span>
                      {related.sellerId === listing.sellerId ? (
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">
                          Same seller
                        </span>
                      ) : null}
                    </div>
                    <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-4">
                      <p className="text-lg font-semibold text-ink">
                        {formatCurrency(related.priceCents)}
                      </p>
                      <span className="text-sm font-semibold text-brand transition group-hover:text-brand-700">
                        Open product
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                className="inline-flex rounded-full bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
                data-testid="related-explore-seller-store"
                href={storefrontAction.href}
              >
                {storefrontAction.label === "Return to storefront"
                  ? "Return to storefront"
                  : "Explore this seller’s store"}
              </Link>
              <Link
                className="inline-flex rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink transition hover:border-slate-300"
                href="/favorites"
              >
                Open saved items
              </Link>
            </div>
          </section>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
