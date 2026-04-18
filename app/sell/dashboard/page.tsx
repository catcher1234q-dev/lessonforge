import type { Metadata } from "next";

import { AppAccessGate } from "@/components/account/app-access-gate";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { SellerDashboardContent } from "@/components/seller/dashboard-content";
import { buildNoIndexMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildNoIndexMetadata(
  "Seller Dashboard",
  "Private LessonForgeHub seller dashboard.",
);

export default function SellerDashboardPage() {
  return (
    <main className="page-shell min-h-screen">
      <SiteHeader />
      <section className="px-5 py-10 sm:px-6 sm:py-16 lg:px-8">
        <AppAccessGate area="seller">
          <SellerDashboardContent />
        </AppAccessGate>
      </section>
      <SiteFooter />
    </main>
  );
}
