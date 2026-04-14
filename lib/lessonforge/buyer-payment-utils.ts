import Stripe from "stripe";

import {
  calculatePlatformFee,
  calculateSellerPayout,
} from "@/lib/marketplace/config";
import type { OrderRecord, ProductRecord } from "@/types";

export function productMatchesClientPayload(
  product: ProductRecord,
  clientProduct?: ProductRecord,
) {
  if (!clientProduct) {
    return true;
  }

  return (
    clientProduct.id === product.id &&
    clientProduct.title === product.title &&
    clientProduct.priceCents === product.priceCents
  );
}

export function buildBuyerOrderFromCheckoutSession(input: {
  session: Stripe.Checkout.Session;
  product: ProductRecord;
  buyerEmail: string;
  buyerName?: string | null;
}) {
  const amountCents = input.session.amount_total ?? input.product.priceCents ?? 0;

  return {
    id: `stripe-session-${input.session.id}`,
    productId: input.product.id,
    productTitle: input.product.title,
    buyerName:
      input.buyerName ||
      input.session.customer_details?.name ||
      input.session.customer_details?.email ||
      input.buyerEmail,
    buyerEmail: input.buyerEmail,
    sellerName: input.product.sellerName ?? "Teacher seller",
    sellerId: input.product.sellerId ?? input.product.id,
    amountCents,
    sellerShareCents: calculateSellerPayout(amountCents),
    platformShareCents: calculatePlatformFee(amountCents),
    paymentStatus: "paid",
    stripeCheckoutSessionId: input.session.id,
    stripePaymentIntentId:
      typeof input.session.payment_intent === "string"
        ? input.session.payment_intent
        : undefined,
    versionLabel: `Version ${input.product.assetVersionNumber ?? 1}`,
    accessType: "Download + linked asset",
    updatedLabel: input.product.updatedAt || "Current version",
    instructions:
      "Download the included files from your library. Linked Google assets can be opened from the same screen.",
    purchasedAt: new Date(
      (input.session.created ?? Math.floor(Date.now() / 1000)) * 1000,
    ).toISOString(),
  } satisfies OrderRecord;
}

export function buildBuyerOrderFromPaymentIntent(input: {
  paymentIntent: Stripe.PaymentIntent;
  product: ProductRecord;
  buyerEmail: string;
}) {
  const amountCents = input.paymentIntent.amount_received || input.product.priceCents || 0;

  return {
    id: `stripe-payment-intent-${input.paymentIntent.id}`,
    productId: input.product.id,
    productTitle: input.product.title,
    buyerName: input.paymentIntent.receipt_email ?? input.buyerEmail,
    buyerEmail: input.buyerEmail,
    sellerName: input.product.sellerName ?? "Teacher seller",
    sellerId: input.product.sellerId ?? input.product.id,
    amountCents,
    sellerShareCents: calculateSellerPayout(amountCents),
    platformShareCents: calculatePlatformFee(amountCents),
    paymentStatus: "paid",
    stripePaymentIntentId: input.paymentIntent.id,
    versionLabel: `Version ${input.product.assetVersionNumber ?? 1}`,
    accessType: "Download + linked asset",
    updatedLabel: input.product.updatedAt || "Current version",
    instructions:
      "Download the included files from your library. Linked Google assets can be opened from the same screen.",
    purchasedAt: new Date(
      (input.paymentIntent.created ?? Math.floor(Date.now() / 1000)) * 1000,
    ).toISOString(),
  } satisfies OrderRecord;
}
