import type { Metadata } from "next";

import { AccountOverviewClient } from "@/components/account/account-overview-client";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { buildNoIndexMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildNoIndexMetadata(
  "Account",
  "Private LessonForgeHub account area for signed-in users.",
);

export default function AccountPage() {
  return (
    <main className="page-shell min-h-screen">
      <SiteHeader />
      <section className="px-5 py-10 sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <AccountOverviewClient />
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
