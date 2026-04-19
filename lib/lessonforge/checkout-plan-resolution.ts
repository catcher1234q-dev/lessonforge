import { normalizePlanKey, type PlanKey } from "@/lib/config/plans";
import type { SellerProfileDraft } from "@/types";

type SellerSubscriptionSnapshot = {
  plan_name?: string | null;
  status?: string | null;
} | null;

type SellerPayoutPlanResolutionSuccess = {
  ok: true;
  planKey: PlanKey;
  matchedProfilePlanKey: PlanKey;
  subscriptionPlanName: string | null;
  subscriptionStatus: string | null;
  source: "seller_profile" | "subscription";
};

type SellerPayoutPlanResolutionFailure = {
  ok: false;
  code:
    | "missing_seller_id"
    | "missing_seller_profile"
    | "paid_plan_unverified";
  message: string;
  matchedProfilePlanKey: PlanKey | null;
  subscriptionPlanName: string | null;
  subscriptionStatus: string | null;
};

export type SellerPayoutPlanResolution =
  | SellerPayoutPlanResolutionSuccess
  | SellerPayoutPlanResolutionFailure;

function isPaidSellerSubscriptionStatus(status?: string | null) {
  return status === "active" || status === "trialing";
}

export function resolveSellerPayoutPlan(input: {
  sellerId?: string | null;
  sellerProfiles: SellerProfileDraft[];
  syncedSubscription: SellerSubscriptionSnapshot;
}): SellerPayoutPlanResolution {
  const sellerId = input.sellerId?.trim().toLowerCase() ?? "";

  if (!sellerId) {
    return {
      ok: false,
      code: "missing_seller_id",
      message: "Seller payout setup is incomplete for this product.",
      matchedProfilePlanKey: null,
      subscriptionPlanName: null,
      subscriptionStatus: null,
    };
  }

  const matchedProfile =
    input.sellerProfiles.find((profile) => profile.email.trim().toLowerCase() === sellerId) ?? null;

  if (!matchedProfile) {
    return {
      ok: false,
      code: "missing_seller_profile",
      message: "Seller payout setup is incomplete for this product.",
      matchedProfilePlanKey: null,
      subscriptionPlanName: input.syncedSubscription?.plan_name ?? null,
      subscriptionStatus: input.syncedSubscription?.status ?? null,
    };
  }

  const matchedProfilePlanKey = normalizePlanKey(matchedProfile.sellerPlanKey);
  const subscriptionPlanName = input.syncedSubscription?.plan_name ?? null;
  const subscriptionStatus = input.syncedSubscription?.status ?? null;
  const hasPaidSubscription = isPaidSellerSubscriptionStatus(subscriptionStatus);

  if (subscriptionPlanName && hasPaidSubscription) {
    return {
      ok: true,
      planKey: normalizePlanKey(subscriptionPlanName),
      matchedProfilePlanKey,
      subscriptionPlanName,
      subscriptionStatus,
      source: "subscription",
    };
  }

  const normalizedSubscriptionPlanKey = subscriptionPlanName
    ? normalizePlanKey(subscriptionPlanName)
    : null;

  if (
    matchedProfilePlanKey === "starter" &&
    (!subscriptionPlanName || normalizedSubscriptionPlanKey === "starter")
  ) {
    return {
      ok: true,
      planKey: "starter",
      matchedProfilePlanKey,
      subscriptionPlanName,
      subscriptionStatus,
      source: "seller_profile",
    };
  }

  return {
    ok: false,
    code: "paid_plan_unverified",
    message: "Seller payout plan could not be verified right now. Please try again soon.",
    matchedProfilePlanKey,
    subscriptionPlanName,
    subscriptionStatus,
  };
}
