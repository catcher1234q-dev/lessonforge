import { normalizePlanKey, planConfig, type PlanKey } from "@/lib/config/plans";
import { getAiCreditCost } from "@/lib/services/ai/credits";
import type { ProductRecord, SubscriptionRecord, UsageLedgerEntry } from "@/types";

type PremiumFeatureKey = "fullListingOptimization" | "revenueInsights";

export type ListingLimitStatus = {
  planKey: PlanKey;
  limit: number;
  current: number;
  remaining: number;
  reached: boolean;
};

export type AiCreditStatus = {
  planKey: PlanKey;
  availableCredits: number;
  actionCost: number;
  hasCredits: boolean;
};

export type PremiumFeatureStatus = {
  feature: PremiumFeatureKey;
  unlocked: boolean;
  upgradePlanKey: PlanKey;
};

const managedListingStatuses: NonNullable<ProductRecord["productStatus"]>[] = [
  "Draft",
  "Pending review",
  "Published",
  "Flagged",
  "Rejected",
];

export function countManagedListingsForSeller(
  products: ProductRecord[],
  sellerId?: string | null,
  excludeProductId?: string,
) {
  if (!sellerId) {
    return 0;
  }

  return products.filter(
    (product) =>
      product.sellerId === sellerId &&
      product.id !== excludeProductId &&
      managedListingStatuses.includes(product.productStatus ?? "Draft"),
  ).length;
}

export function getListingLimitStatus(input: {
  sellerPlanKey?: string | null;
  products: ProductRecord[];
  sellerId?: string | null;
  excludeProductId?: string;
}): ListingLimitStatus {
  const planKey = normalizePlanKey(input.sellerPlanKey);
  const limit = planConfig[planKey].activeListingLimit;
  const current = countManagedListingsForSeller(
    input.products,
    input.sellerId,
    input.excludeProductId,
  );

  return {
    planKey,
    limit,
    current,
    remaining: Math.max(0, limit - current),
    reached: current >= limit,
  };
}

export function getAiCreditStatus(input: {
  sellerPlanKey?: string | null;
  subscription?: Pick<SubscriptionRecord, "availableCredits"> | null;
  action: UsageLedgerEntry["action"];
}): AiCreditStatus {
  const planKey = normalizePlanKey(input.sellerPlanKey);
  const availableCredits =
    input.subscription?.availableCredits ?? planConfig[planKey].availableCredits;
  const actionCost = getAiCreditCost(input.action);

  return {
    planKey,
    availableCredits,
    actionCost,
    hasCredits: availableCredits >= actionCost,
  };
}

export function getPremiumFeatureStatus(
  sellerPlanKey: string | null | undefined,
  feature: PremiumFeatureKey,
): PremiumFeatureStatus {
  const planKey = normalizePlanKey(sellerPlanKey);
  const unlocked = planKey !== "starter";

  return {
    feature,
    unlocked,
    upgradePlanKey: feature === "fullListingOptimization" ? "basic" : "basic",
  };
}

export function getListingLimitUpgradeMessage(planKey: PlanKey) {
  return planKey === "starter"
    ? "You have reached your limit on the free plan. Upgrade to publish more listings and keep growing."
    : "You have reached the listing limit on your current plan. Upgrade to keep publishing without slowing down.";
}

export function getAiUpgradeMessage() {
  return "You have used all your AI credits for this period. Upgrade to continue optimizing your listings.";
}

export function getLockedFeatureMessage() {
  return "Unlock full optimization to improve your listing and increase sales.";
}
