import { PrivateAccessClient } from "@/components/layout/private-access-client";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

export default function OwnerAccessPage() {
  return (
    <main className="page-shell min-h-screen">
      <SiteHeader />
      <PrivateAccessClient />
      <SiteFooter />
    </main>
  );
}
