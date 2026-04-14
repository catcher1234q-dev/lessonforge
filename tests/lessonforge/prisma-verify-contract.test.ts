import assert from "node:assert/strict";
import test from "node:test";

import { buildPrismaSellerFlowReport } from "@/lib/lessonforge/prisma-verify-contract";

test("seller flow report is successful when both persistence steps succeed", () => {
  const report = buildPrismaSellerFlowReport({
    sellerEmail: "seller@example.com",
    productId: "product-123",
    sellerProfileSaved: true,
    productSaved: true,
  });

  assert.equal(report.ok, true);
  assert.equal(report.mode, "prisma");
  assert.equal(report.summary, "Prisma seller flow verification passed.");
  assert.deepEqual(
    report.steps.map((step) => [step.label, step.status]),
    [
      ["Seller profile saved and reloaded", "ready"],
      ["Seller product saved and reloaded", "ready"],
    ],
  );
});

test("seller flow report shows the blocked step when product persistence fails", () => {
  const report = buildPrismaSellerFlowReport({
    sellerEmail: "seller@example.com",
    productId: "product-123",
    sellerProfileSaved: true,
    productSaved: false,
  });

  assert.equal(report.ok, false);
  assert.equal(report.summary, "Prisma seller flow verification failed.");
  assert.equal(report.steps[0]?.status, "ready");
  assert.equal(report.steps[1]?.status, "blocked");
  assert.equal(
    report.steps[1]?.detail,
    "Seller product save or reload failed for product-123.",
  );
});
