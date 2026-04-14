import assert from "node:assert/strict";
import test from "node:test";

import {
  buildBuyerOrderFromCheckoutSession,
  buildBuyerOrderFromPaymentIntent,
  productMatchesClientPayload,
} from "@/lib/lessonforge/buyer-payment-utils";
import { resolveCheckoutProductById } from "@/lib/lessonforge/buyer-payments";
import type { ProductRecord } from "@/types";

const baseProduct: ProductRecord = {
  id: "product-1",
  title: "Fractions Intervention Pack",
  summary: "Hands-on fractions support for grades 3-5.",
  subject: "Math",
  gradeBand: "3-5",
  standardsTag: "CCSS.MATH.CONTENT.4.NF.B.3",
  updatedAt: "Updated today",
  format: "PDF Resource",
  demoOnly: false,
  sellerId: "seller-1",
  sellerName: "Avery Studio",
  priceCents: 1900,
  isPurchasable: true,
  productStatus: "Published",
  createdPath: "Manual upload",
  previewIncluded: true,
  thumbnailIncluded: true,
  rightsConfirmed: true,
  assetVersionNumber: 3,
};

test("client payload matching only accepts the live server-side product details", () => {
  assert.equal(productMatchesClientPayload(baseProduct), true);
  assert.equal(
    productMatchesClientPayload(baseProduct, {
      ...baseProduct,
      priceCents: 3900,
    }),
    false,
  );
  assert.equal(
    productMatchesClientPayload(baseProduct, {
      ...baseProduct,
      title: "Different title",
    }),
    false,
  );
});

test("checkout session order builder keeps Stripe ids and paid status together", () => {
  const order = buildBuyerOrderFromCheckoutSession({
    session: {
      id: "cs_test_123",
      amount_total: 1900,
      created: 1_776_000_000,
      payment_intent: "pi_test_123",
      customer_details: {
        email: "buyer@example.com",
        name: "Jordan Teacher",
      },
    } as never,
    product: baseProduct,
    buyerEmail: "buyer@example.com",
  });

  assert.equal(order.id, "stripe-session-cs_test_123");
  assert.equal(order.productId, baseProduct.id);
  assert.equal(order.buyerEmail, "buyer@example.com");
  assert.equal(order.paymentStatus, "paid");
  assert.equal(order.stripeCheckoutSessionId, "cs_test_123");
  assert.equal(order.stripePaymentIntentId, "pi_test_123");
  assert.equal(order.amountCents, 1900);
});

test("payment intent order builder creates a paid order without requiring checkout session data", () => {
  const order = buildBuyerOrderFromPaymentIntent({
    paymentIntent: {
      id: "pi_test_paid",
      amount_received: 1900,
      created: 1_776_000_001,
      receipt_email: "buyer@example.com",
    } as never,
    product: baseProduct,
    buyerEmail: "buyer@example.com",
  });

  assert.equal(order.id, "stripe-payment-intent-pi_test_paid");
  assert.equal(order.paymentStatus, "paid");
  assert.equal(order.stripePaymentIntentId, "pi_test_paid");
  assert.equal(order.productId, baseProduct.id);
  assert.equal(order.amountCents, 1900);
});

test("checkout product lookup falls back to demo marketplace products", async () => {
  const product = await resolveCheckoutProductById("math-stripe-test-5");

  assert.ok(product);
  assert.equal(product?.title, "Stripe Test Math Warm-Up Pack");
  assert.equal(product?.priceCents, 600);
  assert.equal(product?.productStatus, "Published");
  assert.equal(product?.isPurchasable, true);
});
