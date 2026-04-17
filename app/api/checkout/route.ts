import { NextResponse } from "next/server";

import { hasAppSessionForEmail } from "@/lib/auth/app-session";
import { getCurrentViewer } from "@/lib/auth/viewer";
import {
  normalizePlanKey,
  type PlanKey,
} from "@/lib/config/plans";
import {
  logBuyerPaymentEvent,
  productMatchesClientPayload,
  resolveCheckoutProductById,
} from "@/lib/lessonforge/buyer-payments";
import { listOrders, listSellerProfiles } from "@/lib/lessonforge/data-access";
import {
  getSupabaseSubscriptionRecord,
  listSupabaseLibraryAccessProductIdsForBuyer,
  listSupabaseOrderRecordsForBuyer,
} from "@/lib/supabase/admin-sync";
import {
  calculatePlatformFee,
} from "@/lib/marketplace/config";
import { getSellerPayoutStatusDetails } from "@/lib/stripe/connect";
import { getStripeServerClient, isStripeServerConfigured } from "@/lib/stripe/server";
import { getSupabaseServerUser } from "@/lib/supabase/server-auth";
import type { OrderRecord, ProductRecord } from "@/types";

type CheckoutBody = {
  resourceId?: string;
  resource?: ProductRecord;
  returnTo?: string;
};

function isPaidSellerSubscriptionStatus(status?: string | null) {
  return status === "active" || status === "trialing";
}

type SellerPlanResolution = {
  planKey: PlanKey;
  matchedProfilePlanKey: string | null;
  subscriptionPlanName: string | null;
  subscriptionStatus: string | null;
  fallbackReason: "missing_seller_id" | "missing_subscription_record" | "subscription_not_paid" | null;
};

async function resolveSellerPlanKey(
  resource: ProductRecord,
  sellerProfiles: Awaited<ReturnType<typeof listSellerProfiles>>,
): Promise<SellerPlanResolution> {
  const sellerId = resource.sellerId?.trim().toLowerCase();

  if (!sellerId) {
    return {
      planKey: "starter",
      matchedProfilePlanKey: null,
      subscriptionPlanName: null,
      subscriptionStatus: null,
      fallbackReason: "missing_seller_id",
    };
  }

  const matchedProfile =
    sellerProfiles.find((profile) => profile.email.trim().toLowerCase() === sellerId) ?? null;
  const syncedSubscription = await getSupabaseSubscriptionRecord(sellerId).catch(
    () => null,
  );

  if (
    syncedSubscription?.plan_name &&
    isPaidSellerSubscriptionStatus(syncedSubscription.status)
  ) {
    return {
      planKey: normalizePlanKey(syncedSubscription.plan_name),
      matchedProfilePlanKey: matchedProfile?.sellerPlanKey ?? null,
      subscriptionPlanName: syncedSubscription.plan_name ?? null,
      subscriptionStatus: syncedSubscription.status ?? null,
      fallbackReason: null,
    };
  }

  return {
    planKey: "starter",
    matchedProfilePlanKey: matchedProfile?.sellerPlanKey ?? null,
    subscriptionPlanName: syncedSubscription?.plan_name ?? null,
    subscriptionStatus: syncedSubscription?.status ?? null,
    fallbackReason: syncedSubscription ? "subscription_not_paid" : "missing_subscription_record",
  };
}

function getSafeReturnTo(candidate: string | null | undefined) {
  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//")) {
    return null;
  }

  return candidate;
}

function getSafeAppOrigin(originHeader: string | null) {
  const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  try {
    const origin = originHeader ? new URL(originHeader).origin : new URL(configuredOrigin).origin;
    return origin;
  } catch {
    return "http://localhost:3000";
  }
}

export async function POST(request: Request) {
  const origin = getSafeAppOrigin(request.headers.get("origin"));
  let resource: ProductRecord | null = null;

  try {
    const viewer = await getCurrentViewer();

    if (viewer.role !== "buyer" || !(await hasAppSessionForEmail(viewer.email))) {
      logBuyerPaymentEvent({
        event: "checkout_denied",
        userId: viewer.email,
        reason: "signed_in_buyer_required",
      });
      return NextResponse.json(
        { error: "Signed-in buyer access required." },
        { status: 401 },
      );
    }

    const supabaseUser = await getSupabaseServerUser();
    const body = (await request.json()) as CheckoutBody;
    const resourceId = body.resourceId;
    const fallbackResource = body.resource;
    const safeReturnTo = getSafeReturnTo(body.returnTo);

    if (!resourceId) {
      logBuyerPaymentEvent({
        event: "checkout_denied",
        userId: supabaseUser?.id ?? viewer.email,
        reason: "missing_product_id",
      });
      return NextResponse.json(
        { error: "A product id is required." },
        { status: 400 },
      );
    }

    resource = await resolveCheckoutProductById(resourceId);

    if (!resource) {
      logBuyerPaymentEvent({
        event: "checkout_denied",
        userId: supabaseUser?.id ?? viewer.email,
        productId: resourceId,
        reason: "product_not_found",
      });
      return NextResponse.json(
        { error: "Missing resource data." },
        { status: 400 },
      );
    }

    if (!productMatchesClientPayload(resource, fallbackResource)) {
      logBuyerPaymentEvent({
        event: "checkout_denied",
        userId: supabaseUser?.id ?? viewer.email,
        productId: resource.id,
        reason: "client_product_mismatch",
      });
      return NextResponse.json(
        { error: "Product details did not match the current listing." },
        { status: 400 },
      );
    }

    if (typeof resource.priceCents !== "number" || resource.priceCents <= 0 || !resource.isPurchasable) {
      logBuyerPaymentEvent({
        event: "checkout_denied",
        userId: supabaseUser?.id ?? viewer.email,
        productId: resource.id,
        reason: "product_not_purchasable",
      });
      return NextResponse.json(
        { error: "This resource is not available for checkout." },
        { status: 404 },
      );
    }

    const checkoutResource = resource;

    const [existingOrders, syncedOrders, libraryAccessProductIds, sellerProfiles] = await Promise.all([
      listOrders(),
      listSupabaseOrderRecordsForBuyer(viewer.email).catch(() => [] as OrderRecord[]),
      listSupabaseLibraryAccessProductIdsForBuyer(viewer.email).catch(() => [] as string[]),
      listSellerProfiles(),
    ]);

    const alreadyOwned =
      libraryAccessProductIds.includes(checkoutResource.id) ||
      [...syncedOrders, ...existingOrders].some(
        (order) =>
          order.productId === checkoutResource.id &&
          order.buyerEmail?.trim().toLowerCase() === viewer.email.trim().toLowerCase() &&
          order.paymentStatus !== "failed" &&
          order.paymentStatus !== "refunded",
      );

    if (alreadyOwned) {
      logBuyerPaymentEvent({
        event: "checkout_denied",
        userId: supabaseUser?.id ?? viewer.email,
        productId: checkoutResource.id,
        reason: "already_owned",
      });
      return NextResponse.json(
        { error: "This product is already in the buyer library." },
        { status: 409 },
      );
    }

    const sellerPlanResolution = await resolveSellerPlanKey(
      checkoutResource,
      sellerProfiles,
    );
    const sellerPlanKey = sellerPlanResolution.planKey;

    if (sellerPlanResolution.fallbackReason) {
      logBuyerPaymentEvent({
        event: "checkout_plan_fallback",
        userId: supabaseUser?.id ?? viewer.email,
        productId: checkoutResource.id,
        reason: sellerPlanResolution.fallbackReason,
        metadata: {
          seller_id: checkoutResource.sellerId?.trim().toLowerCase() ?? null,
          seller_email: checkoutResource.sellerId?.trim().toLowerCase() ?? null,
          seller_profile_plan:
            sellerPlanResolution.matchedProfilePlanKey ?? null,
          subscription_plan:
            sellerPlanResolution.subscriptionPlanName ?? null,
          subscription_status:
            sellerPlanResolution.subscriptionStatus ?? null,
          resolved_plan: sellerPlanKey,
        },
      });
    }

    if (!checkoutResource.sellerStripeAccountEnvKey && !checkoutResource.sellerStripeAccountId) {
      return NextResponse.json(
        { error: "This seller has not connected Stripe payouts yet." },
        { status: 409 },
      );
    }

    const connectedAccountId =
      checkoutResource.sellerStripeAccountId ||
      process.env[checkoutResource.sellerStripeAccountEnvKey as keyof NodeJS.ProcessEnv];

    if (!connectedAccountId) {
      return NextResponse.json(
        { error: "Stripe payout setup is still missing for this seller." },
        { status: 409 },
      );
    }

    const sellerStatus = await getSellerPayoutStatusDetails(
      checkoutResource.sellerStripeAccountId,
      checkoutResource.sellerStripeAccountEnvKey,
    );

    if (sellerStatus.status !== "live") {
      return NextResponse.json(
        { error: "This seller cannot accept live Stripe checkout yet." },
        { status: 409 },
      );
    }

    const productPriceCents = checkoutResource.priceCents as number;
    const applicationFeeAmount = calculatePlatformFee(productPriceCents, sellerPlanKey);

    if (!isStripeServerConfigured()) {
      return NextResponse.json(
        { error: "Stripe checkout is not configured yet." },
        { status: 503 },
      );
    }

    const stripe = getStripeServerClient();

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: `${origin}/checkout/success?productId=${encodeURIComponent(checkoutResource.id)}&productTitle=${encodeURIComponent(checkoutResource.title)}&sessionId={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout/cancel?${new URLSearchParams({
        productId: checkoutResource.id,
        productTitle: checkoutResource.title,
        ...(safeReturnTo ? { returnTo: safeReturnTo } : {}),
      }).toString()}`,
      billing_address_collection: "auto",
      allow_promotion_codes: true,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: productPriceCents,
            product_data: {
              name: checkoutResource.title,
              description: checkoutResource.summary,
            },
          },
        },
      ],
      payment_intent_data: {
        application_fee_amount: applicationFeeAmount,
        transfer_data: {
          destination: connectedAccountId,
        },
        metadata: {
          resourceId: checkoutResource.id,
          productId: checkoutResource.id,
          sellerId: checkoutResource.sellerId ?? "",
          sellerName: checkoutResource.sellerName ?? "",
          sellerPlanKey,
          buyerEmail: viewer.email,
          buyerUserId: supabaseUser?.id ?? viewer.email,
          platformFeeAmount: String(applicationFeeAmount),
        },
      },
      metadata: {
        resourceId: checkoutResource.id,
        productId: checkoutResource.id,
        buyerEmail: viewer.email,
        buyerUserId: supabaseUser?.id ?? viewer.email,
        sellerId: checkoutResource.sellerId ?? "",
        sellerStripeAccountId: connectedAccountId,
        checkoutMode: "stripe",
        sellerPlanKey,
      },
    });

    logBuyerPaymentEvent({
      event: "checkout_created",
      userId: supabaseUser?.id ?? viewer.email,
      productId: checkoutResource.id,
      stripeSessionId: session.id,
      stripePaymentIntentId:
        typeof session.payment_intent === "string" ? session.payment_intent : null,
    });

    return NextResponse.json({ url: session.url, mode: "stripe" });
  } catch (error) {
    if (
      resource &&
      error instanceof Error &&
      error.message.includes("stripe_balance.stripe_transfers")
    ) {
      return NextResponse.json(
        {
          error:
            "Stripe connected payouts are not fully enabled for this seller yet.",
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to create checkout session.",
      },
      { status: 500 },
    );
  }
}
