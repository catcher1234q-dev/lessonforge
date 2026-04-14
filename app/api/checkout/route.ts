import { NextResponse } from "next/server";

import { hasAppSessionForEmail } from "@/lib/auth/app-session";
import { getCurrentViewer } from "@/lib/auth/viewer";
import {
  logBuyerPaymentEvent,
  productMatchesClientPayload,
  resolveCheckoutProductById,
} from "@/lib/lessonforge/buyer-payments";
import { listOrders } from "@/lib/lessonforge/repository";
import {
  findSupabaseOrderRecordByCheckoutSessionId,
  listSupabaseLibraryAccessProductIdsForBuyer,
  listSupabaseOrderRecordsForBuyer,
} from "@/lib/supabase/admin-sync";
import {
  calculatePlatformFee,
  calculateSellerPayout,
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

function getSafeReturnTo(candidate: string | null | undefined) {
  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//")) {
    return null;
  }

  return candidate;
}

function buildPreviewResponse(
  resource: ProductRecord,
  origin: string,
  returnTo?: string | null,
) {
  const previewParams = new URLSearchParams({
    productId: resource.id,
    title: resource.title,
    sellerName: resource.sellerName ?? "Teacher seller",
    sellerId: resource.sellerId ?? resource.sellerName ?? resource.id,
    priceCents: String(resource.priceCents),
    teacherPayoutCents: String(calculateSellerPayout(resource.priceCents ?? 0)),
    platformFeeCents: String(calculatePlatformFee(resource.priceCents ?? 0)),
  });

  const safeReturnTo = getSafeReturnTo(returnTo);

  if (safeReturnTo) {
    previewParams.set("returnTo", safeReturnTo);
  }

  return NextResponse.json({
    url: `${origin}/checkout-preview?${previewParams.toString()}`,
    mode: "preview",
    reason: "stripe_preview_fallback",
  });
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

    const [existingOrders, syncedOrders, libraryAccessProductIds] = await Promise.all([
      listOrders(),
      listSupabaseOrderRecordsForBuyer(viewer.email).catch(() => [] as OrderRecord[]),
      listSupabaseLibraryAccessProductIdsForBuyer(viewer.email).catch(() => [] as string[]),
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

    if (!checkoutResource.sellerStripeAccountEnvKey && !checkoutResource.sellerStripeAccountId) {
      return buildPreviewResponse(checkoutResource, origin, safeReturnTo);
    }

    const connectedAccountId =
      checkoutResource.sellerStripeAccountId ||
      process.env[checkoutResource.sellerStripeAccountEnvKey as keyof NodeJS.ProcessEnv];

    if (!connectedAccountId) {
      return buildPreviewResponse(checkoutResource, origin, safeReturnTo);
    }

    const sellerStatus = await getSellerPayoutStatusDetails(
      checkoutResource.sellerStripeAccountId,
      checkoutResource.sellerStripeAccountEnvKey,
    );

    if (sellerStatus.status !== "live") {
      return buildPreviewResponse(checkoutResource, origin, safeReturnTo);
    }

    const productPriceCents = checkoutResource.priceCents as number;
    const applicationFeeAmount = calculatePlatformFee(productPriceCents);

    if (!isStripeServerConfigured()) {
      return buildPreviewResponse(checkoutResource, origin, safeReturnTo);
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
        sellerPlanKey:
          productPriceCents > 0
            ? calculateSellerPayout(productPriceCents) / productPriceCents >= 0.7
              ? "pro"
              : calculateSellerPayout(productPriceCents) / productPriceCents >= 0.6
                ? "basic"
                : "starter"
            : "starter",
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
      return buildPreviewResponse(resource, origin);
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
