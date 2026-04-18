import type { Metadata } from "next";

import { PrivateAccessClient } from "@/components/layout/private-access-client";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { buildNoIndexMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildNoIndexMetadata(
  "Private Access",
  "Private LessonForgeHub owner and admin access entry.",
);

export default function OwnerAccessPage() {
  return (
    <main className="page-shell min-h-screen">
      <SiteHeader />
      <PrivateAccessClient />
      <SiteFooter />
    </main>
  );
}
