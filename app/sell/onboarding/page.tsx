import type { Metadata } from "next";

import { AppAccessGate } from "@/components/account/app-access-gate";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { SellerOnboardingForm } from "@/components/seller/onboarding-form";
import { buildNoIndexMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildNoIndexMetadata(
  "Seller Onboarding",
  "Private LessonForgeHub seller setup area.",
);

export default function SellerOnboardingPage() {
  return (
    <main className="page-shell min-h-screen">
      <SiteHeader />
      <section className="px-5 py-10 sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <AppAccessGate area="seller">
            <SellerOnboardingForm />
          </AppAccessGate>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
