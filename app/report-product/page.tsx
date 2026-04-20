import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { ReportProductForm } from "@/components/reports/report-product-form";
import { SectionIntro } from "@/components/shared/section-intro";
import { getCurrentViewer } from "@/lib/auth/viewer";
import { siteConfig } from "@/lib/config/site";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Report Product",
  description:
    "Report a LessonForgeHub product for review when a listing looks broken, misleading, copied, or otherwise out of policy.",
  path: "/report-product",
});

export default async function ReportProductPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const viewer = await getCurrentViewer();
  const productId = typeof params.productId === "string" ? params.productId : "";
  const productTitle =
    typeof params.title === "string" && params.title.trim().length
      ? params.title
      : "this product";
  const returnTo =
    typeof params.returnTo === "string" && params.returnTo.startsWith("/")
      ? params.returnTo
      : "/marketplace";

  return (
    <main className="page-shell min-h-screen">
      <SiteHeader />

      <section className="px-5 pb-20 pt-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-4xl flex-col gap-6">
          <Link className="text-sm font-medium text-ink-soft transition hover:text-ink" href={returnTo}>
            Back to listing
          </Link>

          <section className="rounded-[2rem] border border-black/5 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:p-8">
            <SectionIntro
              body="Use this page if a product looks broken, misleading, copied, or otherwise outside LessonForgeHub policy."
              eyebrow="Report product"
              level="h1"
              title={`Request review for ${productTitle}`}
              titleClassName="text-4xl leading-tight sm:text-5xl"
            />

            <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-slate-50 px-5 py-4 text-sm leading-6 text-ink-soft">
              <p className="font-semibold text-ink">Before you submit</p>
              <p className="mt-1">
                Signed-in buyers can submit a report directly here. If you are not signed in as a buyer, you can still contact{" "}
                <a className="font-semibold text-brand transition hover:text-brand-700" href={`mailto:${siteConfig.supportEmail}`}>
                  {siteConfig.supportEmail}
                </a>{" "}
                and the team can review the listing manually.
              </p>
            </div>

            {productId ? (
              <div className="mt-6">
                <ReportProductForm
                  productId={productId}
                  productTitle={productTitle}
                  returnTo={returnTo}
                  supportEmail={siteConfig.supportEmail}
                  viewerRole={viewer.role}
                />
              </div>
            ) : (
              <div className="mt-6 rounded-[1.5rem] border border-amber-100 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-950">
                We could not identify which listing you wanted to report. Please return to the product page and try again, or email {siteConfig.supportEmail}.
              </div>
            )}
          </section>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
