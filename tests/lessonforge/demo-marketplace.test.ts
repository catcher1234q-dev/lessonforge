import assert from "node:assert/strict";
import test from "node:test";

import { marketplaceListings } from "@/lib/demo/catalog";

test("launch-ready marketplace listings ship as real products with strong preview coverage", () => {
  const liveListings = marketplaceListings.filter((listing) => !listing.demoOnly);

  assert.ok(liveListings.length >= 24);

  for (const listing of liveListings) {
    assert.ok(listing.thumbnailUrl?.startsWith("/catalog-previews/"));
    assert.ok(listing.previewAssets.length >= 4);
    assert.equal(listing.previewAssets.length, listing.previewSlides.length);
    assert.ok(listing.fullDescription.length > listing.summary.length);
    assert.ok(listing.includedItems.length >= 4);
    assert.ok(listing.tags.length >= 4);
    assert.equal(listing.productStatus, "Published");
  }
});

test("preview-only listings stay off the live catalog but keep the separate preview surface covered", () => {
  const demoListings = marketplaceListings.filter((listing) => listing.demoOnly);

  assert.ok(demoListings.length > 0);

  for (const listing of demoListings) {
    assert.ok(listing.thumbnailUrl);
    assert.ok(listing.previewAssets.length >= 3);
    assert.ok(listing.previewAssets[0]?.previewUrl.includes("/api/lessonforge/preview-assets/"));
  }
});
