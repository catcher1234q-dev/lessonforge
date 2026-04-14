import assert from "node:assert/strict";
import test from "node:test";

import {
  findExistingReview,
  hasVerifiedPurchase,
} from "@/lib/lessonforge/marketplace-rules";
import type { OrderRecord, ReviewRecord } from "@/types";

test("review submission rejects buyers without a matching purchase", () => {
  const orders: OrderRecord[] = [
    {
      id: "order-1",
      productId: "product-2",
      productTitle: "ELA Exit Tickets",
      buyerName: "Jordan Teacher",
      buyerEmail: "buyer@lessonforge.demo",
      sellerName: "Avery Johnson",
      sellerId: "avery@lessonforge.demo",
      amountCents: 1200,
      sellerShareCents: 720,
      platformShareCents: 480,
      versionLabel: "Version 1",
      accessType: "Download + linked asset",
      updatedLabel: "Current version",
      instructions: "Use in class.",
      purchasedAt: new Date().toISOString(),
    },
  ];

  assert.equal(
    hasVerifiedPurchase(orders, "product-1", "buyer@lessonforge.demo"),
    false,
  );
});

test("review submission preserves verified purchaser identity and deduplicates repeat submissions", () => {
  const orders: OrderRecord[] = [
    {
      id: "order-1",
      productId: "product-1",
      productTitle: "Fractions Pack",
      buyerName: "Jordan Teacher",
      buyerEmail: "buyer@lessonforge.demo",
      sellerName: "Avery Johnson",
      sellerId: "avery@lessonforge.demo",
      amountCents: 1200,
      sellerShareCents: 720,
      platformShareCents: 480,
      versionLabel: "Version 1",
      accessType: "Download + linked asset",
      updatedLabel: "Current version",
      instructions: "Use in class.",
      purchasedAt: new Date().toISOString(),
    },
  ];

  const reviews: ReviewRecord[] = [
    {
      id: "review-1",
      productId: "product-1",
      productTitle: "Fractions Pack",
      rating: 5,
      title: "Great fit",
      body: "Clear and ready to use.",
      buyerName: "Jordan Teacher",
      buyerEmail: "buyer@lessonforge.demo",
      verifiedPurchase: true,
      createdAt: new Date().toISOString(),
    },
  ];

  assert.equal(
    hasVerifiedPurchase(orders, "product-1", "buyer@lessonforge.demo"),
    true,
  );

  const existingReview = findExistingReview(
    reviews,
    "product-1",
    "Jordan Teacher",
    "BUYER@lessonforge.demo",
  );

  assert.equal(existingReview?.verifiedPurchase, true);
  assert.equal(existingReview?.buyerEmail, "buyer@lessonforge.demo");
});
