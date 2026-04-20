import assert from "node:assert/strict";
import test from "node:test";

import { buildManagedPreviewAssets } from "@/lib/lessonforge/preview-assets";
import { buildStoredAssetPaths } from "@/lib/lessonforge/preview-assets";
import { renderManagedThumbnailSvg } from "@/lib/lessonforge/preview-assets";

test("managed preview assets include cache keys and first-pages-only exposure policy", () => {
  const assets = buildManagedPreviewAssets({
    productId: "product-1",
    title: "Fraction Fluency Intervention Pack",
    subject: "Math",
    format: "Interactive slide deck",
  });

  assert.equal(assets.length, 3);
  assert.match(assets[0].cacheKey, /^preview:product-1:v1:page-1$/);
  assert.equal(assets[0].deliveryMode, "cached-preview");
  assert.equal(assets[0].originalDelivery, "protected-download");
  assert.match(assets[0].exposurePolicy, /first 3 preview pages/i);
  assert.deepEqual(assets[0].watermarkLines, ["LessonForge Preview", "Sample Only"]);
});

test("stored asset paths provide preview urls and a protected original delivery endpoint", () => {
  const assets = buildStoredAssetPaths({
    productId: "product-1",
    title: "Fraction Fluency Intervention Pack",
    format: "Interactive slide deck",
  });

  assert.equal(assets.originalUrl, "/api/lessonforge/library-delivery");
  assert.equal(assets.thumbnailUrl, "/api/lessonforge/thumbnail-assets/fraction-fluency-intervention-pack");
  assert.equal(assets.previewUrls.length, 3);
  assert.match(assets.previewUrls[0], /\/api\/lessonforge\/preview-assets\/fraction-fluency-intervention-pack\?page=1$/);
  assert.equal(assets.assetVersionNumber, 1);
});

test("thumbnail svg render includes the core listing metadata", () => {
  const svg = renderManagedThumbnailSvg({
    title: "Fraction Fluency Intervention Pack",
    subject: "Math",
    gradeBand: "3-5",
    format: "Interactive slide deck",
  });

  assert.match(svg, /Fraction Fluency Intervention Pack/);
  assert.match(svg, />Math</);
  assert.match(svg, />3-5</);
  assert.match(svg, /Interactive slide deck/);
});
