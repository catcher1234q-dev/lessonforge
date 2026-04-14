import { AccountOverviewClient } from "@/components/account/account-overview-client";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

export default function AccountPage() {
  return (
    <main className="page-shell min-h-screen">
      <SiteHeader />
      <section className="px-5 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <AccountOverviewClient />
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
