import { env } from "@/lib/config/env";

export const featureFlags = {
  aiEnabled: env.FEATURE_AI_ENABLED,
  demoModeEnabled: env.FEATURE_DEMO_MODE,
  stripeEnabled: env.FEATURE_STRIPE_ENABLED,
  reviewsEnabled: env.FEATURE_REVIEWS_ENABLED,
  refundsEnabled: env.FEATURE_REFUNDS_ENABLED,
  adminEnabled: env.FEATURE_ADMIN_ENABLED,
} as const;

export type FeatureFlags = typeof featureFlags;
