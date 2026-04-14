import { defaultPlanKey, planConfig, type PlanKey } from "@/lib/config/plans";

export const marketplaceConfig = {
  currency: "usd",
  defaultPlanKey,
  reviewEligibleStatuses: ["paid", "fulfilled"] as const,
  freshnessWindowDays: 14,
  defaultLicenseSeatCount: 1,
} as const;

export type MarketplaceConfig = typeof marketplaceConfig;

export function getMarketplaceSplitForPlan(
  planKey: PlanKey = marketplaceConfig.defaultPlanKey,
) {
  const plan = planConfig[planKey];

  return {
    sellerSharePercent: plan.sellerSharePercent,
    platformSharePercent: plan.platformSharePercent,
    sellerShareBps: plan.sellerShareBps,
    platformShareBps: plan.platformShareBps,
  };
}
