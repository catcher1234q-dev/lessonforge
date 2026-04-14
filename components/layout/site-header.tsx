import { SiteHeaderShell } from "@/components/layout/site-header-shell";
import { getPrivateAccessRole } from "@/lib/auth/private-access";
import { siteConfig } from "@/lib/config/site";
import { getPersistenceReadiness } from "@/lib/lessonforge/persistence-readiness";
import {
  getViewerContext,
  getViewerFavoriteProductIds,
} from "@/lib/lessonforge/server-operations";

export async function SiteHeader() {
  const [viewer, favoriteProductIds, privateAccessRole] = await Promise.all([
    getViewerContext(),
    getViewerFavoriteProductIds(),
    getPrivateAccessRole(),
  ]);
  const canSeeAdmin = (privateAccessRole === "admin" || privateAccessRole === "owner") &&
    (viewer.role === "admin" || viewer.role === "owner");
  const canSeeOwner = privateAccessRole === "owner" && viewer.role === "owner";
  const persistenceReadiness =
    canSeeAdmin && (viewer.role === "admin" || viewer.role === "owner")
      ? await getPersistenceReadiness()
      : null;
  const shortlistCount = viewer.role === "buyer" ? favoriteProductIds.length : 0;
  const persistenceBadgeHref = viewer.role === "owner" ? siteConfig.founderHubPath : "/admin";

  return (
    <SiteHeaderShell
      persistenceBadgeHref={persistenceBadgeHref}
      persistenceReport={persistenceReadiness?.cutoverReport ?? null}
      persistenceSummary={persistenceReadiness?.cutoverReport.summary ?? null}
      primaryLinks={[
        {
          description: "open the guided walkthrough for buyer, seller, and checkout flows",
          href: "/walkthrough",
          label: "Walkthrough",
        },
        {
          description: "browse listings, open a product, and preview before you buy",
          href: "/marketplace",
          label: "Marketplace",
        },
        {
          description: "save listings you want to compare before deciding",
          href: "/favorites",
          label: "Saved items",
        },
        {
          description: "set up payouts, create a listing, and move it toward buyers",
          href: "/sell",
          label: "Sell",
        },
        {
          description: "reopen purchased files, updates, and support actions",
          href: "/library",
          label: "Purchases",
        },
        ...(canSeeAdmin
          ? [{
              description: "review moderation, refunds, reports, and operations",
              href: "/admin",
              label: "Admin",
            }]
          : []),
      ]}
      productName={siteConfig.productName}
      secondaryLinks={[
        { href: "/#how-it-works", label: "How It Works" },
        { href: "/#subjects", label: "Subjects" },
        { href: "/#pricing", label: "Pricing" },
        { href: "/#faq", label: "FAQ" },
        ...(canSeeOwner ? [{ href: siteConfig.founderHubPath, label: "Owner View" }] : []),
      ]}
      shortlistCount={shortlistCount}
    />
  );
}
