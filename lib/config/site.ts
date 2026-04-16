import { env } from "@/lib/config/env";

export const siteConfig = {
  productName: "LessonForge",
  legacyName: "TeachReady",
  description:
    "LessonForge helps teachers create, upload, optimize, and sell classroom resources with optional AI assistance.",
  founderHubPath: "/founder",
  productionUrl: "https://lessonforgehub.com",
  supportEmail: "hello@lessonforgehub.com",
  authFromEmail: "no-reply@lessonforgehub.com",
  homepageHeadline: "Build lessons. Sell smarter. Earn more.",
  homepageSubheadline:
    "Create, upload, and sell K-12 resources your way. Use AI when you want it.",
} as const;

export type SiteConfig = typeof siteConfig;

function normalizeOrigin(candidate: string) {
  try {
    return new URL(candidate).origin;
  } catch {
    return siteConfig.productionUrl;
  }
}

export function getSiteOrigin() {
  return normalizeOrigin(
    env.NEXT_PUBLIC_SITE_URL || env.NEXT_PUBLIC_APP_URL || siteConfig.productionUrl,
  );
}

export function buildAuthCallbackUrl(nextPath: string) {
  const safeNextPath = nextPath.startsWith("/") ? nextPath : "/";
  return `${getSiteOrigin()}/auth/callback?next=${encodeURIComponent(safeNextPath)}`;
}
