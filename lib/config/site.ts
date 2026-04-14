export const siteConfig = {
  productName: "LessonForge",
  legacyName: "TeachReady",
  description:
    "LessonForge helps teachers create, upload, optimize, and sell classroom resources with optional AI assistance.",
  founderHubPath: "/founder",
  supportEmail: "hello@lessonforge.app",
  homepageHeadline: "Build lessons. Sell smarter. Earn more.",
  homepageSubheadline:
    "Create, upload, and sell K-12 resources your way. Use AI when you want it.",
} as const;

export type SiteConfig = typeof siteConfig;
