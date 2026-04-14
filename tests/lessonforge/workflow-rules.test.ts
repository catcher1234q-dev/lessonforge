import assert from "node:assert/strict";
import test from "node:test";

import {
  applyAdminProductModeration,
  buildSellerProductRevision,
  debitAiCredits,
  refundAiCredits,
} from "@/lib/lessonforge/workflow-rules";
import type { ProductRecord, SubscriptionRecord, UsageLedgerEntry } from "@/types";

const baseProduct: ProductRecord = {
  id: "product-1",
  title: "Fractions Intervention Pack",
  subject: "Math",
  gradeBand: "3-5",
  standardsTag: "CCSS.MATH.CONTENT.4.NF.B.3",
  updatedAt: "Saved just now",
  format: "PDF Resource",
  summary: "Fractions intervention support.",
  demoOnly: false,
  sellerId: "seller-1",
  sellerName: "Avery Johnson",
  sellerStripeAccountId: "acct_demo",
  priceCents: 1200,
  isPurchasable: false,
  productStatus: "Flagged",
  moderationFeedback: "Add a clearer preview.",
  createdPath: "Manual upload",
  previewIncluded: false,
  thumbnailIncluded: false,
  rightsConfirmed: false,
  assetVersionNumber: 1,
};

const baseSubscription: SubscriptionRecord = {
  sellerId: "seller-1",
  sellerEmail: "seller@example.com",
  planKey: "basic",
  monthlyCredits: 100,
  availableCredits: 12,
  cycleLabel: "Current cycle",
  rolloverPolicy: "none",
};

test("admin moderation updates purchasability and trims seller-facing feedback", () => {
  const moderated = applyAdminProductModeration(
    baseProduct,
    "Published",
    "  Ready to go live.  ",
  );

  assert.equal(moderated.productStatus, "Published");
  assert.equal(moderated.isPurchasable, true);
  assert.equal(moderated.moderationFeedback, "Ready to go live.");
  assert.equal(moderated.updatedAt, "Status updated just now");
});

test("seller revision resubmission clears stale moderation notes and updates review state", () => {
  const revised = buildSellerProductRevision(baseProduct, {
    title: "Fractions Intervention Pack Revised",
    subject: "Math",
    gradeBand: "3-5",
    priceCents: 1500,
    notes: "Expanded preview pages and clearer instructions.",
    licenseType: "Single classroom",
    createdPath: "Manual upload",
    previewIncluded: true,
    thumbnailIncluded: true,
    rightsConfirmed: true,
    nextStatus: "Pending review",
  });

  assert.equal(revised.title, "Fractions Intervention Pack Revised");
  assert.equal(revised.productStatus, "Pending review");
  assert.equal(revised.updatedAt, "Resubmitted for review just now");
  assert.equal(revised.moderationFeedback, undefined);
  assert.equal(revised.isPurchasable, false);
  assert.equal(revised.shortDescription, "Expanded preview pages and clearer instructions.");
  assert.equal(revised.previewIncluded, true);
  assert.equal(revised.thumbnailIncluded, true);
  assert.equal(revised.rightsConfirmed, true);
  assert.equal(revised.assetVersionNumber, 2);
});

test("seller draft save also clears stale moderation notes without publishing the listing", () => {
  const revised = buildSellerProductRevision(baseProduct, {
    title: "Fractions Intervention Pack Draft",
    subject: "Math",
    gradeBand: "3-5",
    priceCents: 1500,
    notes: "Working draft update.",
    licenseType: "Single classroom",
    createdPath: "Manual upload",
    previewIncluded: true,
    thumbnailIncluded: false,
    rightsConfirmed: true,
    nextStatus: "Draft",
  });

  assert.equal(revised.productStatus, "Draft");
  assert.equal(revised.updatedAt, "Updated just now");
  assert.equal(revised.moderationFeedback, undefined);
  assert.equal(revised.isPurchasable, false);
  assert.equal(revised.assetVersionNumber, 2);
});

test("AI debit reduces available credits and records an applied ledger entry", () => {
  const debited = debitAiCredits(baseSubscription, {
    sellerId: "seller-1",
    action: "standardsScan",
    creditsUsed: 2,
    provider: "openai",
    idempotencyKey: "scan-1",
    createdAt: "2026-03-31T15:00:00.000Z",
  });

  assert.equal(debited.subscription.availableCredits, 10);
  assert.equal(debited.ledgerEntry.status, "applied");
  assert.equal(debited.ledgerEntry.refundedCredits, 0);
  assert.equal(debited.ledgerEntry.idempotencyKey, "scan-1");
});

test("AI refund restores credits exactly once and marks the ledger entry refunded", () => {
  const debited = debitAiCredits(baseSubscription, {
    sellerId: "seller-1",
    action: "standardsScan",
    creditsUsed: 2,
    provider: "openai",
    idempotencyKey: "scan-2",
    createdAt: "2026-03-31T15:00:00.000Z",
  });

  const refunded = refundAiCredits(debited.subscription, debited.ledgerEntry);

  assert.equal(refunded.subscription?.availableCredits, 12);
  assert.equal(refunded.ledgerEntry?.status, "refunded");
  assert.equal(refunded.ledgerEntry?.refundedCredits, 2);

  const refundedAgain = refundAiCredits(
    refunded.subscription,
    refunded.ledgerEntry as UsageLedgerEntry,
  );

  assert.equal(refundedAgain.subscription?.availableCredits, 12);
  assert.equal(refundedAgain.ledgerEntry?.status, "refunded");
  assert.equal(refundedAgain.ledgerEntry?.refundedCredits, 2);
});

test("AI debit refuses actions that exceed the seller credit balance", () => {
  assert.throws(
    () =>
      debitAiCredits(baseSubscription, {
        sellerId: "seller-1",
        action: "previewGeneration",
        creditsUsed: 20,
        provider: "openai",
        idempotencyKey: "scan-3",
      }),
    /Not enough AI credits remaining/,
  );
});
