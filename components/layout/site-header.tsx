import { SiteHeaderShell } from "@/components/layout/site-header-shell";
import { getOwnerAccessContext } from "@/lib/auth/owner-access";
import { getViewerContext } from "@/lib/lessonforge/server-operations";

export async function SiteHeader() {
  const [viewer, ownerAccess] = await Promise.all([
    getViewerContext(),
    getOwnerAccessContext(),
  ]);
  const adminHref = "/founder";

  return (
    <SiteHeaderShell
      adminHref={adminHref}
      isOwner={ownerAccess.isOwner}
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
      secondaryLinks={
        ownerAccess.isOwner
          ? [
              {
                description: "open the private founder dashboard",
                href: adminHref,
                label: "Admin",
              },
            ]
          : []
      }
    />
  );
}
