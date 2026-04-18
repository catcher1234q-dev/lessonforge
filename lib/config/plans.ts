import { env } from "@/lib/config/env";

export type PlanKey = "starter" | "basic" | "pro";

export type PlanConfig = {
  key: PlanKey;
  label: string;
  monthlyPriceUsd: number;
  shortDescription: string;
  bestFor: string;
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
      "Best for first-time sellers who want to upload products, test demand, and use a small AI allowance.",
    bestFor: "Trying your first resources before committing to a paid plan.",
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
      "Unlimited product uploads",
      "50 percent seller share / 50 percent platform share",
      "5 AI credits each billing cycle",
      "Basic listing creation",
      "Publish checks for buyer trust",
      "Community support",
      "Advanced AI tools stay limited by plan",
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
      "Unlimited product uploads",
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
      "Unlimited product uploads",
      "80 percent seller share / 20 percent platform share",
      "300 AI credits each billing cycle",
      "Advanced AI listing optimization",
      "Quality guidance for stronger listings",
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
