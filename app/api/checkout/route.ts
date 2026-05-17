import { NextResponse } from "next/server";

import { hasAppSessionForEmail } from "@/lib/auth/app-session";
import { getCurrentViewer } from "@/lib/auth/viewer";
import {
  logBuyerPaymentEvent,
  productMatchesClientPayload,
  resolveCheckoutProductById,
} from "@/lib/lessonforge/buyer-payments";
import { resolveSellerPayoutPlan } from "@/lib/lessonforge/checkout-plan-resolution";
import { listOrders, listSellerProfiles } from "@/lib/lessonforge/data-access";
import {
  getSupabaseSubscriptionRecord,
  listSupabaseLibraryAccessProductIdsForBuyer,
  listSupabaseOrderRecordsForBuyer,
} from "@/lib/supabase/admin-sync";
import {
  calculatePlatformFee,
  calculateSellerPayout,
} from "@/lib/marketplace/config";
import { createPayPalOrder, isPayPalCheckoutConfigured } from "@/lib/paypal/server";
import { getSupabaseServerUser } from "@/lib/supabase/server-auth";
import type { OrderRecord, ProductRecord } from "@/types";

type CheckoutBody = {
  resourceId?: string;
  resource?: ProductRecord;
  returnTo?: string;
};

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

    const sellerSubscription = await getSupabaseSubscriptionRecord(
      checkoutResource.sellerId?.trim().toLowerCase() ?? "",
    ).catch(() => null);
    const sellerPlanResolution = resolveSellerPayoutPlan({
      sellerId: checkoutResource.sellerId,
      sellerProfiles,
      syncedSubscription: sellerSubscription,
    });

    if (!sellerPlanResolution.ok) {
      logBuyerPaymentEvent({
        event: "checkout_denied",
        userId: supabaseUser?.id ?? viewer.email,
        productId: checkoutResource.id,
        reason: "seller_plan_unverified",
        metadata: {
          seller_id: checkoutResource.sellerId?.trim().toLowerCase() ?? null,
          seller_email: checkoutResource.sellerId?.trim().toLowerCase() ?? null,
          seller_profile_plan:
            sellerPlanResolution.matchedProfilePlanKey ?? null,
          subscription_plan:
            sellerPlanResolution.subscriptionPlanName ?? null,
          subscription_status:
            sellerPlanResolution.subscriptionStatus ?? null,
          resolution_code: sellerPlanResolution.code,
        },
      });

      return NextResponse.json(
        { error: sellerPlanResolution.message },
        { status: 409 },
      );
    }

    const sellerPlanKey = sellerPlanResolution.planKey;

    if (!checkoutResource.sellerPayPalMerchantEnvKey && !checkoutResource.sellerPayPalMerchantId) {
      return NextResponse.json(
        { error: "This seller has not connected PayPal payouts yet." },
        { status: 409 },
      );
    }

    const connectedMerchantId =
      checkoutResource.sellerPayPalMerchantId ||
      process.env[checkoutResource.sellerPayPalMerchantEnvKey as keyof NodeJS.ProcessEnv];

    if (!connectedMerchantId) {
      return NextResponse.json(
        { error: "PayPal payout setup is still missing for this seller." },
        { status: 409 },
      );
    }

    const matchedSellerProfile = sellerProfiles.find(
      (profile) =>
        profile.email.trim().toLowerCase() ===
        (checkoutResource.sellerId ?? "").trim().toLowerCase(),
    );
    const sellerPayPalReady = Boolean(
      matchedSellerProfile?.paypalMerchantId &&
        matchedSellerProfile.paypalPayoutsEnabled &&
        matchedSellerProfile.paypalConsentGranted,
    );

    if (!sellerPayPalReady) {
      return NextResponse.json(
        {
          error:
            "This seller needs to finish PayPal payout setup before live checkout can start.",
        },
        { status: 409 },
      );
    }

    const productPriceCents = checkoutResource.priceCents as number;
    const applicationFeeAmount = calculatePlatformFee(productPriceCents, sellerPlanKey);
    const sellerPayoutAmount = calculateSellerPayout(productPriceCents, sellerPlanKey);

    if (!isPayPalCheckoutConfigured()) {
      return NextResponse.json(
        { error: "PayPal checkout is not configured yet." },
        { status: 503 },
      );
    }

    const returnParams = new URLSearchParams({
      provider: "paypal",
      productId: checkoutResource.id,
      productTitle: checkoutResource.title,
      sellerPlanKey,
      platformFeeAmount: String(applicationFeeAmount),
      sellerPayoutAmount: String(sellerPayoutAmount),
    });
    const order = await createPayPalOrder({
      amountCents: productPriceCents,
      productId: checkoutResource.id,
      productTitle: checkoutResource.title,
      sellerId: checkoutResource.sellerId,
      returnUrl: `${origin}/checkout/success?${returnParams.toString()}`,
      cancelUrl: `${origin}/checkout/cancel?${new URLSearchParams({
        productId: checkoutResource.id,
        productTitle: checkoutResource.title,
        ...(safeReturnTo ? { returnTo: safeReturnTo } : {}),
      }).toString()}`,
    });

    logBuyerPaymentEvent({
      event: "checkout_created",
      userId: supabaseUser?.id ?? viewer.email,
      productId: checkoutResource.id,
      metadata: {
        provider: "paypal",
        paypal_order_id: order.id,
        seller_paypal_merchant_id: connectedMerchantId,
      },
    });

    return NextResponse.json({ url: order.approvalUrl, mode: "paypal" });
  } catch (error) {
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
