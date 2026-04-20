import type { Metadata } from "next";
import { BadgeCheck, FileText } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SectionIntro } from "@/components/shared/section-intro";
import { ProductCard } from "@/components/marketplace/product-card";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { getMarketplaceSellerWithPersistedListings } from "@/lib/lessonforge/server-catalog";
import { buildNoIndexMetadata, buildPageMetadata } from "@/lib/seo/metadata";

function getStoreTrustLabel(values: { listingCount: number }) {
  if (values.listingCount >= 3) {
    return "Established storefront";
  }

  return "Growing storefront";
}

function getStorefrontIntro(values: {
  sellerName: string;
  listingCount: number;
  featuredSubjects: string[];
}) {
  const subjectSummary =
    values.featuredSubjects.length > 1
      ? `${values.featuredSubjects.slice(0, 2).join(" and ")} resources`
      : `${values.featuredSubjects[0] ?? "classroom"} resources`;

  if (values.listingCount >= 4) {
    return `${values.sellerName} focuses on ${subjectSummary} with a fuller storefront buyers can browse in one place.`;
  }

  if (values.listingCount >= 2) {
    return `${values.sellerName} is building a focused storefront around ${subjectSummary}.`;
  }

  return `${values.sellerName} is starting with a focused listing that buyers can preview, review, and compare before purchase.`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ sellerId: string }>;
}): Promise<Metadata> {
  const { sellerId } = await params;
  const seller = await getMarketplaceSellerWithPersistedListings(sellerId);

  if (!seller) {
    return buildNoIndexMetadata(
      "Storefront not found",
      "This LessonForgeHub seller storefront could not be found.",
    );
  }

  const subjectSummary = seller.featuredSubjects.length
    ? seller.featuredSubjects.slice(0, 3).join(", ")
    : "classroom";

  return buildPageMetadata({
    title: `${seller.name} Storefront`,
    description: `Browse ${seller.name}'s ${subjectSummary} resources on LessonForgeHub, including protected previews and buyer-friendly listing details.`,
    path: `/store/${seller.id}`,
  });
}

export default async function SellerStorefrontPage({
  params,
}: {
  params: Promise<{ sellerId: string }>;
}) {
  const { sellerId } = await params;
  const seller = await getMarketplaceSellerWithPersistedListings(sellerId);

  if (!seller) {
    notFound();
  }

  const storefrontTrustLabel = getStoreTrustLabel({
    listingCount: seller.listingCount,
  });
  const featuredListing =
    seller.listings.length > 0
      ? seller.listings.reduce((best, listing) => {
          const bestScore =
            best.previewAssets.length + best.assetVersionNumber + best.pageCount;
          const listingScore =
            listing.previewAssets.length + listing.assetVersionNumber + listing.pageCount;

          return listingScore > bestScore ? listing : best;
        })
      : null;
  const supportingListings = seller.listings.filter((listing) => listing.id !== featuredListing?.id);
  const storefrontIntro = getStorefrontIntro({
    sellerName: seller.name,
    listingCount: seller.listingCount,
    featuredSubjects: seller.featuredSubjects,
  });

  return (
    <main className="page-shell min-h-screen">
      <SiteHeader />

      <section className="px-5 pb-20 pt-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-10">
          <section className="rounded-[36px] border border-black/5 bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
            <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr] xl:items-start">
              <div>
                <SectionIntro
                  body={storefrontIntro}
                  bodyClassName="max-w-2xl text-base"
                  eyebrow="Seller storefront"
                  level="h1"
                  title={seller.name}
                  titleClassName="leading-tight"
                />
                <p className="mt-4 text-lg text-ink-soft">{seller.handle}</p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <div className="inline-flex rounded-full bg-brand-soft px-4 py-2 text-sm font-semibold text-brand">
                    {storefrontTrustLabel}
                  </div>
                  <div className="inline-flex rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-ink-soft">
                    {seller.featuredSubjects.slice(0, 3).join(" • ")}
                  </div>
                </div>
                <div className="mt-6 flex flex-wrap gap-3">
                  <a
                    className="inline-flex rounded-full bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
                    href="#storefront-listings"
                  >
                    Browse this store
                  </a>
                  <Link
                    className="inline-flex rounded-full border border-black/10 px-4 py-2.5 text-sm font-semibold text-ink transition hover:border-black/20 hover:bg-slate-50"
                    href="/marketplace"
                  >
                    Compare all sellers
                  </Link>
                </div>
                <div className="mt-6 grid gap-4 lg:grid-cols-2">
                  <div className="rounded-[1.5rem] bg-slate-50 p-5 text-sm leading-7 text-ink-soft">
                    <p className="font-semibold text-ink">Best fit</p>
                    <p className="mt-1">
                      Strong for buyers looking for {seller.featuredSubjects.slice(0, 2).join(" and ").toLowerCase()} materials from one consistent teaching style.
                    </p>
                  </div>
                  <div className="rounded-[1.5rem] bg-slate-50 p-5 text-sm leading-7 text-ink-soft">
                    <p className="font-semibold text-ink">Why buyers trust this store</p>
                    <p className="mt-1">
                      Real preview pages, clear file details, and one consistent seller identity make this storefront easier to evaluate quickly.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
                <div className="rounded-[28px] bg-slate-50 p-6">
                  <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
                    Store size
                  </span>
                  <p className="text-sm text-ink-soft">Published listings</p>
                  <p className="mt-2 text-3xl font-semibold text-ink">
                    {seller.listingCount}
                  </p>
                </div>
                <div className="rounded-[28px] bg-slate-50 p-6">
                  <span className="inline-flex rounded-full bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700">
                    File quality
                  </span>
                  <p className="text-sm text-ink-soft">Preview-ready listings</p>
                  <p className="mt-2 flex items-center gap-2 text-3xl font-semibold text-ink">
                    <FileText className="h-5 w-5 text-brand" />
                    {seller.listings.length}
                  </p>
                  <p className="mt-2 text-sm text-ink-soft">
                    Each listing includes real preview pages pulled from the downloadable file
                  </p>
                </div>
                <div className="rounded-[28px] bg-slate-50 p-6">
                  <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-soft">
                    Store signal
                  </span>
                  <p className="text-sm text-ink-soft">Buyer trust</p>
                  <p className="mt-2 flex items-center gap-2 text-base font-semibold text-ink">
                    <BadgeCheck className="h-5 w-5 text-brand" />
                    {storefrontTrustLabel}
                  </p>
                  <p className="mt-2 text-sm text-ink-soft">
                    Clear previews and practical classroom file details stay visible across the store.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="flex flex-wrap gap-3">
            {seller.featuredSubjects.map((subject) => (
              <span
                key={subject}
                className="rounded-full bg-brand-soft px-4 py-2 text-sm font-medium text-brand"
              >
                {subject}
              </span>
            ))}
          </section>

          <section className="flex items-center justify-between gap-4 rounded-[28px] border border-black/5 bg-white px-6 py-5 shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand">
                Store summary
              </p>
              <p className="mt-2 text-sm leading-6 text-ink-soft">
                {seller.name} currently has {seller.listingCount} published listing
                {seller.listingCount === 1 ? "" : "s"} with real preview pages, protected downloads, and clear classroom-facing file details across the storefront.
              </p>
            </div>
            <Link
              className="inline-flex rounded-full bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
              data-testid="storefront-compare-all"
              href="/marketplace"
            >
              Compare with all listings
            </Link>
          </section>

          {featuredListing ? (
            <section
              className="rounded-[32px] border border-black/5 bg-white p-7 shadow-[0_18px_50px_rgba(15,23,42,0.05)]"
              id="storefront-listings"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
                    Start with this
                  </span>
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand">
                    Featured storefront pick
                  </p>
                  <h2 className="mt-3 text-3xl font-semibold text-ink">
                    Start with this seller’s strongest listing
                  </h2>
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-ink-soft">
                    This is the clearest first stop if you want the strongest mix of preview quality, classroom usefulness, and file clarity from this storefront.
                  </p>
                </div>
                <div className="rounded-[24px] bg-slate-50 px-4 py-3 text-sm leading-6 text-ink-soft">
                  <p className="font-semibold text-ink">{featuredListing.title}</p>
                  <p className="mt-1">{featuredListing.sellerTrustLabel}</p>
                </div>
              </div>

              <div className="mt-7">
                <ProductCard
                  featured
                  listing={featuredListing}
                  returnTo={`/store/${sellerId}`}
                  testId={`storefront-product-${featuredListing.slug}`}
                />
              </div>
            </section>
          ) : null}

          {supportingListings.length ? (
            <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3">
              {supportingListings.map((listing) => (
                <ProductCard
                  key={listing.id}
                  listing={listing}
                  returnTo={`/store/${sellerId}`}
                  testId={`storefront-product-${listing.slug}`}
                />
              ))}
            </section>
          ) : null}

          <Link
            className="text-sm font-semibold text-ink-soft transition hover:text-ink"
            data-testid="storefront-back-marketplace"
            href="/marketplace"
          >
            Back to all marketplace listings
          </Link>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
