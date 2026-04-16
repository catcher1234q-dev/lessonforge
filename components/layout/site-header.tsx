import { SiteHeaderShell } from "@/components/layout/site-header-shell";
import { getPrivateAccessRole } from "@/lib/auth/private-access";
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
  const persistenceReadiness =
    canSeeAdmin && (viewer.role === "admin" || viewer.role === "owner")
      ? await getPersistenceReadiness()
      : null;
  const persistenceBadgeHref = viewer.role === "owner" ? "/founder" : "/admin";

  return (
    <SiteHeaderShell
      persistenceBadgeHref={persistenceBadgeHref}
      persistenceReport={persistenceReadiness?.cutoverReport ?? null}
      persistenceSummary={persistenceReadiness?.cutoverReport.summary ?? null}
      primaryLinks={[
        {
          description: "browse lesson resources and open product pages",
          href: "/marketplace",
          label: "Marketplace",
        },
        {
          description: "open the seller area and create or manage listings",
          href: "/sell",
          label: "Sell",
        },
        {
          description: "review seller plans and choose the one that fits your business",
          href: "/#pricing",
          label: "Pricing",
        },
      ]}
      productName="LessonForge"
      secondaryLinks={[]}
    />
  );
}
