import assert from "node:assert/strict";
import test from "node:test";

import {
  hasRequiredProductGallery,
  MAX_PRODUCT_GALLERY_IMAGES,
  normalizeProductGallery,
} from "@/lib/lessonforge/product-gallery";

test("normalizeProductGallery keeps the first image as cover and trims extra previews", () => {
  const gallery = normalizeProductGallery(
    "product-1",
    Array.from({ length: MAX_PRODUCT_GALLERY_IMAGES + 2 }, (_, index) => ({
      id: `image-${index + 1}`,
      storagePath: `products/product-1/gallery/image-${index + 1}.jpg`,
      fileName: `image-${index + 1}.jpg`,
      mimeType: "image/jpeg",
      fileSizeBytes: 1024,
      role: index === 0 ? "cover" : "preview",
      position: index,
      coverUrl: "",
      previewUrl: "",
    })),
  );

  assert.equal(gallery.length, MAX_PRODUCT_GALLERY_IMAGES);
  assert.equal(gallery[0]?.role, "cover");
  assert.equal(gallery[1]?.role, "preview");
  assert.match(gallery[0]?.coverUrl ?? "", /mode=cover/);
  assert.match(gallery[1]?.previewUrl ?? "", /mode=preview/);
});

test("hasRequiredProductGallery requires one cover image and two interior preview images", () => {
  const baseGallery = normalizeProductGallery("product-1", [
    {
      id: "cover-1",
      storagePath: "products/product-1/gallery/cover-1.jpg",
      fileName: "cover-1.jpg",
      mimeType: "image/jpeg",
      fileSizeBytes: 1000,
      position: 0,
    },
    {
      id: "preview-1",
      storagePath: "products/product-1/gallery/preview-1.jpg",
      fileName: "preview-1.jpg",
      mimeType: "image/jpeg",
      fileSizeBytes: 1000,
      position: 1,
    },
  ]);

  assert.equal(
    hasRequiredProductGallery({
      id: "product-1",
      title: "Fractions Pack",
      subject: "Math",
      gradeBand: "3-5",
      standardsTag: "",
      updatedAt: "",
      format: "PDF Resource",
      summary: "",
      demoOnly: false,
      imageGallery: baseGallery,
    }).hasPreviewImage,
    false,
  );

  assert.equal(
    hasRequiredProductGallery({
      id: "product-1",
      title: "Fractions Pack",
      subject: "Math",
      gradeBand: "3-5",
      standardsTag: "",
      updatedAt: "",
      format: "PDF Resource",
      summary: "",
      demoOnly: false,
      imageGallery: normalizeProductGallery("product-1", [
        ...baseGallery,
        {
          id: "preview-2",
          storagePath: "products/product-1/gallery/preview-2.jpg",
          fileName: "preview-2.jpg",
          mimeType: "image/jpeg",
          fileSizeBytes: 1000,
          position: 2,
        },
      ]),
    }).hasPreviewImage,
    true,
  );
});
