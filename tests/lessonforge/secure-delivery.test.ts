import assert from "node:assert/strict";
import test from "node:test";

import {
  createProtectedDeliveryToken,
  verifyProtectedDeliveryToken,
} from "@/lib/lessonforge/secure-delivery";

test("protected delivery tokens verify when untouched and unexpired", () => {
  const token = createProtectedDeliveryToken({
    orderId: "order-1",
    productId: "product-1",
    buyerEmail: "buyer@example.com",
    assetKind: "original",
    expiresAt: Date.now() + 60_000,
  });

  const result = verifyProtectedDeliveryToken(token);

  assert.equal(result.valid, true);
  if (result.valid) {
    assert.equal(result.payload.orderId, "order-1");
    assert.equal(result.payload.productId, "product-1");
  }
});

test("protected delivery tokens fail if tampered with", () => {
  const token = createProtectedDeliveryToken({
    orderId: "order-1",
    productId: "product-1",
    buyerEmail: "buyer@example.com",
    assetKind: "original",
    expiresAt: Date.now() + 60_000,
  });

  const tampered = `${token.slice(0, -1)}x`;
  const result = verifyProtectedDeliveryToken(tampered);

  assert.equal(result.valid, false);
});

test("protected delivery tokens fail after expiration", () => {
  const token = createProtectedDeliveryToken({
    orderId: "order-1",
    productId: "product-1",
    buyerEmail: "buyer@example.com",
    assetKind: "original",
    expiresAt: Date.now() - 1_000,
  });

  const result = verifyProtectedDeliveryToken(token);

  assert.equal(result.valid, false);
});
