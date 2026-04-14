import Link from "next/link";

import { AppAccessGate } from "@/components/account/app-access-gate";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { SectionIntro } from "@/components/shared/section-intro";
import { buildMarketplaceListingHref } from "@/lib/lessonforge/marketplace-navigation";

function slugifyTitle(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const productId =
    typeof resolvedSearchParams?.productId === "string"
      ? resolvedSearchParams.productId
      : null;
  const productTitle =
    typeof resolvedSearchParams?.productTitle === "string"
      ? resolvedSearchParams.productTitle
      : "Your purchase";
  const listingHref = productId
    ? buildMarketplaceListingHref({
        returnTo: "/library",
        slug: productId,
      })
    : buildMarketplaceListingHref({
        returnTo: "/library",
        slug: slugifyTitle(productTitle),
      });

  return (
    <main className="page-shell min-h-screen">
      <SiteHeader />
      <section className="px-5 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <AppAccessGate area="buyer">
            <div className="rounded-[36px] border border-emerald-100 bg-white p-8 shadow-[0_24px_80px_rgba(16,185,129,0.10)]">
              <SectionIntro
                body="Stripe confirmed the checkout. The next step is opening your library, where the purchased files and listing follow-up live together."
                eyebrow="Checkout success"
                level="h1"
                title={`${productTitle} is ready in your library.`}
                titleClassName="text-4xl leading-tight"
              />
              <div className="mt-6 rounded-[1.5rem] border border-emerald-100 bg-emerald-50/80 px-5 py-4 text-sm leading-6 text-ink-soft">
                <p className="font-semibold text-ink">What happens next</p>
                <p className="mt-1">
                  Open your library to download files, revisit the listing, or keep browsing for more classroom resources.
                </p>
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  className="inline-flex items-center justify-center rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
                  href={`/library?purchase=success${productId ? `&productId=${encodeURIComponent(productId)}` : ""}${productTitle ? `&productTitle=${encodeURIComponent(productTitle)}` : ""}`}
                >
                  Open library
                </Link>
                <Link
                  className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:border-slate-300"
                  href={listingHref}
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
          </AppAccessGate>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}

