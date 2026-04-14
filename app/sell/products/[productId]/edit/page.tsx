import { notFound } from "next/navigation";

import { AppAccessGate } from "@/components/account/app-access-gate";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { ProductEditor } from "@/components/seller/product-editor";
import { listPersistedProducts } from "@/lib/lessonforge/repository";
import { findSupabaseProductRecordById } from "@/lib/supabase/admin-sync";

export const dynamic = "force-dynamic";

export default async function SellerProductEditPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;
  const [products, syncedProduct] = await Promise.all([
    listPersistedProducts(),
    findSupabaseProductRecordById(productId).catch(() => null),
  ]);
  const product =
    syncedProduct ?? products.find((entry) => entry.id === productId);

  if (!product) {
    notFound();
  }

  if (product.productStatus === "Removed") {
    return (
      <main className="page-shell min-h-screen">
        <SiteHeader />
        <section className="px-5 py-16 sm:px-6 lg:px-8">
          <AppAccessGate area="seller">
            <div className="mx-auto max-w-4xl rounded-[32px] border border-black/5 bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand">
                Listing unavailable
              </p>
              <h1
                className="mt-4 font-[family-name:var(--font-display)] text-4xl leading-tight text-ink"
                data-testid="seller-removed-product-headline"
              >
                This listing was removed and can no longer be edited from the seller workflow.
              </h1>
              <p
                className="mt-5 text-lg leading-8 text-ink-soft"
                data-testid="seller-removed-product-note"
              >
                Removed listings are out of circulation entirely. Return to the dashboard to review other listings or contact the admin team if you think this removal needs follow-up.
              </p>
              <div className="mt-8">
                <a
                  className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:border-slate-300"
                  href="/sell/dashboard"
                >
                  Back to seller dashboard
                </a>
              </div>
            </div>
          </AppAccessGate>
        </section>
        <SiteFooter />
      </main>
    );
  }

  return (
    <main className="page-shell min-h-screen">
      <SiteHeader />
      <section className="px-5 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <AppAccessGate area="seller">
            <ProductEditor product={product} />
          </AppAccessGate>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
