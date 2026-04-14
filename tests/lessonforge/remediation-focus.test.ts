import assert from "node:assert/strict";
import test from "node:test";

import {
  getSellerRemediationFocus,
  getSellerRemediationFocusLabel,
} from "@/lib/lessonforge/remediation-focus";
import type { ProductRecord } from "@/types";

const baseProduct: ProductRecord = {
  id: "product-1",
  title: "Resource",
  subject: "Math",
  gradeBand: "6-8",
  standardsTag: "CCSS.MATH.CONTENT.6.NS.B.3",
  updatedAt: "Updated just now",
  format: "PDF Resource",
  summary: "Summary",
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

test("prefers preview blockers first", () => {
  assert.equal(
    getSellerRemediationFocus({
      ...baseProduct,
      previewIncluded: false,
      thumbnailIncluded: false,
    }),
    "preview",
  );
});

test("falls back to details when moderation needs copy work", () => {
  assert.equal(
    getSellerRemediationFocus({
      ...baseProduct,
      productStatus: "Rejected",
    }),
    "details",
  );
});

test("returns readable labels", () => {
  assert.equal(getSellerRemediationFocusLabel("rights"), "Rights confirmed");
});
