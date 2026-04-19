import assert from "node:assert/strict";
import test from "node:test";

import { resolveSellerPayoutPlan } from "@/lib/lessonforge/checkout-plan-resolution";

test("seller payout plan resolution blocks checkout when a paid plan cannot be verified", () => {
  const resolution = resolveSellerPayoutPlan({
    sellerId: "seller-1@example.com",
    sellerProfiles: [
      {
        displayName: "Seller One",
        email: "seller-1@example.com",
        storeName: "Seller One",
        storeHandle: "seller-one",
        primarySubject: "Math",
        tagline: "",
        sellerPlanKey: "pro",
        onboardingCompleted: true,
      },
    ],
    syncedSubscription: null,
  });

  assert.equal(resolution.ok, false);
  if (resolution.ok) {
    assert.fail("expected paid plan verification failure");
  }
  assert.equal(resolution.code, "paid_plan_unverified");
  assert.equal(
    resolution.message,
    "Seller payout plan could not be verified right now. Please try again soon.",
  );
});

test("seller payout plan resolution trusts an active synced subscription", () => {
  const resolution = resolveSellerPayoutPlan({
    sellerId: "seller-1@example.com",
    sellerProfiles: [
      {
        displayName: "Seller One",
        email: "seller-1@example.com",
        storeName: "Seller One",
        storeHandle: "seller-one",
        primarySubject: "Math",
        tagline: "",
        sellerPlanKey: "starter",
        onboardingCompleted: true,
      },
    ],
    syncedSubscription: {
      plan_name: "basic",
      status: "active",
    },
  });

  assert.equal(resolution.ok, true);
  if (!resolution.ok) {
    assert.fail("expected active subscription to resolve a payout plan");
  }
  assert.equal(resolution.planKey, "basic");
  assert.equal(resolution.source, "subscription");
});
