import { getMarketplaceSplitForPlan } from "@/lib/config/marketplace";
import { defaultPlanKey, type PlanKey } from "@/lib/config/plans";
import {
  calculatePlatformFeeCents,
  calculateSellerPayoutCents,
  getSellerShareLabel,
} from "@/lib/services/marketplace/revenue";

export const PLATFORM_FEE_BPS = getMarketplaceSplitForPlan(defaultPlanKey).platformShareBps;

export const PAYMENT_METHOD_GROUPS = [
  {
    title: "Cards & wallets",
    methods: ["Card", "Apple Pay", "Google Pay", "Link"],
  },
  {
    title: "Buy now, pay later",
    methods: ["Affirm", "Afterpay", "Klarna"],
  },
  {
    title: "Bank payments",
    methods: ["ACH Direct Debit", "SEPA Debit"],
  },
] as const;

export function formatCurrency(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function calculatePlatformFee(priceCents: number, planKey?: PlanKey) {
  return calculatePlatformFeeCents(priceCents, planKey);
}

export function calculateSellerPayout(priceCents: number, planKey?: PlanKey) {
  return calculateSellerPayoutCents(priceCents, planKey);
}

export function getTeacherPayoutShareLabel(planKey?: PlanKey) {
  return getSellerShareLabel(planKey);
}

export function getMarketplaceResourceById(resourceId: string) {
  return null;
}
