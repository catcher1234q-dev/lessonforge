import Stripe from "stripe";
import { NextResponse } from "next/server";

import { normalizePlanKey, planConfig, type PlanKey } from "@/lib/config/plans";
import { calculateMarketplaceSplit } from "@/lib/domain/marketplace";
import {
  buildBuyerOrderFromCheckoutSession,
  buildBuyerOrderFromPaymentIntent,
  logBuyerPaymentEvent,
  resolveCheckoutProductById,
} from "@/lib/lessonforge/buyer-payments";
import {
  getOrCreateSubscription,
  listOrders,
  listSellerProfiles,
  saveOrder,
  saveSellerProfile,
} from "@/lib/lessonforge/data-access";
import { getPlanKeyFromSellerStripePriceId } from "@/lib/stripe/seller-plan-billing";
import { getStripeServerClient, isStripeServerConfigured } from "@/lib/stripe/server";
import {
  findSupabaseOrderRecordByCheckoutSessionId,
  findSupabaseOrderRecordByPaymentIntentId,
  getStripeWebhookEventRecord,
  grantSupabaseLibraryAccess,
  recordStripeWebhookEvent,
  revokeSupabaseLibraryAccess,
  syncSupabaseOrderRecord,
  syncSupabaseProductRecord,
  syncSupabaseSubscriptionRecord,
  updateSupabaseOrderStatus,
} from "@/lib/supabase/admin-sync";
import type { OrderRecord, ProductRecord, SellerProfileDraft } from "@/types";

export const runtime = "nodejs";

function isPlaceholderWebhookSecret(secret?: string | null) {
  if (!secret) {
    return true;
  }

  return (
    secret === "whsec_replace_me" ||
    secret === "replace_me" ||
    secret.includes("replace_me")
  );
}

function isStripeWebhookConfigured() {
  return !isPlaceholderWebhookSecret(process.env.STRIPE_WEBHOOK_SECRET);
}

function getSellerCheckoutSurface(session: Stripe.Checkout.Session) {
  return session.metadata?.checkoutMode || session.metadata?.billingSurface || null;
}

function getSellerSubscriptionPlanKey(session: Stripe.Checkout.Session) {
  const rawPlan = session.metadata?.targetPlan || null;

  if (!rawPlan) {
    return null;
  }

  return normalizePlanKey(rawPlan);
}

function resolveSellerPlanKey(resource: ProductRecord, session: Stripe.Checkout.Session): PlanKey {
  const rawPlanKey = session.metadata?.sellerPlanKey?.toLowerCase();

  if (rawPlanKey) {
    return normalizePlanKey(rawPlanKey);
  }

  void resource;
  return "starter";
}

function getBuyerMetadata(
  metadata?: Record<string, string> | null,
): { buyerEmail: string | null; buyerUserId: string | null; productId: string | null } {
  return {
    buyerEmail: metadata?.buyerEmail?.trim().toLowerCase() || null,
    buyerUserId: metadata?.buyerUserId?.trim() || null,
    productId: metadata?.productId?.trim() || metadata?.resourceId?.trim() || null,
  };
}

async function findExistingOrderByStripeIds(input: {
  sessionId?: string | null;
  paymentIntentId?: string | null;
}) {
  if (input.sessionId) {
    const syncedBySession = await findSupabaseOrderRecordByCheckoutSessionId(input.sessionId).catch(
      () => null,
    );

    if (syncedBySession) {
      return syncedBySession;
    }
  }

  if (input.paymentIntentId) {
    const syncedByPaymentIntent = await findSupabaseOrderRecordByPaymentIntentId(
      input.paymentIntentId,
    ).catch(() => null);

    if (syncedByPaymentIntent) {
      return syncedByPaymentIntent;
    }
  }

  const existingOrders = await listOrders();
  return (
    existingOrders.find(
      (order) =>
        (input.sessionId && order.stripeCheckoutSessionId === input.sessionId) ||
        (input.paymentIntentId && order.stripePaymentIntentId === input.paymentIntentId),
    ) ?? null
  );
}

async function persistBuyerOrder(order: OrderRecord) {
  await saveOrder(order);
  await syncSupabaseOrderRecord(order).catch(() => null);
}

function buildOrderFromCheckoutSession(
  session: Stripe.Checkout.Session,
  resource: ProductRecord,
): OrderRecord {
  const amountCents = session.amount_total ?? resource.priceCents ?? 0;
  const sellerPlanKey = resolveSellerPlanKey(resource, session);
  const split = calculateMarketplaceSplit(amountCents, sellerPlanKey);
  const customerName =
    session.customer_details?.name ||
    session.customer_details?.email ||
    "Buyer";
  const customerEmail =
    session.customer_details?.email ||
    session.customer_email ||
    undefined;

  return {
    id: `stripe-session-${session.id}`,
    productId: resource.id,
    productTitle: resource.title,
    buyerName: customerName,
    buyerEmail: customerEmail,
    sellerName: resource.sellerName ?? "Teacher seller",
    sellerId: resource.sellerId ?? resource.id,
    amountCents,
    sellerShareCents: split.sellerCents,
    platformShareCents: split.platformCents,
    paymentStatus: "paid",
    stripeCheckoutSessionId: session.id,
    stripePaymentIntentId:
      typeof session.payment_intent === "string" ? session.payment_intent : undefined,
    versionLabel: `Version ${resource.assetVersionNumber ?? 1}`,
    accessType: "Download + linked asset",
    updatedLabel: resource.updatedAt || "Current version",
    instructions:
      "Download the included files from your library. Linked Google assets can be opened from the same screen.",
    purchasedAt: new Date((session.created ?? Math.floor(Date.now() / 1000)) * 1000).toISOString(),
  };
}

function buildFallbackSellerProfile(email: string): SellerProfileDraft {
  const handle = email.split("@")[0]?.replace(/[^a-z0-9-]+/gi, "-") || "seller";

  return {
    displayName: email.split("@")[0] || "Seller",
    email,
    storeName: email.split("@")[0] || "Seller store",
    storeHandle: handle,
    primarySubject: "Math",
    tagline: "",
    sellerPlanKey: "starter",
    onboardingCompleted: false,
  };
}

async function syncSellerSubscriptionCheckout(session: Stripe.Checkout.Session) {
  const sellerEmail = session.metadata?.sellerEmail || null;
  const targetPlan = getSellerSubscriptionPlanKey(session);

  if (!sellerEmail || !targetPlan || targetPlan === "starter") {
    return;
  }

  const existingProfiles = await listSellerProfiles();
  const existingProfile =
    existingProfiles.find((entry) => entry.email === sellerEmail) ??
    buildFallbackSellerProfile(sellerEmail);

  await saveSellerProfile({
    ...existingProfile,
    sellerPlanKey: targetPlan,
  });

  await getOrCreateSubscription(
    sellerEmail,
    sellerEmail,
    targetPlan,
    planConfig[targetPlan].availableCredits,
  );

  await syncSupabaseSubscriptionRecord({
    email: sellerEmail,
    planName: targetPlan,
    status: "active",
    stripeCustomerId: typeof session.customer === "string" ? session.customer : null,
    stripeSubscriptionId:
      typeof session.subscription === "string" ? session.subscription : null,
    currentPeriodEnd: null,
  }).catch(() => null);
}

async function syncSellerSubscriptionState(subscription: Stripe.Subscription) {
  const sellerEmail = subscription.metadata?.sellerEmail || null;
  const targetPlan = getPlanKeyFromSellerStripePriceId(
    subscription.items.data[0]?.price?.id ?? null,
  );

  if (!sellerEmail) {
    return;
  }

  const resolvedPlan =
    subscription.status === "canceled" || subscription.status === "unpaid"
      ? "starter"
      : targetPlan ?? normalizePlanKey(subscription.metadata?.targetPlan);

  const existingProfiles = await listSellerProfiles();
  const existingProfile =
    existingProfiles.find((entry) => entry.email === sellerEmail) ??
    buildFallbackSellerProfile(sellerEmail);

  await saveSellerProfile({
    ...existingProfile,
    sellerPlanKey: resolvedPlan,
  });

  const subscriptionPeriodEnd =
    "current_period_end" in subscription &&
    typeof subscription.current_period_end === "number"
      ? subscription.current_period_end
      : null;

  await getOrCreateSubscription(
    sellerEmail,
    sellerEmail,
    resolvedPlan,
    planConfig[resolvedPlan].availableCredits,
  );

  await syncSupabaseSubscriptionRecord({
    email: sellerEmail,
    planName: resolvedPlan,
    status: subscription.status,
    stripeCustomerId:
      typeof subscription.customer === "string" ? subscription.customer : null,
    stripeSubscriptionId: subscription.id,
    currentPeriodEnd: subscriptionPeriodEnd
      ? new Date(subscriptionPeriodEnd * 1000)
      : null,
  }).catch(() => null);
}

async function syncSellerSubscriptionFromInvoice(invoice: Stripe.Invoice, options?: {
  markStatus?: Stripe.Subscription.Status | "past_due";
}) {
  const invoiceWithSubscription = invoice as Stripe.Invoice & {
    subscription?: string | Stripe.Subscription | null;
  };
  const subscriptionId =
    typeof invoiceWithSubscription.subscription === "string"
      ? invoiceWithSubscription.subscription
      : null;

  if (!subscriptionId) {
    return;
  }

  const stripe = getStripeServerClient();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  await syncSellerSubscriptionState({
    ...subscription,
    status: options?.markStatus ?? subscription.status,
  });
}

async function syncSellerConnectAccountState(account: {
  id?: string | null;
  metadata?: Record<string, string> | null;
  contact_email?: string | null;
  configuration?: {
    recipient?: {
      capabilities?: {
        stripe_balance?: {
          stripe_transfers?: { status?: string | null } | null;
          payouts?: { status?: string | null } | null;
        } | null;
      } | null;
    } | null;
  } | null;
}) {
  const accountId = account.id ?? null;

  if (!accountId) {
    return;
  }

  const transferStatus =
    account.configuration?.recipient?.capabilities?.stripe_balance?.stripe_transfers?.status ??
    null;
  const payoutStatus =
    account.configuration?.recipient?.capabilities?.stripe_balance?.payouts?.status ?? null;
  const chargesEnabled = transferStatus === "active";
  const payoutsEnabled = payoutStatus === "active";
  const sellerEmail =
    account.metadata?.sellerEmail?.trim().toLowerCase() ||
    account.contact_email?.trim().toLowerCase() ||
    null;

  const existingProfiles = await listSellerProfiles();
  const existingProfile =
    existingProfiles.find((entry) => entry.stripeAccountId === accountId) ??
    (sellerEmail
      ? existingProfiles.find((entry) => entry.email.trim().toLowerCase() === sellerEmail)
      : null);

  if (!existingProfile) {
    return;
  }

  await saveSellerProfile({
    ...existingProfile,
    stripeAccountId: accountId,
    stripeChargesEnabled: chargesEnabled,
    stripePayoutsEnabled: payoutsEnabled,
    onboardingCompleted: existingProfile.onboardingCompleted || (chargesEnabled && payoutsEnabled),
  });
}

export async function POST(request: Request) {
  if (!isStripeServerConfigured() || !isStripeWebhookConfigured()) {
    return NextResponse.json(
      {
        error:
          "Stripe webhook handling is not configured yet. Add the real Stripe API and webhook secrets before enabling live payment reconciliation.",
      },
      { status: 503 },
    );
  }

  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
  }

  const payload = await request.text();
  const stripe = getStripeServerClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to verify Stripe webhook signature.",
      },
      { status: 400 },
    );
  }

  const existingWebhookEvent = await getStripeWebhookEventRecord(event.id).catch(() => null);

  if (
    existingWebhookEvent &&
    (existingWebhookEvent.status === "processed" || existingWebhookEvent.status === "ignored")
  ) {
    logBuyerPaymentEvent({
      event: "webhook_received",
      eventId: event.id,
      userId: existingWebhookEvent.userId ?? null,
      productId: existingWebhookEvent.productId ?? null,
      stripeSessionId: existingWebhookEvent.stripeSessionId ?? null,
      stripePaymentIntentId: existingWebhookEvent.stripePaymentIntentId ?? null,
      reason: "duplicate_event",
    });
    return NextResponse.json({ received: true, duplicate: true });
  }

  logBuyerPaymentEvent({
    event: "webhook_received",
    eventId: event.id,
    reason: event.type,
  });

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const checkoutSurface = getSellerCheckoutSurface(session);

      if (
        session.mode === "subscription" &&
        (checkoutSurface === "seller_plan_upgrade" || getSellerSubscriptionPlanKey(session))
      ) {
        await syncSellerSubscriptionCheckout(session);
        await recordStripeWebhookEvent({
          eventId: event.id,
          eventType: event.type,
          status: "processed",
          userId: session.metadata?.sellerEmail ?? undefined,
          stripeSessionId: session.id,
        }).catch(() => null);
        return NextResponse.json({ received: true });
      }

      const metadata = getBuyerMetadata(session.metadata ?? null);
      const product = metadata.productId
        ? await resolveCheckoutProductById(metadata.productId)
        : null;

      if (!product || !metadata.buyerEmail) {
        await recordStripeWebhookEvent({
          eventId: event.id,
          eventType: event.type,
          status: "failed",
          userId: metadata.buyerUserId ?? metadata.buyerEmail ?? undefined,
          productId: metadata.productId ?? undefined,
          stripeSessionId: session.id,
          stripePaymentIntentId:
            typeof session.payment_intent === "string" ? session.payment_intent : undefined,
        }).catch(() => null);
        logBuyerPaymentEvent({
          event: "access_denied",
          eventId: event.id,
          userId: metadata.buyerUserId ?? metadata.buyerEmail,
          productId: metadata.productId,
          stripeSessionId: session.id,
          stripePaymentIntentId:
            typeof session.payment_intent === "string" ? session.payment_intent : null,
          reason: "missing_buyer_metadata_or_product",
        });
        return NextResponse.json(
          { error: "Stripe session is missing buyer or product metadata." },
          { status: 400 },
        );
      }

      const existingOrder = await findExistingOrderByStripeIds({
        sessionId: session.id,
        paymentIntentId:
          typeof session.payment_intent === "string" ? session.payment_intent : null,
      });

      const order =
        existingOrder ??
        buildBuyerOrderFromCheckoutSession({
          session,
          product,
          buyerEmail: metadata.buyerEmail,
          buyerName: session.customer_details?.name,
          sellerPlanKey: session.metadata?.sellerPlanKey
            ? normalizePlanKey(session.metadata.sellerPlanKey)
            : null,
        });

      await syncSupabaseProductRecord(product).catch(() => null);
      await persistBuyerOrder({
        ...order,
        paymentStatus: "paid",
      });
      await grantSupabaseLibraryAccess(metadata.buyerEmail, product.id).catch(() => null);
      await recordStripeWebhookEvent({
        eventId: event.id,
        eventType: event.type,
        status: "processed",
        userId: metadata.buyerUserId ?? metadata.buyerEmail ?? undefined,
        productId: product.id,
        stripeSessionId: session.id,
        stripePaymentIntentId:
          typeof session.payment_intent === "string" ? session.payment_intent : undefined,
      }).catch(() => null);
      logBuyerPaymentEvent({
        event: "access_granted",
        eventId: event.id,
        userId: metadata.buyerUserId ?? metadata.buyerEmail,
        productId: product.id,
        stripeSessionId: session.id,
        stripePaymentIntentId:
          typeof session.payment_intent === "string" ? session.payment_intent : null,
      });
    }

    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const metadata = getBuyerMetadata(paymentIntent.metadata ?? null);
      const product = metadata.productId
        ? await resolveCheckoutProductById(metadata.productId)
        : null;

      if (product && metadata.buyerEmail) {
        const existingOrder = await findExistingOrderByStripeIds({
          paymentIntentId: paymentIntent.id,
        });
        const order =
          existingOrder ??
          buildBuyerOrderFromPaymentIntent({
            paymentIntent,
            product,
            buyerEmail: metadata.buyerEmail,
            sellerPlanKey: paymentIntent.metadata?.sellerPlanKey
              ? normalizePlanKey(paymentIntent.metadata.sellerPlanKey)
              : null,
          });

        await syncSupabaseProductRecord(product).catch(() => null);
        await persistBuyerOrder({
          ...order,
          paymentStatus: "paid",
        });
        await grantSupabaseLibraryAccess(metadata.buyerEmail, product.id).catch(() => null);
        logBuyerPaymentEvent({
          event: "access_granted",
          eventId: event.id,
          userId: metadata.buyerUserId ?? metadata.buyerEmail,
          productId: product.id,
          stripePaymentIntentId: paymentIntent.id,
        });
      } else {
        logBuyerPaymentEvent({
          event: "access_denied",
          eventId: event.id,
          userId: metadata.buyerUserId ?? metadata.buyerEmail,
          productId: metadata.productId,
          stripePaymentIntentId: paymentIntent.id,
          reason: "missing_buyer_metadata_or_product",
        });
      }

      await recordStripeWebhookEvent({
        eventId: event.id,
        eventType: event.type,
        status: "processed",
        userId: metadata.buyerUserId ?? metadata.buyerEmail ?? undefined,
        productId: metadata.productId ?? undefined,
        stripePaymentIntentId: paymentIntent.id,
      }).catch(() => null);
    }

    if (event.type === "payment_intent.payment_failed") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const metadata = getBuyerMetadata(paymentIntent.metadata ?? null);
      const existingOrder = await findExistingOrderByStripeIds({
        paymentIntentId: paymentIntent.id,
      });

      if (existingOrder) {
        await persistBuyerOrder({
          ...existingOrder,
          paymentStatus: "failed",
        });
        await updateSupabaseOrderStatus({
          orderId: existingOrder.id,
          status: "failed",
        }).catch(() => null);
      }

      await recordStripeWebhookEvent({
        eventId: event.id,
        eventType: event.type,
        status: "processed",
        userId: metadata.buyerUserId ?? metadata.buyerEmail ?? undefined,
        productId: metadata.productId ?? undefined,
        stripePaymentIntentId: paymentIntent.id,
      }).catch(() => null);
      logBuyerPaymentEvent({
        event: "access_denied",
        eventId: event.id,
        userId: metadata.buyerUserId ?? metadata.buyerEmail,
        productId: metadata.productId,
        stripePaymentIntentId: paymentIntent.id,
        reason: "payment_failed",
      });
    }

    if (event.type === "charge.refunded") {
      const charge = event.data.object as Stripe.Charge;
      const paymentIntentId =
        typeof charge.payment_intent === "string" ? charge.payment_intent : null;
      const existingOrder = paymentIntentId
        ? await findExistingOrderByStripeIds({ paymentIntentId })
        : null;

      if (existingOrder) {
        await persistBuyerOrder({
          ...existingOrder,
          paymentStatus: "refunded",
        });
        await updateSupabaseOrderStatus({
          orderId: existingOrder.id,
          status: "refunded",
        }).catch(() => null);
        if (existingOrder.buyerEmail) {
          await revokeSupabaseLibraryAccess(existingOrder.buyerEmail, existingOrder.productId).catch(
            () => null,
          );
        }
        logBuyerPaymentEvent({
          event: "access_denied",
          eventId: event.id,
          userId: existingOrder.buyerEmail ?? null,
          productId: existingOrder.productId,
          stripePaymentIntentId: paymentIntentId,
          reason: "charge_refunded",
        });
      }

      await recordStripeWebhookEvent({
        eventId: event.id,
        eventType: event.type,
        status: "processed",
        userId: existingOrder?.buyerEmail ?? undefined,
        productId: existingOrder?.productId ?? undefined,
        stripePaymentIntentId: paymentIntentId ?? undefined,
      }).catch(() => null);
    }

    if (event.type === "customer.subscription.updated") {
      const subscription = event.data.object as Stripe.Subscription;
      await syncSellerSubscriptionState(subscription);
    }

    if (event.type === "customer.subscription.created") {
      const subscription = event.data.object as Stripe.Subscription;
      await syncSellerSubscriptionState(subscription);
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      await syncSellerSubscriptionState({
        ...subscription,
        status: "canceled",
      });
    }

    if (event.type === "invoice.paid") {
      const invoice = event.data.object as Stripe.Invoice;
      await syncSellerSubscriptionFromInvoice(invoice);
    }

    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object as Stripe.Invoice;
      await syncSellerSubscriptionFromInvoice(invoice, { markStatus: "past_due" });
    }

    if (event.type === "account.updated") {
      await syncSellerConnectAccountState(
        event.data.object as {
          id?: string | null;
          metadata?: Record<string, string> | null;
          contact_email?: string | null;
          configuration?: {
            recipient?: {
              capabilities?: {
                stripe_balance?: {
                  stripe_transfers?: { status?: string | null } | null;
                  payouts?: { status?: string | null } | null;
                } | null;
              } | null;
            } | null;
          } | null;
        },
      );
    }
  } catch (error) {
    await recordStripeWebhookEvent({
      eventId: event.id,
      eventType: event.type,
      status: "failed",
    }).catch(() => null);
    throw error;
  }

  logBuyerPaymentEvent({
    event: "webhook_processed",
    eventId: event.id,
    reason: event.type,
  });
  return NextResponse.json({ received: true });
}
