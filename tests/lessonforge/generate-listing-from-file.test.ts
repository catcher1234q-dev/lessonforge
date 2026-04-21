import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const componentSource = readFileSync(
  "/Users/mikhailtripp/Documents/New project/components/seller/generate-listing-from-file.tsx",
  "utf8",
);
const protectedDownloadRouteSource = readFileSync(
  "/Users/mikhailtripp/Documents/New project/app/api/lessonforge/protected-download/route.ts",
  "utf8",
);

test("generate listing component exposes the review and apply steps", () => {
  assert.match(componentSource, /Generate Listing From File/);
  assert.match(componentSource, /Choose the thumbnail first/);
  assert.match(componentSource, /Use selected options/);
  assert.match(componentSource, /\/api\/lessonforge\/ai\/generate-listing/);
  assert.match(componentSource, /\/api\/lessonforge\/generated-listing-assets/);
});

test("protected download route recognizes stored product files", () => {
  assert.match(protectedDownloadRouteSource, /isProductFileStoragePointer/);
  assert.match(protectedDownloadRouteSource, /downloadProductOriginalFile/);
});
