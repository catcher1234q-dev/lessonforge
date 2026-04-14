import { getMarketplaceSplitForPlan } from "@/lib/config/marketplace";
import type { PlanKey } from "@/lib/config/plans";
import { calculateMarketplaceSplit } from "@/lib/domain/marketplace";

export function calculatePlatformFeeCents(priceCents: number, planKey?: PlanKey) {
  return calculateMarketplaceSplit(priceCents, planKey).platformCents;
}

export function calculateSellerPayoutCents(priceCents: number, planKey?: PlanKey) {
  return calculateMarketplaceSplit(priceCents, planKey).sellerCents;
}

export function getSellerShareLabel(planKey?: PlanKey) {
  return `${getMarketplaceSplitForPlan(planKey).sellerSharePercent}%`;
}

export function getPlatformShareLabel(planKey?: PlanKey) {
  return `${getMarketplaceSplitForPlan(planKey).platformSharePercent}%`;
}
