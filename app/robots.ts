import type { MetadataRoute } from "next";

import { siteConfig } from "@/lib/config/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/account",
        "/admin",
        "/api",
        "/auth/callback",
        "/checkout",
        "/checkout-preview",
        "/demo",
        "/favorites",
        "/founder",
        "/launch-checklist",
        "/library",
        "/live-readiness",
        "/owner-access",
        "/sell/dashboard",
        "/sell/onboarding",
        "/sell/products",
        "/walkthrough",
        "/workspace",
      ],
    },
    sitemap: `${siteConfig.productionUrl}/sitemap.xml`,
    host: siteConfig.productionUrl,
  };
}
