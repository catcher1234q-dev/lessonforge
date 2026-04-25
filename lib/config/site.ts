import { env } from "@/lib/config/env";

export const siteConfig = {
  productName: "LessonForge",
  legacyName: "TeachReady",
  description:
    "LessonForgeHub is a digital marketplace where teachers sell original classroom resources and buyers purchase ready-to-download teaching materials.",
  founderHubPath: "/founder",
  productionUrl: "https://lessonforgehub.com",
  supportEmail: "support@lessonforgehub.com",
  authFromEmail: "no-reply@lessonforgehub.com",
  homepageHeadline: "Buy and sell teacher-made classroom resources.",
  homepageSubheadline:
    "LessonForgeHub helps teacher creators upload original resources, helps buyers download digital materials quickly, and keeps marketplace rules visible.",
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
  void nextPath;
  return `${getSiteOrigin()}/auth/callback`;
}

export function buildAuthResetPasswordUrl() {
  return `${getSiteOrigin()}/auth/reset-password`;
}
