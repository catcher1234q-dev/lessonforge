import assert from "node:assert/strict";
import test from "node:test";

import { getSellerModerationGuidance } from "@/lib/lessonforge/moderation-guidance";
import type { ProductRecord } from "@/types";

const baseProduct: ProductRecord = {
  id: "product-1",
  title: "Fraction check-in",
  subject: "Math",
  gradeBand: "6-8",
  standardsTag: "CCSS.MATH.CONTENT.6.NS.B.3",
  updatedAt: "Updated just now",
  format: "PDF Resource",
  summary: "Quick intervention resource.",
  demoOnly: false,
  resourceType: "Worksheet",
  shortDescription: "Short summary",
  fullDescription: "Full listing description",
  licenseType: "Single classroom",
  previewIncluded: true,
  thumbnailIncluded: true,
  rightsConfirmed: true,
  productStatus: "Pending review",
};

test("returns null for non-moderation statuses", () => {
  assert.equal(getSellerModerationGuidance(baseProduct), null);
});

test("builds flagged guidance from blockers", () => {
  const guidance = getSellerModerationGuidance({
    ...baseProduct,
    productStatus: "Flagged",
    previewIncluded: false,
    moderationFeedback: "Add preview pages before this goes back into review.",
  });

  assert.ok(guidance);
  assert.match(guidance.headline, /Flagged listings/);
  assert.equal(
    guidance.summary,
    "Add preview pages before this goes back into review.",
  );
  assert.deepEqual(guidance.priorityActions, ["Generate or attach preview pages"]);
});

test("builds rejected guidance with fallback actions when blockers are clear", () => {
  const guidance = getSellerModerationGuidance({
    ...baseProduct,
    productStatus: "Rejected",
  });

  assert.ok(guidance);
  assert.match(guidance.headline, /Rejected listings/);
  assert.equal(
    guidance.summary,
    "Use the seller note and the checklist below to tighten the listing before resubmitting it.",
  );
  assert.equal(guidance.priorityActions.length, 2);
});
