import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { extractPdfText } from "@/lib/lessonforge/file-text-extraction";

test("extractPdfText reads text and page count from a real launch PDF", async () => {
  const bytes = new Uint8Array(
    readFileSync(
      "/Users/mikhailtripp/Documents/New project/seed-assets/launch-products/5th-grade-math-spiral-review-4-weeks-daily-warm-ups.pdf",
    ),
  );

  const result = await extractPdfText({ bytes, maxPages: 4, maxCharacters: 4000 });

  assert.ok(result.pageCount >= 4);
  assert.ok(result.textContent.length > 200);
  assert.match(result.textContent.toLowerCase(), /spiral|math|review|warm/);
});
