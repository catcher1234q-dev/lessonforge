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
    "Published listings need at least two real interior preview images before they can go live.",
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
    "Add at least two real interior preview images",
    "Add a cover image",
    "Confirm rights to sell",
  ]);
  assert.equal(getProductAssetHealthStatus(product), "Needs preview");
});

test("published products still fail with only one interior preview image in the gallery", () => {
  const error = validateProductForSave(
    createBaseProduct({
      productStatus: "Published",
      fullDescription: "Ready to use fractions practice.",
      resourceType: "Worksheet",
      licenseType: "Single classroom",
      rightsConfirmed: true,
      imageGallery: [
        {
          id: "cover-1",
          storagePath: "products/product-1/gallery/cover-1.jpg",
          fileName: "cover.jpg",
          mimeType: "image/jpeg",
          fileSizeBytes: 1000,
          role: "cover",
          position: 0,
          coverUrl: "/cover-1",
          previewUrl: "/preview-1",
        },
        {
          id: "preview-1",
          storagePath: "products/product-1/gallery/preview-1.jpg",
          fileName: "preview-1.jpg",
          mimeType: "image/jpeg",
          fileSizeBytes: 1000,
          role: "preview",
          position: 1,
          coverUrl: "/cover-2",
          previewUrl: "/preview-2",
        },
      ],
    }),
  );

  assert.equal(
    error,
    "Published listings need at least two real interior preview images before they can go live.",
  );
});

test("published products pass with a cover image and two preview images in the gallery", () => {
  const error = validateProductForSave(
    createBaseProduct({
      productStatus: "Published",
      fullDescription: "Ready to use fractions practice.",
      resourceType: "Worksheet",
      licenseType: "Single classroom",
      rightsConfirmed: true,
      imageGallery: [
        {
          id: "cover-1",
          storagePath: "products/product-1/gallery/cover-1.jpg",
          fileName: "cover.jpg",
          mimeType: "image/jpeg",
          fileSizeBytes: 1000,
          role: "cover",
          position: 0,
          coverUrl: "/cover-1",
          previewUrl: "/preview-1",
        },
        {
          id: "preview-1",
          storagePath: "products/product-1/gallery/preview-1.jpg",
          fileName: "preview-1.jpg",
          mimeType: "image/jpeg",
          fileSizeBytes: 1000,
          role: "preview",
          position: 1,
          coverUrl: "/cover-2",
          previewUrl: "/preview-2",
        },
        {
          id: "preview-2",
          storagePath: "products/product-1/gallery/preview-2.jpg",
          fileName: "preview-2.jpg",
          mimeType: "image/jpeg",
          fileSizeBytes: 1000,
          role: "preview",
          position: 2,
          coverUrl: "/cover-3",
          previewUrl: "/preview-3",
        },
      ],
    }),
  );

  assert.equal(error, null);
});
