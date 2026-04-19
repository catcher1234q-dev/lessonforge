import assert from "node:assert/strict";
import test from "node:test";

import { marketplaceListings } from "@/lib/demo/catalog";

test("demo marketplace listings keep the demo label and ship rich preview content", () => {
  const demoListings = marketplaceListings.filter((listing) => listing.demoOnly);

  assert.ok(demoListings.length > 0);

  for (const listing of demoListings) {
    assert.ok(listing.thumbnailUrl);
    assert.ok(listing.previewAssets.length >= 3);
    assert.ok(listing.fullDescription.length > listing.summary.length);
    assert.ok(listing.includedItems.length >= 4);
    assert.equal(listing.productStatus, "Published");
  }
});

test("all demo marketplace previews expose a real gallery sequence", () => {
  for (const listing of marketplaceListings) {
    assert.ok(listing.previewSlides.length >= 3);
    assert.equal(listing.previewAssets.length, listing.previewSlides.length);
    assert.ok(listing.previewAssets[0]?.previewUrl.includes("/api/lessonforge/preview-assets/"));
  }
});
