import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { launchProductAssetSeeds } from "@/lib/lessonforge/launch-product-assets";
import { listLaunchProductFiles } from "@/lib/lessonforge/launch-product-files";

test("launch product files map the seeded marketplace catalog to real PDFs", () => {
  const files = listLaunchProductFiles();

  assert.equal(files.length, 28);

  for (const file of files) {
    assert.equal(file.mimeType, "application/pdf");
    assert.match(file.fileName, /\.pdf$/);
    assert.ok(fs.existsSync(file.filePath), `Expected launch PDF for ${file.productId}`);
  }
});

test("launch product previews point to exported real pages from the downloadable file", () => {
  for (const product of launchProductAssetSeeds) {
    assert.equal(product.previewAssetUrls.length, product.previewPages.length);

    for (let index = 0; index < product.previewPages.length; index += 1) {
      const pageNumber = product.previewPages[index];
      const previewPath = path.join(
        process.cwd(),
        "public",
        "catalog-previews",
        product.id,
        `page-${pageNumber}.png`,
      );

      assert.equal(
        product.previewAssetUrls[index],
        `/catalog-previews/${product.id}/page-${pageNumber}.png`,
      );
      assert.ok(fs.existsSync(previewPath), `Expected preview image for ${product.id} page ${pageNumber}`);
    }
  }
});
