import { AppAccessGate } from "@/components/account/app-access-gate";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { LibraryPageContent } from "@/components/library/library-page-content";
import { SectionIntro } from "@/components/shared/section-intro";
import Link from "next/link";
import { buildMarketplaceListingHref } from "@/lib/lessonforge/marketplace-navigation";
import {
  getFavoriteListingsForViewer,
  getViewerContext,
  listLibraryItems,
} from "@/lib/lessonforge/server-operations";

export default async function LibraryPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const [buyerLibraryItems, favoriteListings, viewer] = await Promise.all([
    listLibraryItems(),
    getFavoriteListingsForViewer(),
    getViewerContext(),
  ]);
  const purchaseState =
    typeof resolvedSearchParams?.purchase === "string"
      ? resolvedSearchParams.purchase
      : null;
  const purchasedProductId =
    typeof resolvedSearchParams?.productId === "string"
      ? resolvedSearchParams.productId
      : null;
  const purchasedProductTitle =
    typeof resolvedSearchParams?.productTitle === "string"
      ? resolvedSearchParams.productTitle
      : null;
  const updatedLibraryCount = buyerLibraryItems.filter(
    (item) => item.hasNewerEligibleVersion,
  ).length;
  const readyLibraryCount = buyerLibraryItems.filter(
    (item) => item.assetHealthStatus === "Preview and thumbnail ready",
  ).length;
  const latestPurchase = buyerLibraryItems.reduce<
    (typeof buyerLibraryItems)[number] | null
  >((latest, item) => {
    if (!latest) {
      return item;
    }

    return new Date(item.purchasedAt).getTime() > new Date(latest.purchasedAt).getTime()
      ? item
      : latest;
  }, null);
  const justPurchasedItem =
    buyerLibraryItems.find((item) => item.productId === purchasedProductId) ??
    latestPurchase;

  return (
    <main className="page-shell min-h-screen">
      <SiteHeader />

      <section className="px-5 pb-20 pt-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-8">
          <AppAccessGate area="buyer">
          {purchaseState === "success" && justPurchasedItem ? (
            <section className="rounded-[30px] border border-emerald-100 bg-emerald-50 px-6 py-5 shadow-[0_18px_50px_rgba(16,185,129,0.10)]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
                    Purchase complete
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-ink">
                    {purchasedProductTitle ?? justPurchasedItem.productTitle} is now in your library
                  </h2>
                  <p className="mt-2 text-sm leading-7 text-ink-soft">
                    You can open the purchased files right now, revisit the listing later, or keep browsing for more resources.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <a
                    className="inline-flex items-center justify-center rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
                    href={`/api/lessonforge/library-delivery?orderId=${encodeURIComponent(justPurchasedItem.id)}`}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Open purchased files
                  </a>
                  <Link
                    className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:border-slate-300"
                    href={buildMarketplaceListingHref({
                      returnTo: "/library",
                      slug: justPurchasedItem.productTitle
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, "-")
                        .replace(/^-+|-+$/g, ""),
                    })}
                  >
                    Reopen listing
                  </Link>
                  <Link
                    className="inline-flex items-center justify-center rounded-full border border-emerald-200 bg-white px-5 py-3 text-sm font-semibold text-emerald-800 transition hover:border-emerald-300"
                    href="/marketplace"
                  >
                    Keep browsing
                  </Link>
                </div>
              </div>
            </section>
          ) : null}

          <section className="rounded-[36px] border border-black/5 bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
            <div className="flex flex-col gap-8 xl:flex-row xl:items-start xl:justify-between">
              <div className="max-w-3xl">
                <SectionIntro
                  body="Reopen files, revisit listings, and handle updates or support from one buyer workspace."
                  eyebrow="Your purchases"
                  level="h1"
                  title="Your files, updates, and support in one library."
                  titleClassName="text-5xl leading-tight"
                />
                <p className="mt-3 text-sm leading-7 text-ink-soft">
                  This is the signed-in space for reopening full files, checking newer versions,
                  and handling anything that needs follow-up after purchase.
                </p>
                <div className="mt-6 rounded-[1.5rem] border border-sky-100 bg-sky-50/80 px-5 py-4 text-sm leading-6 text-ink-soft">
                  <p className="font-semibold text-ink">Start here</p>
                  <p className="mt-1">
                    Open the first purchase below, then switch into updated or support views only when you need them.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3 xl:w-[360px] xl:grid-cols-1">
                <article className="rounded-[24px] border border-brand/10 bg-brand-soft/60 px-5 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
                    Files in library
                  </p>
                  <p className="mt-3 text-3xl font-semibold text-ink">
                    {buyerLibraryItems.length}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-ink-soft">
                    Purchases ready to reopen any time.
                  </p>
                </article>
                <article className="rounded-[24px] border border-emerald-100 bg-emerald-50 px-5 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                    Updates waiting
                  </p>
                  <p className="mt-3 text-3xl font-semibold text-ink">
                    {updatedLibraryCount}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-ink-soft">
                    Purchases with a newer eligible version ready.
                  </p>
                </article>
                <article className="rounded-[24px] border border-slate-200 bg-slate-50 px-5 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
                    Saved next
                  </p>
                  <p className="mt-3 text-3xl font-semibold text-ink">{favoriteListings.length}</p>
                  <p className="mt-2 text-sm leading-6 text-ink-soft">
                    Saved listings waiting if you want another purchase path.
                  </p>
                </article>
              </div>
            </div>

            <details className="mt-6 rounded-[24px] border border-slate-200 bg-slate-50 px-5 py-4">
              <summary className="cursor-pointer text-base font-semibold text-ink">
                Open more library detail
              </summary>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <article className="rounded-[20px] bg-white px-5 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
                    Preview-ready purchases
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-ink">{readyLibraryCount}</p>
                </article>
                <article className="rounded-[20px] bg-white px-5 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
                    Latest purchase
                  </p>
                  <p className="mt-2 text-lg font-semibold leading-7 text-ink">
                    {latestPurchase?.productTitle ?? "Your next purchase will appear here"}
                  </p>
                </article>
              </div>
            </details>
          </section>

          <LibraryPageContent
            buyerLibraryItems={buyerLibraryItems}
            favoriteCount={favoriteListings.length}
            viewer={viewer}
          />
          </AppAccessGate>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
