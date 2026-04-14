import assert from "node:assert/strict";
import test from "node:test";

import { getPrismaSellerFlowBlockedMessage } from "@/lib/lessonforge/prisma-seller-flow";

test("seller flow verification blocks on placeholder database url", () => {
  assert.equal(
    getPrismaSellerFlowBlockedMessage(
      "postgresql://USER:PASSWORD@localhost:5432/lessonforge",
    ),
    "Set a real DATABASE_URL before running prisma:verify-seller-flow.",
  );
});

test("seller flow verification is clear to run with a real database url", () => {
  assert.equal(
    getPrismaSellerFlowBlockedMessage(
      "postgresql://postgres:secret@localhost:5432/lessonforge",
    ),
    null,
  );
});
