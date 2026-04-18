import type { Metadata } from "next";

import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { SectionIntro } from "@/components/shared/section-intro";
import { buildMarketplaceListingHref } from "@/lib/lessonforge/marketplace-navigation";
import { buildNoIndexMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildNoIndexMetadata(
  "Checkout Cancelled",
  "Private LessonForgeHub checkout cancellation page.",
);

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
      <section className="px-5 py-10 sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto max-w-4xl rounded-[36px] border border-amber-100 bg-white p-6 shadow-[0_24px_80px_rgba(245,158,11,0.10)] sm:p-8">
          <SectionIntro
            body="Nothing was charged. You can reopen the listing, review the protected preview again, or return to browsing without losing your place."
            eyebrow="Checkout cancelled"
            level="h1"
            title={`You did not buy ${productTitle}.`}
            titleClassName="text-4xl leading-tight"
          />
          <div className="mt-6 rounded-[1.5rem] border border-amber-100 bg-amber-50/80 px-5 py-4 text-sm leading-6 text-ink-soft">
            <p className="font-semibold text-ink">What happens next</p>
            <p className="mt-1">
              You can safely try checkout again later. This page simply gives you a clean path back to the listing or marketplace.
            </p>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {[
              {
                title: "No charge was made",
                body: "Cancelled checkout means the purchase did not complete.",
              },
              {
                title: "Preview again",
                body: "You can reopen the listing and review the protected preview before deciding.",
              },
              {
                title: "Keep comparing",
                body: "Return to marketplace browsing if this resource is not the right fit yet.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-[1.15rem] border border-amber-100 bg-white px-4 py-4 text-sm leading-6 text-ink-soft"
              >
                <p className="font-semibold text-ink">{item.title}</p>
                <p className="mt-1">{item.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-amber-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-700"
              href={listingHref}
            >
              Reopen listing
            </Link>
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:border-slate-300"
              href={returnTo}
            >
              Return to browsing
            </Link>
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-amber-200 bg-white px-5 py-3 text-sm font-semibold text-amber-900 transition hover:border-amber-300"
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
