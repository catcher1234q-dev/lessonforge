import type { Metadata } from "next";
import { ArrowRight, Search } from "lucide-react";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { FilterBar } from "@/components/marketplace/filter-bar";
import { ProductCard } from "@/components/marketplace/product-card";
import { SearchEmptyState } from "@/components/marketplace/search-empty-state";
import { filterMarketplaceListings } from "@/lib/lessonforge/server-catalog";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Marketplace",
  description:
    "Browse LessonForgeHub classroom resources, review previews, and buy digital teacher downloads from original seller listings.",
  path: "/marketplace",
});

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

function getResultLabel(count: number, subject: string, query: string) {
  if (query) {
    return `${count} listing${count === 1 ? "" : "s"} for "${query}"`;
  }

  if (subject !== "All") {
    return `${count} ${subject} listing${count === 1 ? "" : "s"}`;
  }

  return `${count} listing${count === 1 ? "" : "s"} in the marketplace`;
}

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const rawQuery = params.q;
  const rawSubject = params.subject;
  const rawSort = params.sort;
  const query = typeof rawQuery === "string" ? rawQuery : "";
  const subject = typeof rawSubject === "string" ? rawSubject : "All";
  const sort = typeof rawSort === "string" ? rawSort : "best-match";
  const returnTo = buildMarketplaceReturnTo(params);
  const listings = await filterMarketplaceListings(
    query,
    subject,
    undefined,
    undefined,
    undefined,
    undefined,
    sort,
  );

  return (
    <main className="page-shell min-h-screen">
      <SiteHeader />

      <section className="px-4 pb-16 pt-6 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-6">
          <section className="rounded-[28px] border border-black/5 bg-white px-5 py-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:px-7 sm:py-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
                  Marketplace
                </p>
                <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl leading-tight text-ink sm:text-5xl">
                  Browse real teacher-created classroom resources.
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-ink-soft sm:text-base">
                  LessonForgeHub is a digital marketplace for teacher resources. Buyers can review previews before buying, and sellers upload original materials through the platform.
                </p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.14em]">
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-800">
                    Digital downloads
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-ink-soft">
                    Reviewed listings with preview access
                  </span>
                </div>
              </div>

              <div className="rounded-[24px] border border-brand/10 bg-brand-soft/40 p-4 sm:min-w-[280px]">
                <Link
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
                  href="/sell/products/new"
                >
                  Start Selling
                </Link>
                <p className="mt-3 text-center text-xs font-medium text-ink-soft">
                  AI-powered setup in under 60 seconds
                </p>
                <p className="mt-2 text-center text-sm leading-6 text-ink-soft">
                  Upload original teaching resources and start building your seller storefront.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-[24px] border border-black/5 bg-white px-4 py-4 shadow-[0_14px_44px_rgba(15,23,42,0.06)] sm:px-5">
            <form
              action="/marketplace"
              className="flex flex-col gap-3 lg:flex-row lg:items-center"
              data-analytics-event="marketplace_search_used"
              data-analytics-props={JSON.stringify({ queryLength: query.length, subject, sort })}
            >
              {subject !== "All" ? <input name="subject" type="hidden" value={subject} /> : null}
              <label className="flex flex-1 items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-4 py-3">
                <Search className="h-4 w-4 text-ink-soft" />
                <input
                  className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-soft"
                  defaultValue={query}
                  name="q"
                  placeholder="Search teacher resources"
                  type="search"
                />
              </label>
              <button
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
                type="submit"
              >
                Search
              </button>
              <select
                aria-label="Sort marketplace listings"
                className="min-h-11 rounded-full border border-slate-200 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-brand"
                defaultValue={sort}
                name="sort"
              >
                <option value="best-match">Featured</option>
                <option value="newest">Newest first</option>
                <option value="title">Title A-Z</option>
              </select>
            </form>

            <div className="mt-4">
              <FilterBar query={query} selectedSort={sort} selectedSubject={subject} />
            </div>
          </section>

          <section className="flex flex-wrap items-center justify-between gap-3 text-sm text-ink-soft">
            <p>
              <span className="font-semibold text-ink">{getResultLabel(listings.length, subject, query)}</span>
            </p>
            <p>Buyers can review previews, report products, and check out securely from eligible listings.</p>
          </section>

          {listings.length ? (
            <section className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {listings.map((listing) => (
                <ProductCard
                  key={listing.id}
                  listing={listing}
                  returnTo={returnTo}
                />
              ))}
            </section>
          ) : (
            <SearchEmptyState query={query} sort={sort} subject={subject} />
          )}

          <section className="rounded-[24px] border border-black/5 bg-white px-5 py-5 shadow-[0_14px_44px_rgba(15,23,42,0.05)]">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
                  Ready to upload your own?
                </p>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-soft">
                  Every seller listing is expected to show real classroom value, clear previews, and policy-safe details before it stays live.
                </p>
              </div>
              <Link
                className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:border-slate-300"
                href="/sell/products/new"
              >
                Create your first listing
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </section>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
