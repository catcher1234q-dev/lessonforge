import { NextResponse } from "next/server";

import { hasAppSessionForEmail } from "@/lib/auth/app-session";
import { getCurrentViewer } from "@/lib/auth/viewer";
import { getStripeServerClient, isStripeServerConfigured } from "@/lib/stripe/server";

function getSafeReturnTo(candidate: string | null | undefined) {
  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//")) {
    return "/sell/dashboard?focus=plan";
  }

  return candidate;
}

function buildReturnUrl(baseReturnTo: string, state: string) {
  const url = new URL(baseReturnTo, "http://localhost");
  url.searchParams.set("planBilling", state);
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
  const returnTo = getSafeReturnTo(url.searchParams.get("returnTo"));

  if (!(await hasAppSessionForEmail(viewer.email))) {
    return NextResponse.redirect(new URL("/sell/onboarding?billing=signin-required", origin), 303);
  }

  if (viewer.role !== "seller" && viewer.role !== "admin" && viewer.role !== "owner") {
    return NextResponse.redirect(new URL("/sell/onboarding?billing=seller-required", origin), 303);
  }

  if (!isStripeServerConfigured()) {
    return NextResponse.redirect(
      new URL(buildReturnUrl(returnTo, "manage-not-ready"), origin),
      303,
    );
  }

  const stripe = getStripeServerClient();
  const customers = await stripe.customers.list({
    email: viewer.email,
    limit: 1,
  });
  const customer = customers.data[0];

  if (!customer) {
    return NextResponse.redirect(
      new URL(buildReturnUrl(returnTo, "no-paid-plan"), origin),
      303,
    );
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: customer.id,
    return_url: `${origin}${returnTo}`,
  });

  return NextResponse.redirect(session.url, 303);
}
