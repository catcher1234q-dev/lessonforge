import { AppAccessGate } from "@/components/account/app-access-gate";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { SellerDashboardContent } from "@/components/seller/dashboard-content";

export default function SellerDashboardPage() {
  return (
    <main className="page-shell min-h-screen">
      <SiteHeader />
      <section className="px-5 py-16 sm:px-6 lg:px-8">
        <AppAccessGate area="seller">
          <SellerDashboardContent />
        </AppAccessGate>
      </section>
      <SiteFooter />
    </main>
  );
}
