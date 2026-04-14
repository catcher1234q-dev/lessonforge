import { AppAccessGate } from "@/components/account/app-access-gate";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { SellerOnboardingForm } from "@/components/seller/onboarding-form";

export default function SellerOnboardingPage() {
  return (
    <main className="page-shell min-h-screen">
      <SiteHeader />
      <section className="px-5 py-16 sm:px-6 lg:px-8">
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
