import test from "node:test";
import assert from "node:assert/strict";

import {
  findExistingOpenReport,
  findExistingReview,
  findExistingSubmittedRefundRequest,
  findOrderById,
  hasVerifiedPurchase,
  isPublicProductStatus,
  orderBelongsToBuyer,
} from "@/lib/lessonforge/marketplace-rules";
import type {
  OrderRecord,
  RefundRequestRecord,
  ReportRecord,
  ReviewRecord,
} from "@/types";

const demoOrders: OrderRecord[] = [
  {
    id: "order-1",
    productId: "product-1",
    productTitle: "Fractions Pack",
    buyerName: "Avery Stone",
    buyerEmail: "avery@example.com",
    sellerName: "Math Studio",
    sellerId: "seller-1",
    amountCents: 1200,
    sellerShareCents: 720,
    platformShareCents: 480,
    versionLabel: "Version 2",
    accessType: "Single classroom",
    updatedLabel: "Updated recently",
    instructions: "Open the PDF and print.",
    purchasedAt: "2026-03-31T10:00:00.000Z",
  },
];

const demoReviews: ReviewRecord[] = [
  {
    id: "review-1",
    productId: "product-1",
    productTitle: "Fractions Pack",
    rating: 5,
    title: "Loved it",
    body: "Great resource.",
    buyerName: "Avery Stone",
    buyerEmail: "avery@example.com",
    verifiedPurchase: true,
    createdAt: "2026-03-31T11:00:00.000Z",
  },
];

const demoRefundRequests: RefundRequestRecord[] = [
  {
    id: "refund-1",
    orderId: "order-1",
    productId: "product-1",
    productTitle: "Fractions Pack",
    buyerName: "Avery Stone",
    buyerEmail: "avery@example.com",
    sellerName: "Math Studio",
    reason: "Broken file",
    status: "Submitted",
    requestedAt: "2026-03-31T12:00:00.000Z",
  },
];

const demoReports: ReportRecord[] = [
  {
    id: "report-1",
    productId: "product-1",
    productTitle: "Fractions Pack",
    reporterName: "Avery Stone",
    reporterEmail: "avery@example.com",
    category: "Access issue",
    status: "Open",
    details: "Link is broken.",
    createdAt: "2026-03-31T12:30:00.000Z",
  },
];

test("verified purchase check is tied to product and normalized buyer email", () => {
  assert.equal(hasVerifiedPurchase(demoOrders, "product-1", "AVERY@example.com"), true);
  assert.equal(hasVerifiedPurchase(demoOrders, "product-2", "avery@example.com"), false);
  assert.equal(hasVerifiedPurchase(demoOrders, "product-1", "other@example.com"), false);
});

test("existing review lookup blocks duplicate reviews by email or buyer name", () => {
  assert.equal(
    findExistingReview(
      demoReviews,
      "product-1",
      "Someone Else",
      "AVERY@example.com",
    )?.id,
    "review-1",
  );

  assert.equal(
    findExistingReview(
      demoReviews,
      "product-1",
      "avery stone",
      "different@example.com",
    )?.id,
    "review-1",
  );

  assert.equal(
    findExistingReview(
      demoReviews,
      "product-2",
      "Avery Stone",
      "avery@example.com",
    ),
    undefined,
  );
});

test("refund rules find the matching order, enforce buyer ownership, and prevent duplicate submitted requests", () => {
  const order = findOrderById(demoOrders, "order-1");

  assert.ok(order);
  assert.equal(orderBelongsToBuyer(order, "avery@example.com"), true);
  assert.equal(orderBelongsToBuyer(order, "AVERY@example.com"), true);
  assert.equal(orderBelongsToBuyer(order, "other@example.com"), false);
  assert.equal(findExistingSubmittedRefundRequest(demoRefundRequests, "order-1")?.id, "refund-1");
  assert.equal(findExistingSubmittedRefundRequest(demoRefundRequests, "order-2"), undefined);
});

test("report rules prevent duplicate open reports from the same reporter", () => {
  assert.equal(
    findExistingOpenReport(demoReports, "product-1", "AVERY@example.com")?.id,
    "report-1",
  );
  assert.equal(
    findExistingOpenReport(demoReports, "product-1", "other@example.com"),
    undefined,
  );
  assert.equal(
    findExistingOpenReport(demoReports, "product-2", "avery@example.com"),
    undefined,
  );
});

test("only published listings are public to marketplace buyers", () => {
  assert.equal(isPublicProductStatus(undefined), true);
  assert.equal(isPublicProductStatus("Published"), true);
  assert.equal(isPublicProductStatus("Draft"), false);
  assert.equal(isPublicProductStatus("Pending review"), false);
  assert.equal(isPublicProductStatus("Flagged"), false);
  assert.equal(isPublicProductStatus("Rejected"), false);
  assert.equal(isPublicProductStatus("Removed"), false);
});
