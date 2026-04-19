import { NextResponse } from "next/server";

import { hasAppSessionForEmail } from "@/lib/auth/app-session";
import { getCurrentViewer } from "@/lib/auth/viewer";
import { getStripeServerClient, isStripeServerConfigured } from "@/lib/stripe/server";
import { getSupabaseSellerProfile } from "@/lib/supabase/admin-sync";

type OnboardBody = {
  email?: string;
  displayName?: string;
  accountId?: string;
  sellerAccountEnvKey?: string;
};

export async function POST(request: Request) {
  try {
    const viewer = await getCurrentViewer();

    if (!(await hasAppSessionForEmail(viewer.email))) {
      return NextResponse.json({ error: "Signed-in seller access required." }, { status: 401 });
    }

    if (viewer.role !== "seller" && viewer.role !== "admin" && viewer.role !== "owner") {
      return NextResponse.json({ error: "Seller access required." }, { status: 403 });
    }

    if (!isStripeServerConfigured()) {
      return NextResponse.json(
        {
          error:
            "Stripe onboarding is not configured for live payouts yet. Add the real Stripe keys before using seller payout setup.",
        },
        { status: 503 },
      );
    }

    const body = (await request.json()) as OnboardBody;
    const email = body.email?.trim().toLowerCase();
    const displayName = body.displayName?.trim();
    const viewerProfile =
      viewer.role === "seller" ? await getSupabaseSellerProfile(viewer.email).catch(() => null) : null;
    const requestedAccountId = body.accountId?.trim();

    if (!requestedAccountId && (!email || !displayName)) {
      return NextResponse.json(
        {
          error:
            "Display name and email are required for seller onboarding.",
        },
        { status: 400 },
      );
    }

    if (viewer.role === "seller") {
      if (email && email !== viewer.email.trim().toLowerCase()) {
        return NextResponse.json(
          { error: "You can only start Stripe onboarding for your own seller account." },
          { status: 403 },
        );
      }

      if (
        requestedAccountId &&
        requestedAccountId !== (viewerProfile?.stripeAccountId ?? null)
      ) {
        return NextResponse.json(
          { error: "You can only continue Stripe onboarding for your own seller account." },
          { status: 403 },
        );
      }
    }

    const stripe = getStripeServerClient();
    const origin = process.env.NEXT_PUBLIC_APP_URL || request.headers.get("origin") || "http://localhost:3000";
    const sellerName = displayName || "Teacher seller";

    if (requestedAccountId) {
      const params = new URLSearchParams({
        seller_onboarding: "complete",
        seller_name: sellerName,
      });

      const refreshParams = new URLSearchParams({
        seller_onboarding: "refresh",
        seller_name: sellerName,
      });

      const accountLink = await stripe.v2.core.accountLinks.create({
        account: requestedAccountId,
        use_case: {
          type: "account_onboarding",
          account_onboarding: {
            configurations: ["recipient"],
            refresh_url: `${origin}/sell/onboarding?${refreshParams.toString()}`,
            return_url: `${origin}/sell/onboarding?${params.toString()}`,
            collection_options: {
              fields: "currently_due",
              future_requirements: "include",
            },
          },
        },
      });

      return NextResponse.json({ url: accountLink.url, accountId: requestedAccountId });
    }

    if (!email) {
      return NextResponse.json(
        { error: "Seller email is required to create a new payout account." },
        { status: 400 },
      );
    }

    const account = await stripe.v2.core.accounts.create({
      display_name: sellerName,
      contact_email: email,
      identity: {
        country: "US",
      },
      dashboard: "express",
      defaults: {
        currency: "usd",
        locales: ["en-US"],
        responsibilities: {
          fees_collector: "application_express",
          losses_collector: "application",
        },
      },
      configuration: {
        recipient: {
          capabilities: {
            stripe_balance: {
              stripe_transfers: {
                requested: true,
              },
            },
          },
        },
      },
      metadata: {
        sellerEmail: email,
        sellerDisplayName: sellerName,
      },
    });

    const accountId = account.id;
    const params = new URLSearchParams({
      seller_connected: "1",
      account_id: accountId,
      seller_email: email,
      seller_name: sellerName,
    });

    const accountLink = await stripe.v2.core.accountLinks.create({
      account: accountId,
      use_case: {
        type: "account_onboarding",
        account_onboarding: {
          configurations: ["recipient"],
          refresh_url: `${origin}/sell/onboarding?seller_onboarding=refresh&seller_name=${encodeURIComponent(sellerName)}`,
          return_url: `${origin}/sell/onboarding?${params.toString()}`,
          collection_options: {
            fields: "currently_due",
            future_requirements: "include",
          },
        },
      },
    });

    return NextResponse.json({ url: accountLink.url, accountId });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to start seller onboarding.",
      },
      { status: 500 },
    );
  }
}
