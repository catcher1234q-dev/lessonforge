import { normalizePlanKey, type PlanKey } from "@/lib/config/plans";

function isPlaceholderStripePriceId(priceId?: string | null) {
  if (!priceId) {
    return true;
  }

  return (
    priceId === "price_replace_me" ||
    priceId === "replace_me" ||
    priceId.includes("replace_me")
  );
}

export function getSellerPlanStripePriceId(planKey: PlanKey) {
  switch (normalizePlanKey(planKey)) {
    case "basic":
      return process.env.STRIPE_PRICE_SELLER_BASIC_MONTHLY ?? null;
    case "pro":
      return process.env.STRIPE_PRICE_SELLER_PRO_MONTHLY ?? null;
    case "starter":
    default:
      return null;
  }
}

export function isSellerPlanBillingConfigured(planKey: PlanKey) {
  if (normalizePlanKey(planKey) === "starter") {
    return false;
  }

  return !isPlaceholderStripePriceId(getSellerPlanStripePriceId(planKey));
}

export function getPlanKeyFromSellerStripePriceId(priceId?: string | null) {
  if (!priceId) {
    return null;
  }

  if (priceId === getSellerPlanStripePriceId("basic")) {
    return "basic" as const;
  }

  if (priceId === getSellerPlanStripePriceId("pro")) {
    return "pro" as const;
  }

  return null;
}

export function buildSellerPlanCheckoutHref(input: {
  planKey: PlanKey;
  returnTo: string;
}) {
  const params = new URLSearchParams({
    plan: input.planKey,
    returnTo: input.returnTo,
  });

  return `/api/billing/seller-plan-checkout?${params.toString()}`;
}

export function buildSellerPlanManageHref(input: { returnTo: string }) {
  const params = new URLSearchParams({
    returnTo: input.returnTo,
  });

  return `/api/billing/seller-plan-manage?${params.toString()}`;
}
