import Stripe from "stripe";

import { demoResources } from "@/lib/demo/example-resources";
import {
  buildBuyerOrderFromCheckoutSession,
  buildBuyerOrderFromPaymentIntent,
  productMatchesClientPayload,
} from "@/lib/lessonforge/buyer-payment-utils";
import { findSupabaseProductRecordById } from "@/lib/supabase/admin-sync";
import { listPersistedProducts } from "@/lib/lessonforge/repository";
import type { ProductRecord } from "@/types";

function toProductRecord(resource: (typeof demoResources)[number]): ProductRecord {
  return {
    id: resource.id,
    title: resource.title,
    subject: resource.subject,
    gradeBand: resource.gradeBand,
    standardsTag: resource.standardsTag,
    updatedAt: resource.updatedAt,
    format: resource.format,
    summary: resource.summary,
    demoOnly: resource.demoOnly,
    resourceType: resource.resourceType,
    shortDescription: resource.shortDescription,
    fullDescription: resource.fullDescription,
    licenseType: resource.licenseType,
    fileTypes: resource.fileTypes,
    includedItems: resource.includedItems,
    thumbnailUrl: resource.thumbnailUrl,
    previewAssetUrls: resource.previewAssetUrls,
    originalAssetUrl: resource.originalAssetUrl,
    assetVersionNumber: resource.assetVersionNumber,
    previewIncluded: resource.previewIncluded,
    thumbnailIncluded: resource.thumbnailIncluded,
    rightsConfirmed: resource.rightsConfirmed,
    freshnessScore: resource.freshnessScore,
    sellerName: resource.sellerName,
    sellerHandle: resource.sellerHandle,
    sellerId: resource.sellerId,
    sellerStripeAccountEnvKey: resource.sellerStripeAccountEnvKey,
    sellerStripeAccountId: resource.sellerStripeAccountId,
    priceCents: resource.priceCents,
    isPurchasable: resource.isPurchasable,
    productStatus: resource.productStatus ?? "Published",
    moderationFeedback: resource.moderationFeedback,
    createdPath: "Manual upload",
  };
}

export type BuyerPaymentLogEvent =
  | "checkout_created"
  | "checkout_denied"
  | "webhook_received"
  | "webhook_processed"
  | "access_granted"
  | "access_denied";

export function logBuyerPaymentEvent(input: {
  event: BuyerPaymentLogEvent;
  eventId?: string;
  userId?: string | null;
  productId?: string | null;
  stripeSessionId?: string | null;
  stripePaymentIntentId?: string | null;
  reason?: string | null;
}) {
  console.info(
    JSON.stringify({
      scope: "lessonforge_buyer_payments",
      event: input.event,
      event_id: input.eventId ?? null,
      user_id: input.userId ?? null,
      product_id: input.productId ?? null,
      stripe_session_id: input.stripeSessionId ?? null,
      stripe_payment_intent_id: input.stripePaymentIntentId ?? null,
      reason: input.reason ?? null,
      occurred_at: new Date().toISOString(),
    }),
  );
}

export async function resolveCheckoutProductById(productId: string) {
  const [persistedProducts, syncedProduct] = await Promise.all([
    listPersistedProducts(),
    findSupabaseProductRecordById(productId).catch(() => null),
  ]);
  const demoProduct = demoResources.find((product) => product.id === productId);

  return (
    syncedProduct ??
    persistedProducts.find((product) => product.id === productId) ??
    (demoProduct ? toProductRecord(demoProduct) : null)
  );
}

export {
  buildBuyerOrderFromCheckoutSession,
  buildBuyerOrderFromPaymentIntent,
  productMatchesClientPayload,
};
