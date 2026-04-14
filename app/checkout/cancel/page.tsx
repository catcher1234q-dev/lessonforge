import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { SectionIntro } from "@/components/shared/section-intro";
import { buildMarketplaceListingHref } from "@/lib/lessonforge/marketplace-navigation";

function getSafeReturnTo(candidate: string | null) {
  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//")) {
    return "/marketplace";
  }

  return candidate;
}

export default async function CheckoutCancelPage({
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
      : "this listing";
  const returnTo = getSafeReturnTo(
    typeof resolvedSearchParams?.returnTo === "string"
      ? resolvedSearchParams.returnTo
      : null,
  );
  const listingHref = productId
    ? buildMarketplaceListingHref({
        returnTo,
        slug: productId,
      })
    : returnTo;

  return (
    <main className="page-shell min-h-screen">
      <SiteHeader />
      <section className="px-5 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl rounded-[36px] border border-amber-100 bg-white p-8 shadow-[0_24px_80px_rgba(245,158,11,0.10)]">
          <SectionIntro
            body="Nothing was charged. You can reopen the listing, review the preview again, or head back to browsing without losing your place."
            eyebrow="Checkout cancelled"
            level="h1"
            title={`You did not buy ${productTitle}.`}
            titleClassName="text-4xl leading-tight"
          />
          <div className="mt-6 rounded-[1.5rem] border border-amber-100 bg-amber-50/80 px-5 py-4 text-sm leading-6 text-ink-soft">
            <p className="font-semibold text-ink">What happens next</p>
            <p className="mt-1">
              You can safely try checkout again later. This page is only a recovery step so you have a clean place to continue from.
            </p>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              className="inline-flex items-center justify-center rounded-full bg-amber-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-700"
              href={listingHref}
            >
              Reopen listing
            </Link>
            <Link
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:border-slate-300"
              href={returnTo}
            >
              Return to browsing
            </Link>
            <Link
              className="inline-flex items-center justify-center rounded-full border border-amber-200 bg-white px-5 py-3 text-sm font-semibold text-amber-900 transition hover:border-amber-300"
              href="/marketplace"
            >
              Open marketplace
            </Link>
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}

