import { Search } from "lucide-react";
import Link from "next/link";

import { ProductCard } from "@/components/marketplace/product-card";
import { FilterBar } from "@/components/marketplace/filter-bar";
import { SearchEmptyState } from "@/components/marketplace/search-empty-state";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { SectionIntro } from "@/components/shared/section-intro";
import { subjectHubs } from "@/lib/demo/example-resources";
import { filterMarketplaceListings } from "@/lib/lessonforge/server-catalog";
import {
  getFavoriteListingsForViewer,
  getViewerContext,
  getViewerFavoriteProductIds,
} from "@/lib/lessonforge/server-operations";

function buildMarketplaceReturnTo(params: Record<string, string | string[] | undefined>) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string" && value.length > 0) {
      search.append(key, value);
      continue;
    }

    if (Array.isArray(value)) {
      for (const entry of value) {
        if (entry.length > 0) {
          search.append(key, entry);
        }
      }
    }
  }

  const queryString = search.toString();
  return queryString ? `/marketplace?${queryString}` : "/marketplace";
}

function getSubjectShelfTheme(subject: string) {
  switch (subject) {
    case "Math":
      return {
        shell: "border-sky-200 bg-[linear-gradient(180deg,#f8fbff_0%,#eef6ff_100%)]",
        panel: "bg-sky-50 text-sky-900",
        button: "bg-sky-600 hover:bg-sky-700",
      };
    case "ELA":
      return {
        shell: "border-rose-200 bg-[linear-gradient(180deg,#fff8fa_0%,#fff1f4_100%)]",
        panel: "bg-rose-50 text-rose-900",
        button: "bg-rose-600 hover:bg-rose-700",
      };
    case "Science":
      return {
        shell: "border-emerald-200 bg-[linear-gradient(180deg,#f7fffb_0%,#ecfdf5_100%)]",
        panel: "bg-emerald-50 text-emerald-900",
        button: "bg-emerald-600 hover:bg-emerald-700",
      };
    default:
      return {
        shell: "border-amber-200 bg-[linear-gradient(180deg,#fffdf7_0%,#fffbeb_100%)]",
        panel: "bg-amber-50 text-amber-900",
        button: "bg-amber-500 hover:bg-amber-600",
      };
  }
}

function getSubjectShelfCopy(subject: string) {
  switch (subject) {
    case "Math":
      return {
        heading: "Practice, intervention, and small-group math resources",
        detail: "Number sense, fluency, and strategy work that feels ready for immediate classroom use.",
      };
    case "ELA":
      return {
        heading: "Reading, writing, and workshop-ready literacy resources",
        detail: "Mini lessons, response pages, and discussion structures built for daily literacy blocks.",
      };
    case "Science":
      return {
        heading: "Inquiry, lab, and observation-driven science resources",
        detail: "Hands-on preview pages and teacher supports designed for active science instruction.",
      };
    default:
      return {
        heading: "Civics, history, and inquiry-based social studies resources",
        detail: "Primary sources, map work, and classroom discussion materials for social studies planning.",
      };
  }
}

function getSubjectShelfCardSpan(subject: string, index: number) {
  switch (subject) {
    case "Math":
      return index === 0 ? "xl:col-span-2 2xl:col-span-2" : "";
    case "ELA":
      return index === 1 ? "xl:col-span-2 2xl:col-span-2" : "";
    case "Science":
      return index === 2 ? "xl:col-span-2 2xl:col-span-2" : "";
    default:
      return index === 4 ? "xl:col-span-2 2xl:col-span-2" : "";
  }
}

function isFeaturedSubjectCard(subject: string, index: number) {
  switch (subject) {
    case "Math":
      return index === 0;
    case "ELA":
      return index === 1;
    case "Science":
      return index === 2;
    default:
      return index === 4;
  }
}

function getFeaturedShelfReason(listing: {
  sellerTrustLabel: string;
  reviewSummary: { reviewCount: number };
  assetVersionNumber: number;
  assetHealthStatus: string;
}) {
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

  return "Featured pick";
}

function isEarlyCatalogState(input: {
  listingCount: number;
  query: string;
  subject: string;
  trustFilter: string;
  gradeBand: string;
  resourceType: string;
  priceFilter: string;
  sort: string;
}) {
  return (
    input.listingCount > 0 &&
    input.listingCount <= 12 &&
    !input.query &&
    input.subject === "All" &&
    input.trustFilter === "all" &&
    input.gradeBand === "All" &&
    input.resourceType === "All" &&
    input.priceFilter === "all" &&
    input.sort === "best-match"
  );
}

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const rawQuery = params.q;
  const rawSubject = params.subject;
  const rawTrust = params.trust;
  const rawGrade = params.grade;
  const rawResourceType = params.resourceType;
  const rawPrice = params.price;
  const rawSort = params.sort;
  const query = typeof rawQuery === "string" ? rawQuery : "";
  const subject = typeof rawSubject === "string" ? rawSubject : "All";
  const trustFilter = typeof rawTrust === "string" ? rawTrust : "all";
  const gradeBand = typeof rawGrade === "string" ? rawGrade : "All";
  const resourceType = typeof rawResourceType === "string" ? rawResourceType : "All";
  const priceFilter = typeof rawPrice === "string" ? rawPrice : "all";
  const sort = typeof rawSort === "string" ? rawSort : "best-match";
  const returnTo = buildMarketplaceReturnTo(params);
  const [listings, viewer, favoriteProductIds, favoriteListings] = await Promise.all([
    filterMarketplaceListings(
      query,
      subject,
      trustFilter,
      gradeBand,
      resourceType,
      priceFilter,
      sort,
    ),
    getViewerContext(),
    getViewerFavoriteProductIds(),
    getFavoriteListingsForViewer(),
  ]);
  const trustSummary = {
    assetReady: listings.filter((listing) => listing.assetHealthStatus === "Preview and thumbnail ready").length,
    updatedAssets: listings.filter((listing) => listing.assetVersionNumber > 1).length,
    verifiedReviewBacked: listings.filter((listing) => listing.reviewSummary.reviewCount > 0).length,
    trustedSeller: listings.filter(
      (listing) =>
        listing.sellerTrustLabel === "Trusted seller" ||
        listing.sellerTrustLabel === "Review-backed store",
    ).length,
  };
  const activeFilterCount = [
    subject !== "All",
    trustFilter !== "all",
    gradeBand !== "All",
    resourceType !== "All",
    priceFilter !== "all",
    sort !== "best-match",
    Boolean(query),
  ].filter(Boolean).length;
  const showSubjectPreviewShelves =
    !query &&
    subject === "All" &&
    trustFilter === "all" &&
    gradeBand === "All" &&
      resourceType === "All" &&
      priceFilter === "all" &&
      sort === "best-match";
  const showEarlyCatalogNote = isEarlyCatalogState({
    listingCount: listings.length,
    query,
    subject,
    trustFilter,
    gradeBand,
    resourceType,
    priceFilter,
    sort,
  });
  const subjectPreviewShelves = showSubjectPreviewShelves
    ? subjectHubs
        .map((hub) => ({
          hub,
          listings: listings.filter((listing) => listing.subject === hub.name).slice(0, 5),
        }))
        .filter((section) => section.listings.length)
    : [];

  return (
    <main className="page-shell min-h-screen">
      <SiteHeader />

      <section className="px-5 pb-20 pt-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-10">
          <div className="rounded-[36px] border border-black/5 bg-white/90 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
            <div>
              <SectionIntro
                body="Search by title, subject, or standard, then open the listings that look strongest."
                eyebrow="Marketplace"
                level="h1"
                title="Browse polished classroom resources with clearer trust signals."
                titleClassName="max-w-3xl text-5xl leading-tight sm:text-6xl"
              />

                <div className="mt-6 rounded-[1.5rem] border border-sky-100 bg-sky-50/80 px-5 py-4 text-sm leading-6 text-ink-soft">
                  <p className="font-semibold text-ink">Quick browse path</p>
                  <p className="mt-1">
                    Start broad, open a few strong listings, and use filters only when the catalog still feels too wide.
                  </p>
                </div>
            </div>
          </div>

          <section className="rounded-[32px] border border-black/5 bg-white/80 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
                Start here
              </span>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">
                Search or filter the catalog
              </p>
            </div>
            <form
              action="/marketplace"
              className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between"
              id="marketplace-filters"
            >
              {subject !== "All" ? <input name="subject" type="hidden" value={subject} /> : null}
              {trustFilter !== "all" ? <input name="trust" type="hidden" value={trustFilter} /> : null}
              <label className="flex flex-1 items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-5 py-3">
                <Search className="h-5 w-5 text-ink-soft" />
                <input
                  className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-soft"
                  defaultValue={query}
                  name="q"
                  placeholder="Search lesson plans, standards, or resource titles"
                  type="search"
                />
              </label>

              <button
                className="inline-flex items-center justify-center rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
                type="submit"
              >
                Search marketplace
              </button>
            </form>

            <div className="mt-5">
              <FilterBar
                query={query}
                selectedGradeBand={gradeBand}
                selectedPriceFilter={priceFilter}
                selectedResourceType={resourceType}
                selectedSort={sort}
                selectedSubject={subject}
                selectedTrustFilter={trustFilter}
              />
            </div>
          </section>

          {(subject !== "All" ||
            trustFilter !== "all" ||
            gradeBand !== "All" ||
            resourceType !== "All" ||
            priceFilter !== "all" ||
            sort !== "best-match") ? (
            <section className="flex flex-wrap items-center gap-2">
              <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-soft">
                Active filters
              </span>
              {subject !== "All" ? (
                <span className="rounded-full bg-white px-3 py-1.5 text-sm text-ink-soft shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
                  Subject: {subject}
                </span>
              ) : null}
              {trustFilter !== "all" ? (
                <span className="rounded-full bg-white px-3 py-1.5 text-sm text-ink-soft shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
                  Trust: {trustFilter}
                </span>
              ) : null}
              {gradeBand !== "All" ? (
                <span className="rounded-full bg-white px-3 py-1.5 text-sm text-ink-soft shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
                  Grade: {gradeBand}
                </span>
              ) : null}
              {resourceType !== "All" ? (
                <span className="rounded-full bg-white px-3 py-1.5 text-sm text-ink-soft shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
                  Type: {resourceType}
                </span>
              ) : null}
              {priceFilter !== "all" ? (
                <span className="rounded-full bg-white px-3 py-1.5 text-sm text-ink-soft shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
                  Price: {priceFilter}
                </span>
              ) : null}
              {sort !== "best-match" ? (
                <span className="rounded-full bg-white px-3 py-1.5 text-sm text-ink-soft shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
                  Sort: {sort}
                </span>
              ) : null}
            </section>
          ) : null}

          <details className="rounded-[24px] border border-black/5 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
            <summary className="cursor-pointer text-base font-semibold text-ink">
              Open buyer trust summary
            </summary>
            <div className="mt-4 grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
              <article className="rounded-[1.25rem] bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">
                  Asset ready
                </p>
                <p className="mt-2 text-2xl font-semibold text-ink">{trustSummary.assetReady}</p>
              </article>
              <article className="rounded-[1.25rem] bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">
                  Updated assets
                </p>
                <p className="mt-2 text-2xl font-semibold text-ink">{trustSummary.updatedAssets}</p>
              </article>
              <article className="rounded-[1.25rem] bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">
                  Review backed
                </p>
                <p className="mt-2 text-2xl font-semibold text-ink">{trustSummary.verifiedReviewBacked}</p>
              </article>
              <article className="rounded-[1.25rem] bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">
                  Trusted sellers
                </p>
                <p className="mt-2 text-2xl font-semibold text-ink">{trustSummary.trustedSeller}</p>
              </article>
            </div>
          </details>

          <section className="flex flex-wrap items-center justify-between gap-4 rounded-[24px] border border-black/5 bg-white px-5 py-4 text-sm shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
            <div className="text-ink-soft">
              <span className="font-semibold text-ink">{listings.length}</span>{" "}
              listing{listings.length === 1 ? "" : "s"} matched
              {query ? (
                <>
                  {" "}
                  for <span className="font-semibold text-ink">“{query}”</span>
                </>
              ) : null}
              {activeFilterCount > 0 ? (
                <>
                  {" "}
                  with <span className="font-semibold text-ink">{activeFilterCount}</span>{" "}
                  active filter{activeFilterCount === 1 ? "" : "s"}
                </>
              ) : null}
              .
            </div>
            {listings.length > 0 && activeFilterCount > 1 ? (
              <div className="text-ink-soft">
                Too narrow? Loosen trust or price first.
              </div>
            ) : null}
            {trustFilter !== "all" ? (
              <div className="text-emerald-800">
                {trustFilter === "asset-ready"
                  ? "Showing preview-ready listings."
                  : trustFilter === "updated"
                    ? "Showing refreshed listings."
                    : trustFilter === "trusted-seller"
                      ? "Showing stronger seller-history listings."
                      : "Showing review-backed listings."}
              </div>
            ) : null}
          </section>

          {showEarlyCatalogNote ? (
            <section className="rounded-[28px] border border-amber-200 bg-[linear-gradient(180deg,#fffdf8_0%,#fff8e8_100%)] p-6 shadow-[0_14px_40px_rgba(15,23,42,0.05)]">
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(300px,0.9fr)] xl:items-center">
                <div>
                  <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-800">
                    Early catalog
                  </span>
                  <h2 className="mt-3 text-2xl font-semibold text-ink">
                    A smaller catalog can still be a faster, more curated browse.
                  </h2>
                  <p className="mt-2 max-w-3xl text-sm leading-7 text-ink-soft">
                    LessonForge is still growing, so this view is meant to help buyers open the strongest current listings quickly instead of sorting through a crowded marketplace.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  <div className="rounded-[1.25rem] bg-white/80 px-4 py-4 text-sm leading-6 text-ink-soft">
                    <p className="font-semibold text-ink">Best next move</p>
                    <p className="mt-1">Open a few strong listings, compare previews, and save the best ones before buying.</p>
                  </div>
                  <div className="rounded-[1.25rem] bg-white/80 px-4 py-4 text-sm leading-6 text-ink-soft">
                    <p className="font-semibold text-ink">For sellers</p>
                    <p className="mt-1">Early listings have more room to stand out while the catalog is still taking shape.</p>
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          {viewer.role === "buyer" && favoriteListings.length ? (
            <section className="rounded-[32px] border border-black/5 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand">
                    Your shortlist
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-ink">
                    Saved listings
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-ink-soft">
                    Jump back into your saved options without leaving the marketplace.
                  </p>
                </div>
                <p className="text-sm text-ink-soft">{favoriteListings.length} saved</p>
              </div>
              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3">
                {favoriteListings.slice(0, 3).map((listing) => (
                  <ProductCard
                    key={`favorite-${listing.id}`}
                    initiallyFavorited={favoriteProductIds.includes(listing.id)}
                    listing={listing}
                    returnTo={returnTo}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {subjectPreviewShelves.length ? (
            <section className="space-y-8">
              <div className="rounded-[32px] border border-black/5 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand">
                  Browse by subject
                </p>
                <h2 className="mt-2 text-3xl font-semibold text-ink">
                  Browse uploaded products by subject
                </h2>
                <p className="mt-1 max-w-3xl text-base leading-7 text-ink-soft">
                  Use these rows for a faster visual browse.
                </p>
              </div>

              {subjectPreviewShelves.map(({ hub, listings: subjectListings }) => (
                <section
                  key={hub.name}
                  className={`rounded-[32px] border p-7 shadow-[0_18px_50px_rgba(15,23,42,0.05)] ${getSubjectShelfTheme(hub.name).shell}`}
                  data-testid={`marketplace-subject-shelf-${hub.name.toLowerCase().replaceAll(" ", "-")}`}
                >
                  {(() => {
                    const shelfTheme = getSubjectShelfTheme(hub.name);
                    const shelfCopy = getSubjectShelfCopy(hub.name);
                    const featuredListing =
                      subjectListings.find((_, index) => isFeaturedSubjectCard(hub.name, index)) ??
                      subjectListings[0];
                    const featuredReason = featuredListing
                      ? getFeaturedShelfReason(featuredListing)
                      : "Featured pick";

                    return (
                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
                    <div>
                      <div className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${hub.colorClass}`}>
                        {hub.gradeBand}
                      </div>
                      <h3 className="mt-4 text-3xl font-semibold text-ink">{hub.name}</h3>
                      <p className="mt-3 text-lg font-semibold leading-7 text-ink">
                        {shelfCopy.heading}
                      </p>
                      <p className="mt-2 max-w-3xl text-base leading-7 text-ink-soft">
                        {shelfCopy.detail}
                      </p>
                    </div>
                    <div className="space-y-3">
                      <div className={`rounded-[24px] px-4 py-3 text-sm leading-6 ${shelfTheme.panel}`}>
                        <p className="font-semibold text-ink">{subjectListings.length} products shown</p>
                        {featuredListing ? (
                          <p className="mt-2 text-sm font-semibold text-ink">
                            Spotlight: {featuredListing.title} · {featuredReason}
                          </p>
                        ) : null}
                      </div>
                      <Link
                        className={`inline-flex items-center justify-center rounded-full px-4 py-2.5 text-sm font-semibold text-white transition ${shelfTheme.button}`}
                        data-testid={`marketplace-subject-shelf-link-${hub.name.toLowerCase().replaceAll(" ", "-")}`}
                        href={`/marketplace?subject=${encodeURIComponent(hub.name)}`}
                      >
                        Shop {hub.name}
                      </Link>
                    </div>
                  </div>
                    );
                  })()}

                  <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
                    {subjectListings.map((listing, index) => (
                      <div
                        key={`subject-preview-${hub.name}-${listing.id}`}
                        className={getSubjectShelfCardSpan(hub.name, index)}
                      >
                        <ProductCard
                          featured={isFeaturedSubjectCard(hub.name, index)}
                          initiallyFavorited={favoriteProductIds.includes(listing.id)}
                          listing={listing}
                          returnTo={returnTo}
                        />
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </section>
          ) : null}

          {listings.length && !subjectPreviewShelves.length ? (
            <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3">
              {listings.map((listing) => (
                <ProductCard
                  key={listing.id}
                  initiallyFavorited={favoriteProductIds.includes(listing.id)}
                  listing={listing}
                  returnTo={returnTo}
                />
              ))}
            </section>
          ) : (
            <SearchEmptyState
              gradeBand={gradeBand}
              priceFilter={priceFilter}
              query={query}
              resourceType={resourceType}
              subject={subject}
              trustFilter={trustFilter}
            />
          )}
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
