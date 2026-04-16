import { env } from "@/lib/config/env";

export type PlanKey = "starter" | "basic" | "pro";

export type PlanConfig = {
  key: PlanKey;
  label: string;
  monthlyPriceUsd: number;
  shortDescription: string;
  bestFor: string;
  activeListingLimit: number;
  ctaLabel: string;
  valueNote?: string;
  badgeLabel?: string;
  creditGrantLabel: string;
  creditResetPolicy: "oneTime" | "billingCycle";
  availableCredits: number;
  sellerSharePercent: number;
  platformSharePercent: number;
  sellerShareBps: number;
  platformShareBps: number;
  manualUploadsAllowed: boolean;
  fullAiGenerationEnabled: boolean;
  rolloverPolicy: "none";
  featureHighlights: string[];
};

export function isPlanKey(value: string): value is PlanKey {
  return value === "starter" || value === "basic" || value === "pro";
}

export function normalizePlanKey(value?: string | null): PlanKey {
  if (!value) {
    return defaultPlanKey;
  }

  if (isPlanKey(value)) {
    return value;
  }

  switch (value.toLowerCase()) {
    case "free":
      return "starter";
    case "creator":
      return "basic";
    case "proseller":
    case "pro_seller":
    case "pro-seller":
      return "pro";
    default:
      return defaultPlanKey;
  }
}

export const planConfig: Record<PlanKey, PlanConfig> = {
  starter: {
    key: "starter",
    label: "Starter",
    monthlyPriceUsd: 0,
    shortDescription:
      "Best for first time sellers who want to launch one product and test demand before upgrading.",
    bestFor: "Trying your first listing before committing to a paid plan.",
    activeListingLimit: 1,
    ctaLabel: "Start Free",
    creditGrantLabel: "5 AI credits each billing cycle",
    creditResetPolicy: "billingCycle",
    availableCredits: env.PLAN_STARTER_CREDITS,
    sellerSharePercent: 50,
    platformSharePercent: 50,
    sellerShareBps: 5000,
    platformShareBps: 5000,
    manualUploadsAllowed: true,
    fullAiGenerationEnabled: false,
    rolloverPolicy: "none",
    featureHighlights: [
      "1 active listing",
      "50 percent seller share / 50 percent platform share",
      "5 AI credits each billing cycle",
      "Basic listing creation",
      "Community support",
      "No advanced AI optimization",
    ],
  },
  basic: {
    key: "basic",
    label: "Basic",
    monthlyPriceUsd: 19,
    shortDescription:
      "Best for active classroom sellers who want stronger payouts, more AI support, and enough tools to publish consistently each month.",
    bestFor:
      "Consistent monthly publishing with better payout and better optimization tools.",
    activeListingLimit: 10,
    ctaLabel: "Choose Basic",
    valueNote: "Most popular for growing sellers",
    badgeLabel: "Recommended",
    creditGrantLabel: "100 AI credits each billing cycle",
    creditResetPolicy: "billingCycle",
    availableCredits: env.PLAN_BASIC_MONTHLY_CREDITS,
    sellerSharePercent: 60,
    platformSharePercent: 40,
    sellerShareBps: 6000,
    platformShareBps: 4000,
    manualUploadsAllowed: true,
    fullAiGenerationEnabled: false,
    rolloverPolicy: "none",
    featureHighlights: [
      "10 active listings",
      "60 percent seller share / 40 percent platform share",
      "100 AI credits each billing cycle",
      "AI title and description optimization",
      "Listing quality suggestions",
      "Basic analytics dashboard",
      "Email support",
    ],
  },
  pro: {
    key: "pro",
    label: "Pro",
    monthlyPriceUsd: 39,
    shortDescription:
      "Best for serious sellers who want the strongest payout, the deepest AI support, and priority tools to grow faster.",
    bestFor:
      "Heavier selling with the strongest payout and most support.",
    activeListingLimit: 50,
    ctaLabel: "Choose Pro",
    valueNote: "Best value for serious sellers",
    creditGrantLabel: "300 AI credits each billing cycle",
    creditResetPolicy: "billingCycle",
    availableCredits: env.PLAN_PRO_MONTHLY_CREDITS,
    sellerSharePercent: 80,
    platformSharePercent: 20,
    sellerShareBps: 8000,
    platformShareBps: 2000,
    manualUploadsAllowed: true,
    fullAiGenerationEnabled: false,
    rolloverPolicy: "none",
    featureHighlights: [
      "50 active listings",
      "80 percent seller share / 20 percent platform share",
      "300 AI credits each billing cycle",
      "Advanced AI listing optimization",
      "Priority placement support placeholder",
      "Advanced analytics dashboard",
      "Priority support",
    ],
  },
};

export const defaultPlanKey: PlanKey = "starter";

export const starterUpgradePromptSalesThresholdCents = 10_000;

export const aiActionCosts = {
  titleSuggestion: 1,
  descriptionRewrite: 2,
  standardsScan: 2,
  thumbnailGeneration: 4,
  previewGeneration: 5,
} as const;
