import type { MetadataRoute } from "next";

import { siteConfig } from "@/lib/config/site";
import { listMarketplaceListings } from "@/lib/lessonforge/server-catalog";

const publicStaticRoutes = [
  "",
  "/marketplace",
  "/sell",
  "/support",
  "/terms",
  "/privacy",
  "/refund-policy",
  "/seller-agreement",
  "/payout-policy",
  "/about",
] as const;

function toUrl(path: string) {
  return `${siteConfig.productionUrl}${path}`;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const listings = await listMarketplaceListings().catch(() => []);
  const sellerIds = Array.from(new Set(listings.map((listing) => listing.sellerId)));

  return [
    ...publicStaticRoutes.map((path) => ({
      url: toUrl(path),
      lastModified: now,
      changeFrequency: path === "" || path === "/marketplace" ? "weekly" as const : "monthly" as const,
      priority: path === "" ? 1 : path === "/marketplace" ? 0.9 : 0.7,
    })),
    ...listings.map((listing) => ({
      url: toUrl(`/marketplace/${listing.slug}`),
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...sellerIds.map((sellerId) => ({
      url: toUrl(`/store/${sellerId}`),
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
