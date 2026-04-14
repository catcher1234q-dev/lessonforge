import assert from "node:assert/strict";
import test from "node:test";

import {
  getProductAssetHealthStatus,
  getProductPublishBlockers,
  validateProductForSave,
} from "@/lib/lessonforge/product-validation";
import type { ProductRecord } from "@/types";

function createBaseProduct(
  overrides: Partial<ProductRecord> = {},
): ProductRecord {
  return {
    id: "product-1",
    title: "Fractions Pack",
    subject: "Math",
    gradeBand: "3-5",
    standardsTag: "CCSS.MATH.CONTENT.4.NF.A.1",
    updatedAt: "Saved just now",
    format: "PDF Resource",
    summary: "Fractions practice set.",
    demoOnly: false,
    productStatus: "Draft",
    ...overrides,
  };
}

test("draft products can save without publish-only fields", () => {
  const error = validateProductForSave(createBaseProduct());
  assert.equal(error, null);
});

test("published products require a preview", () => {
  const error = validateProductForSave(
    createBaseProduct({
      productStatus: "Published",
      fullDescription: "Ready to use fractions practice.",
      resourceType: "Worksheet",
      licenseType: "Single classroom",
      thumbnailIncluded: true,
      rightsConfirmed: true,
      previewIncluded: false,
    }),
  );

  assert.equal(
    error,
    "Published listings need a preview before they can go live.",
  );
});

test("published products require rights confirmation", () => {
  const error = validateProductForSave(
    createBaseProduct({
      productStatus: "Published",
      fullDescription: "Ready to use fractions practice.",
      resourceType: "Worksheet",
      licenseType: "Single classroom",
      thumbnailIncluded: true,
      previewIncluded: true,
      rightsConfirmed: false,
    }),
  );

  assert.equal(
    error,
    "Confirm that you own or have rights to sell this content before publishing.",
  );
});

test("published products pass once the launch checklist is complete", () => {
  const error = validateProductForSave(
    createBaseProduct({
      productStatus: "Published",
      fullDescription: "Ready to use fractions practice.",
      resourceType: "Worksheet",
      licenseType: "Single classroom",
      thumbnailIncluded: true,
      previewIncluded: true,
      rightsConfirmed: true,
    }),
  );

  assert.equal(error, null);
});

test("asset blockers and asset health status explain missing publish requirements", () => {
  const product = createBaseProduct({
    productStatus: "Draft",
    fullDescription: "Ready to use fractions practice.",
    resourceType: "Worksheet",
    licenseType: "Single classroom",
    previewIncluded: false,
    thumbnailIncluded: false,
    rightsConfirmed: false,
  });

  assert.deepEqual(getProductPublishBlockers(product), [
    "Generate or attach preview pages",
    "Generate or attach a thumbnail",
    "Confirm rights to sell",
  ]);
  assert.equal(getProductAssetHealthStatus(product), "Needs preview");
});
