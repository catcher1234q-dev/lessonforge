import { NextResponse } from "next/server";

import { hasAppSessionForEmail } from "@/lib/auth/app-session";
import { getCurrentViewer } from "@/lib/auth/viewer";
import { normalizePlanKey, type PlanKey } from "@/lib/config/plans";
import { isStripeServerConfigured, getStripeServerClient } from "@/lib/stripe/server";
import {
  getSellerPlanStripePriceId,
  isSellerPlanBillingConfigured,
} from "@/lib/stripe/seller-plan-billing";

function getSafeReturnTo(candidate: string | null | undefined) {
  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//")) {
    return "/sell/dashboard?focus=plan";
  }

  return candidate;
}

function buildReturnUrl(baseReturnTo: string, state: string, targetPlan: PlanKey) {
  const url = new URL(baseReturnTo, "http://localhost");
  url.searchParams.set("planBilling", state);
  url.searchParams.set("targetPlan", targetPlan);
  return `${url.pathname}${url.search}`;
}

function getSafeAppOrigin(originHeader: string | null) {
  const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  try {
    const origin = originHeader
      ? new URL(originHeader).origin
      : new URL(configuredOrigin).origin;
    return origin;
  } catch {
    return "http://localhost:3000";
  }
}

export async function GET(request: Request) {
  const viewer = await getCurrentViewer();
  const origin = getSafeAppOrigin(request.headers.get("origin"));
  const url = new URL(request.url);
  const plan = normalizePlanKey(url.searchParams.get("plan"));
  const returnTo = getSafeReturnTo(url.searchParams.get("returnTo"));

  if (plan === "starter") {
    return NextResponse.redirect(new URL(returnTo, origin), 303);
  }

  if (!(await hasAppSessionForEmail(viewer.email))) {
    return NextResponse.redirect(new URL("/sell/onboarding?billing=signin-required", origin), 303);
  }

  if (viewer.role !== "seller" && viewer.role !== "admin" && viewer.role !== "owner") {
    return NextResponse.redirect(new URL("/sell/onboarding?billing=seller-required", origin), 303);
  }

  if (!isStripeServerConfigured() || !isSellerPlanBillingConfigured(plan)) {
    return NextResponse.redirect(
      new URL(buildReturnUrl(returnTo, "not-ready", plan), origin),
      303,
    );
  }

  const priceId = getSellerPlanStripePriceId(plan);

  if (!priceId) {
    return NextResponse.redirect(
      new URL(buildReturnUrl(returnTo, "not-ready", plan), origin),
      303,
    );
  }

  const stripe = getStripeServerClient();
  const successReturnTo = buildReturnUrl(returnTo, "success", plan);
  const cancelReturnTo = buildReturnUrl(returnTo, "cancelled", plan);

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: viewer.email,
    allow_promotion_codes: true,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: `${origin}${successReturnTo}`,
    cancel_url: `${origin}${cancelReturnTo}`,
    metadata: {
      sellerEmail: viewer.email,
      targetPlan: plan,
      billingSurface: "seller_plan_upgrade",
    },
    subscription_data: {
      metadata: {
        sellerEmail: viewer.email,
        targetPlan: plan,
      },
    },
  });

  if (!session.url) {
    return NextResponse.redirect(
      new URL(buildReturnUrl(returnTo, "failed", plan), origin),
      303,
    );
  }

  return NextResponse.redirect(session.url, 303);
}
