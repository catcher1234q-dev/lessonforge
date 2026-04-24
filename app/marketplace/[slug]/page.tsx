import type { Metadata } from "next";
import { BadgeCheck, Eye, FileText, Flag, LifeBuoy } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CheckoutButton } from "@/components/marketplace/checkout-button";
import { ProductImageGallery } from "@/components/marketplace/product-image-gallery";
import { ProductCard } from "@/components/marketplace/product-card";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import {
  buildMarketplaceListingHref,
  getMarketplaceReturnLabel,
  getSafeReturnTo,
  getStorefrontAction,
} from "@/lib/lessonforge/marketplace-navigation";
import {
  getMarketplaceListingBySlug,
  getRelatedListings,
} from "@/lib/lessonforge/server-catalog";
import { formatCurrency } from "@/lib/marketplace/config";
import { buildNoIndexMetadata, buildPageMetadata } from "@/lib/seo/metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const listing = await getMarketplaceListingBySlug(slug);

  if (!listing) {
    return buildNoIndexMetadata(
      "Marketplace listing not found",
      "This LessonForgeHub marketplace listing could not be found.",
    );
  }

  return buildPageMetadata({
    title: listing.title,
    description: `${listing.title} is a ${listing.subject} marketplace listing on LessonForgeHub with preview images, seller details, and digital download purchase information.`,
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
  const returnTo = getSafeReturnTo(
    typeof rawReturnTo === "string" ? rawReturnTo : null,
    "/marketplace",
  );
  const currentListingHref = buildMarketplaceListingHref({
    returnTo,
    slug: listing.slug,
  });
  const returnLabel = getMarketplaceReturnLabel(returnTo);
  const storefrontAction = getStorefrontAction({
    returnTo,
    sellerId: listing.sellerId,
  });
  const relatedListings = await getRelatedListings(listing.subject, listing.id);
  const previewHeroImage = listing.thumbnailUrl ?? listing.previewAssets[0]?.previewUrl ?? null;
  const previewAssetCount = Math.max(listing.previewAssets.length, 1);
  const pageCount = listing.pageCount || 0;
  const answerKeyIncluded = listing.includedItems.some((item) =>
    /answer/i.test(item),
  );
  const reportHref = `/report-product?productId=${encodeURIComponent(listing.id)}&title=${encodeURIComponent(listing.title)}&returnTo=${encodeURIComponent(currentListingHref)}`;

  return (
    <main className="page-shell min-h-screen">
      <SiteHeader />

      <section className="px-4 pb-16 pt-6 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-6">
          <Link className="text-sm font-medium text-ink-soft transition hover:text-ink" href={returnTo}>
            {returnLabel}
          </Link>

          <section className="rounded-[24px] border border-emerald-200 bg-emerald-50 px-5 py-4 shadow-[0_14px_40px_rgba(16,185,129,0.10)]">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-800">
              Digital marketplace listing
            </p>
            <p className="mt-2 text-sm leading-6 text-emerald-950">
              Buyers receive digital downloads through LessonForgeHub. Listings stay subject to review and may be removed if they violate marketplace policy.
            </p>
          </section>

          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="space-y-6">
              <section className="rounded-[30px] border border-black/5 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-8">
                <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-brand">
                  <span>{listing.subject}</span>
                  <span className="rounded-full bg-brand-soft px-3 py-1 tracking-[0.08em] text-brand">
                    {listing.gradeBand}
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-ink-soft">
                    Digital download
                  </span>
                </div>
                <h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl leading-tight text-ink sm:text-5xl">
                  {listing.title}
                </h1>
                <p className="mt-4 max-w-3xl text-base leading-8 text-ink-soft sm:text-lg">
                  {listing.fullDescription}
                </p>

                <div className="mt-6 rounded-[24px] border border-sky-100 bg-sky-50/70 px-5 py-4 text-sm leading-6 text-ink-soft">
                  <p className="font-semibold text-ink">What this preview shows</p>
                  <p className="mt-1">
                    Preview shows real pages from the full product so buyers can see the layout, directions, and level of rigor before checkout.
                  </p>
                </div>

                <div className="mt-6 flex flex-wrap gap-2 text-sm text-ink-soft">
                  <span className="rounded-full bg-slate-100 px-4 py-2">{listing.format}</span>
                  <span className="rounded-full bg-slate-100 px-4 py-2">{listing.resourceType}</span>
                  {pageCount ? (
                    <span className="rounded-full bg-slate-100 px-4 py-2">
                      {pageCount} PDF page{pageCount === 1 ? "" : "s"}
                    </span>
                  ) : null}
                  <span className="rounded-full bg-slate-100 px-4 py-2">{listing.standardsTag}</span>
                </div>

                <div className="mt-4 flex flex-wrap gap-2 text-sm text-ink-soft">
                  {listing.tags.map((tag) => (
                    <span key={tag} className="rounded-full border border-slate-200 bg-white px-4 py-2">
                      {tag}
                    </span>
                  ))}
                </div>
              </section>

              <section className="rounded-[30px] border border-black/5 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-7">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
                      Listing details
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-ink">Quick facts and included files</h2>
                  </div>
                  <p className="max-w-xl text-sm leading-6 text-ink-soft">
                    Keep the essentials easy to scan so teachers can tell right away whether a resource fits.
                  </p>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-3xl bg-slate-50 p-5">
                    <p className="text-sm text-ink-soft">Grade level</p>
                    <p className="mt-2 text-lg font-semibold text-ink">{listing.gradeBand}</p>
                  </div>
                  <div className="rounded-3xl bg-slate-50 p-5">
                    <p className="text-sm text-ink-soft">Subject</p>
                    <p className="mt-2 text-lg font-semibold text-ink">{listing.subject}</p>
                  </div>
                  <div className="rounded-3xl bg-slate-50 p-5">
                    <p className="text-sm text-ink-soft">Resource type</p>
                    <p className="mt-2 text-lg font-semibold text-ink">{listing.format}</p>
                  </div>
                  <div className="rounded-3xl bg-slate-50 p-5">
                    <p className="text-sm text-ink-soft">File type</p>
                    <p className="mt-2 text-lg font-semibold text-ink">{listing.fileTypes.join(", ")}</p>
                  </div>
                  <div className="rounded-3xl bg-slate-50 p-5">
                    <p className="text-sm text-ink-soft">Page count</p>
                    <p className="mt-2 text-lg font-semibold text-ink">
                      {pageCount ? `${pageCount} pages` : "Included in file"}
                    </p>
                  </div>
                  <div className="rounded-3xl bg-slate-50 p-5">
                    <p className="text-sm text-ink-soft">Standards</p>
                    <p className="mt-2 text-lg font-semibold text-ink">{listing.standardsTag}</p>
                  </div>
                  <div className="rounded-3xl bg-slate-50 p-5">
                    <p className="text-sm text-ink-soft">Preview pages</p>
                    <p className="mt-2 text-lg font-semibold text-ink">
                      {previewAssetCount} page{previewAssetCount === 1 ? "" : "s"}
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
                    <div className="mt-5 grid gap-3 text-sm leading-6 text-ink-soft">
                      {answerKeyIncluded ? (
                        <p className="rounded-2xl bg-slate-50 px-4 py-3">
                          Answer key support is included in the file for teacher review and quick checking.
                        </p>
                      ) : null}
                      <p className="rounded-2xl bg-slate-50 px-4 py-3">
                        This is a digital download delivered through LessonForgeHub after purchase.
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <section
                className="rounded-[30px] border border-black/5 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-7"
                id="selected-preview"
              >
                <div className="max-w-3xl">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
                    Product preview
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-ink sm:text-3xl">
                    Preview pages stay visible near the top.
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-ink-soft">
                    Buyers should be able to open the listing and see real inside pages from the exact file they will download, without guessing what the resource actually looks like.
                  </p>
                </div>

                <div className="mt-6">
                  <ProductImageGallery
                    coverImageUrl={listing.thumbnailUrl ?? null}
                    pageCount={pageCount}
                    previewLabels={listing.previewSlides}
                    previewImageUrls={listing.previewAssets.map((asset) => asset.previewUrl)}
                    title={listing.title}
                  />
                </div>
              </section>
            </section>

            <aside className="space-y-6 lg:sticky lg:top-28 lg:self-start">
              <section className="overflow-hidden rounded-[30px] border border-black/5 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
                <div className="overflow-hidden border-b border-black/5 bg-slate-100">
                  {previewHeroImage ? (
                    <img
                      alt={`${listing.title} preview`}
                      className="aspect-[3/4] w-full bg-slate-100 object-contain"
                      decoding="async"
                      loading="lazy"
                      sizes="(min-width: 1024px) 34vw, 100vw"
                      src={previewHeroImage}
                    />
                  ) : (
                    <div className="flex aspect-[3/4] items-end bg-[linear-gradient(180deg,#eff6ff_0%,#ffffff_100%)] p-6">
                      <div className="rounded-[20px] border border-white/80 bg-white/92 p-4 backdrop-blur">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand">
                          {listing.subject}
                        </p>
                        <h2 className="mt-2 text-3xl font-semibold leading-tight text-ink">
                          {listing.title}
                        </h2>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4 p-6">
                  <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.14em]">
                    <span className="rounded-full bg-slate-950 px-3 py-1 text-white">Live listing</span>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-800">
                      {formatCurrency(listing.priceCents)}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-ink-soft">
                      {previewAssetCount} preview page{previewAssetCount === 1 ? "" : "s"}
                    </span>
                  </div>

                  <p className="text-sm leading-6 text-ink-soft">
                    Buy through LessonForgeHub, return to your library after purchase, and use the report path if a listing looks broken, misleading, or outside policy.
                  </p>

                  <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
                      How delivery and refunds work
                    </p>
                    <div className="mt-3 grid gap-3 text-sm leading-6 text-ink-soft">
                      {pageCount ? <p>{pageCount}-page PDF file included with this listing.</p> : null}
                      <p>LessonForgeHub sells digital educational downloads only. No physical products are sold or shipped.</p>
                      <p>Access is delivered after purchase.</p>
                      <p>
                        Refunds are reviewed under the{" "}
                        <Link className="font-semibold text-brand transition hover:text-brand-700" href="/refund-policy">
                          Refund Policy
                        </Link>
                        .
                      </p>
                      <p>Products are sold by independent sellers on LessonForgeHub.</p>
                    </div>
                  </div>

                  <CheckoutButton
                    className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
                    label="Buy now"
                    productId={listing.id}
                    returnTo={currentListingHref}
                    testId="product-page-buy-now"
                  />
                  <p className="text-center text-xs leading-5 text-ink-soft">
                    Instant download after purchase · Digital product, no shipping
                  </p>

                  <div className="flex flex-col gap-3">
                    <a
                      className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 px-4 py-3 text-sm font-semibold text-ink transition hover:border-brand/30 hover:text-brand"
                      data-testid="product-preview-jump"
                      href="#selected-preview"
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Jump to preview
                    </a>
                    <Link
                      className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 px-4 py-3 text-sm font-semibold text-ink transition hover:border-slate-300"
                      href={reportHref}
                    >
                      <Flag className="mr-2 h-4 w-4" />
                      Report product
                    </Link>
                    <Link
                      className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 px-4 py-3 text-sm font-semibold text-ink transition hover:border-slate-300"
                      href="/support"
                    >
                      <LifeBuoy className="mr-2 h-4 w-4" />
                      Support
                    </Link>
                  </div>

                  <p className="text-center text-xs leading-5 text-ink-soft">
                    Questions before buying? Contact{" "}
                    <a className="font-semibold text-brand transition hover:text-brand-700" href="mailto:support@lessonforgehub.com">
                      support@lessonforgehub.com
                    </a>
                    .
                  </p>
                </div>
              </section>

              <section className="rounded-[28px] border border-black/5 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
                  Policy notes
                </p>
                <div className="mt-4 grid gap-3">
                  <div className="rounded-[20px] bg-slate-50 px-4 py-4 text-sm leading-6 text-ink-soft">
                    Products are subject to review and may be removed if they violate marketplace policy.
                  </div>
                  <div className="rounded-[20px] bg-slate-50 px-4 py-4 text-sm leading-6 text-ink-soft">
                    Buyers can report products that look broken, misleading, copied, or otherwise unsafe.
                  </div>
                  <div className="rounded-[20px] bg-slate-50 px-4 py-4 text-sm leading-6 text-ink-soft">
                    Digital refunds are limited after access except for broken files, unusable files, undelivered purchases, or verified listing problems.
                  </div>
                </div>
              </section>

              <section className="rounded-[28px] border border-black/5 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
                  Seller example
                </p>
                <h2 className="mt-3 text-2xl font-semibold text-ink">{listing.sellerName}</h2>
                <p className="mt-2 text-sm text-ink-soft">{listing.sellerHandle}</p>
                <div className="mt-4 inline-flex rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">
                  {listing.sellerTrustLabel}
                </div>
                <Link
                  className="mt-5 inline-flex text-sm font-semibold text-brand transition hover:text-brand-700"
                  data-testid="product-visit-storefront"
                  href={storefrontAction.href}
                >
                  {storefrontAction.label}
                </Link>
              </section>
            </aside>
          </div>

          {relatedListings.length ? (
            <section className="rounded-[30px] border border-black/5 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-8">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
                    More listings
                  </p>
                <h2 className="mt-2 text-3xl font-semibold text-ink">
                    More {listing.subject} resources
                  </h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-soft">
                    Compare a few more listings if you want to browse similar grade levels, preview styles, or resource formats.
                  </p>
                </div>
                <Link
                  className="text-sm font-semibold text-ink-soft transition hover:text-ink"
                  href={returnTo}
                >
                  Back to the preview grid
                </Link>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {relatedListings.map((related) => (
                  <ProductCard
                    key={related.id}
                    listing={related}
                    returnTo={currentListingHref}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
