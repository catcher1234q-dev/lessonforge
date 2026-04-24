import type { Metadata } from "next";

import Link from "next/link";

import { AppAccessGate } from "@/components/account/app-access-gate";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { SectionIntro } from "@/components/shared/section-intro";
import { buildMarketplaceListingHref } from "@/lib/lessonforge/marketplace-navigation";
import { buildNoIndexMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildNoIndexMetadata(
  "Checkout Success",
  "Private LessonForgeHub checkout confirmation page.",
);

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
      <section className="px-5 py-10 sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <AppAccessGate area="buyer">
            <div className="rounded-[36px] border border-emerald-100 bg-white p-6 shadow-[0_24px_80px_rgba(16,185,129,0.10)] sm:p-8">
              <SectionIntro
                body="Your payment was confirmed. Your next step is opening the library, where protected delivery, listing follow-up, and support actions stay together."
                eyebrow="Checkout success"
                level="h1"
                title={`${productTitle} is ready in your library.`}
                titleClassName="text-4xl leading-tight"
              />
              <div className="mt-6 rounded-[1.5rem] border border-emerald-100 bg-emerald-50/80 px-5 py-4 text-sm leading-6 text-ink-soft">
                <p className="font-semibold text-ink">What happens next</p>
                <p className="mt-1">
                  Open your library to download files, revisit the listing, request help if needed, or keep browsing for more classroom resources.
                </p>
                <p className="mt-2">
                  LessonForgeHub sells digital educational downloads only. No physical products are sold or shipped.
                </p>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                {[
                  {
                    title: "Payment confirmed",
                    body: "The checkout completed successfully, so the purchase can now be matched to your account.",
                  },
                  {
                    title: "Files live in library",
                    body: "Use the library to reopen purchased files and return to this resource later.",
                  },
                  {
                    title: "Support stays nearby",
                    body: "If access looks wrong, use the library support options attached to the purchase.",
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="rounded-[1.15rem] border border-emerald-100 bg-white px-4 py-4 text-sm leading-6 text-ink-soft"
                  >
                    <p className="font-semibold text-ink">{item.title}</p>
                    <p className="mt-1">{item.body}</p>
                  </div>
                ))}
              </div>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link
                  className="inline-flex min-h-11 items-center justify-center rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
                  href={`/library?purchase=success${productId ? `&productId=${encodeURIComponent(productId)}` : ""}${productTitle ? `&productTitle=${encodeURIComponent(productTitle)}` : ""}`}
                >
                  Open library
                </Link>
                <Link
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:border-slate-300"
                  href={listingHref}
                >
                  Reopen listing
                </Link>
                <Link
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-emerald-200 bg-white px-5 py-3 text-sm font-semibold text-emerald-800 transition hover:border-emerald-300"
                  href="/marketplace"
                >
                  Keep browsing
                </Link>
                <Link
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:border-slate-300"
                  href="/feedback?source=checkout_success"
                >
                  Give feedback
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
