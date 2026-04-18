import { AppAccessGate } from "@/components/account/app-access-gate";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { ProductCreator } from "@/components/seller/product-creator";

export default function SellerProductCreatePage() {
  return (
    <main className="page-shell min-h-screen">
      <SiteHeader />
      <section className="px-5 py-10 sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <AppAccessGate area="seller">
            <ProductCreator />
          </AppAccessGate>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
