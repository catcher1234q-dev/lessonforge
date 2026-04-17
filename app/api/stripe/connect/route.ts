import { NextResponse } from "next/server";

import { hasAppSessionForEmail } from "@/lib/auth/app-session";
import { getCurrentViewer } from "@/lib/auth/viewer";
import { getSiteOrigin } from "@/lib/config/site";
import { getStripeServerClient, isStripeServerConfigured } from "@/lib/stripe/server";
import {
  getSupabaseSellerProfile,
  upsertSupabaseProfile,
  upsertSupabaseSellerProfile,
} from "@/lib/supabase/admin-sync";
import { getSupabaseServerUser } from "@/lib/supabase/server-auth";
import type { SellerProfileDraft } from "@/types";

type StripeConnectStatus = "not_connected" | "setup_incomplete" | "connected";

function buildFallbackProfile(input: { email: string; name?: string | null }): SellerProfileDraft {
  const email = input.email.trim().toLowerCase();
  const displayName = input.name?.trim() || "Seller";

  return {
    displayName,
    email,
    storeName: displayName,
    storeHandle: email.split("@")[0]?.replace(/[^a-z0-9-]+/gi, "-") || "seller",
    primarySubject: "Math",
    tagline: "",
    sellerPlanKey: "starter",
    onboardingCompleted: false,
  };
}

async function getAuthenticatedSellerContext() {
  const viewer = await getCurrentViewer();

  if (!(await hasAppSessionForEmail(viewer.email))) {
    console.warn("[stripe-connect] seller check failed: missing app session", {
      viewerEmail: viewer.email,
      viewerRole: viewer.role,
    });
    return { error: NextResponse.json({ error: "Signed-in seller access required." }, { status: 401 }) };
  }

  const supabaseUser = await getSupabaseServerUser();

  if (!supabaseUser?.id || !supabaseUser.email) {
    console.warn("[stripe-connect] seller check failed: missing supabase user", {
      viewerEmail: viewer.email,
      viewerRole: viewer.role,
    });
    return {
      error: NextResponse.json(
        { error: "Supabase authentication is required before connecting Stripe." },
        { status: 401 },
      ),
    };
  }

  const normalizedEmail = supabaseUser.email.trim().toLowerCase();

  const matchedProfile = await getSupabaseSellerProfile(normalizedEmail).catch(() => null);

  const hasSellerRole =
    viewer.role === "seller" || viewer.role === "admin" || viewer.role === "owner";
  const hasPersistedSellerProfile = Boolean(matchedProfile);

  if (!hasSellerRole && !hasPersistedSellerProfile) {
    console.warn("[stripe-connect] seller check failed: no seller role and no persisted seller profile", {
      viewerEmail: viewer.email,
      viewerRole: viewer.role,
      supabaseEmail: normalizedEmail,
      hasPersistedSellerProfile,
    });
    return { error: NextResponse.json({ error: "Seller access required." }, { status: 403 }) };
  }

  return {
    supabaseUser,
    profile:
      matchedProfile ??
      buildFallbackProfile({
        email: normalizedEmail,
        name: supabaseUser.user_metadata?.name ?? viewer.name,
      }),
  };
}

function mapAccountStatus(account: {
  charges_enabled?: boolean;
  payouts_enabled?: boolean;
  details_submitted?: boolean;
}) {
  const chargesEnabled = Boolean(account.charges_enabled);
  const payoutsEnabled = Boolean(account.payouts_enabled);
  const status: StripeConnectStatus =
    chargesEnabled && payoutsEnabled
      ? "connected"
      : account.details_submitted
        ? "setup_incomplete"
        : "setup_incomplete";

  return {
    chargesEnabled,
    payoutsEnabled,
    status,
  };
}

function buildSavedProfile(
  profile: SellerProfileDraft,
  input: {
    stripeAccountId: string;
    stripeOnboardingStatus: StripeConnectStatus;
    stripeChargesEnabled: boolean;
    stripePayoutsEnabled: boolean;
  },
): SellerProfileDraft {
  return {
    ...profile,
    stripeAccountId: input.stripeAccountId,
    stripeOnboardingStatus: input.stripeOnboardingStatus,
    stripeChargesEnabled: input.stripeChargesEnabled,
    stripePayoutsEnabled: input.stripePayoutsEnabled,
  };
}

async function syncStripeConnectStatus() {
  const context = await getAuthenticatedSellerContext();

  if ("error" in context) {
    return { error: context.error } as const;
  }

  const { profile } = context;
  const contextEmail = context.supabaseUser.email?.trim().toLowerCase();

  if (!contextEmail) {
    return {
      error: NextResponse.json(
        { error: "Supabase authentication did not return a seller email." },
        { status: 401 },
      ),
    } as const;
  }

  if (!profile.stripeAccountId) {
    return {
      stripeAccountId: null,
      status: "not_connected" as StripeConnectStatus,
      chargesEnabled: false,
      payoutsEnabled: false,
      profile,
    } as const;
  }

  const stripe = getStripeServerClient();
  const account = await stripe.accounts.retrieve(profile.stripeAccountId);
  const nextStatus = mapAccountStatus(account);
  await upsertSupabaseProfile({
    id: context.supabaseUser.id,
    email: contextEmail,
    role: "seller",
  });

  const savedProfile = await upsertSupabaseSellerProfile({
    userId: context.supabaseUser.id,
    email: contextEmail,
    displayName: profile.displayName,
    storeName: profile.storeName,
    storeHandle: profile.storeHandle,
    primarySubject: profile.primarySubject,
    tagline: profile.tagline,
    sellerPlanKey: profile.sellerPlanKey,
    onboardingCompleted: profile.onboardingCompleted,
    stripeAccountId: account.id,
    stripeOnboardingStatus: nextStatus.status,
    stripeChargesEnabled: nextStatus.chargesEnabled,
    stripePayoutsEnabled: nextStatus.payoutsEnabled,
  });

  return {
    stripeAccountId: account.id,
    status: nextStatus.status,
    chargesEnabled: nextStatus.chargesEnabled,
    payoutsEnabled: nextStatus.payoutsEnabled,
    profile: savedProfile.profile,
  } as const;
}

async function createStripeConnectOnboarding() {
  const context = await getAuthenticatedSellerContext();

  if ("error" in context) {
    return { error: context.error } as const;
  }

  const { supabaseUser, profile } = context;
  const stripe = getStripeServerClient();
  const sellerEmail = supabaseUser.email?.trim().toLowerCase();
  const sellerDisplayName = profile.displayName || profile.storeName || "Seller";
  const siteOrigin = getSiteOrigin();

  if (!sellerEmail) {
    return {
      error: NextResponse.json(
        { error: "Supabase authentication did not return a seller email." },
        { status: 401 },
      ),
    } as const;
  }

  let accountId = profile.stripeAccountId ?? null;
  let accountStatus = {
    chargesEnabled: Boolean(profile.stripeChargesEnabled),
    payoutsEnabled: Boolean(profile.stripePayoutsEnabled),
    status:
      profile.stripeChargesEnabled && profile.stripePayoutsEnabled
        ? ("connected" as StripeConnectStatus)
        : ("setup_incomplete" as StripeConnectStatus),
  };

  if (accountId) {
    const existingAccount = await stripe.accounts.retrieve(accountId);
    accountId = existingAccount.id;
    accountStatus = mapAccountStatus(existingAccount);
  } else {
    const account = await stripe.accounts.create({
      type: "express",
      email: sellerEmail,
      metadata: {
        sellerUserId: supabaseUser.id,
        sellerEmail,
        sellerDisplayName,
      },
    });
    accountId = account.id;
    accountStatus = mapAccountStatus(account);
  }

  await upsertSupabaseProfile({
    id: supabaseUser.id,
    email: sellerEmail,
    role: "seller",
  });

  const savedProfile = await upsertSupabaseSellerProfile({
    userId: supabaseUser.id,
    email: sellerEmail,
    displayName: profile.displayName,
    storeName: profile.storeName,
    storeHandle: profile.storeHandle,
    primarySubject: profile.primarySubject,
    tagline: profile.tagline,
    sellerPlanKey: profile.sellerPlanKey,
    onboardingCompleted: profile.onboardingCompleted,
    stripeAccountId: accountId,
    stripeOnboardingStatus: accountStatus.status,
    stripeChargesEnabled: accountStatus.chargesEnabled,
    stripePayoutsEnabled: accountStatus.payoutsEnabled,
  });

  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${siteOrigin}/sell/onboarding`,
    return_url: `${siteOrigin}/sell/dashboard`,
    type: "account_onboarding",
  });

  return {
    accountLinkUrl: accountLink.url,
    stripeAccountId: accountId,
    status: accountStatus.status,
    chargesEnabled: accountStatus.chargesEnabled,
    payoutsEnabled: accountStatus.payoutsEnabled,
    profile: savedProfile.profile,
  } as const;
}

export async function GET(request: Request) {
  try {
    if (!isStripeServerConfigured()) {
      return NextResponse.json(
        { error: "Stripe is not configured yet." },
        { status: 503 },
      );
    }

    const { searchParams } = new URL(request.url);

    if (searchParams.get("redirectToStripe") === "1") {
      const result = await createStripeConnectOnboarding();

      if ("error" in result) {
        return result.error;
      }

      return NextResponse.redirect(result.accountLinkUrl);
    }

    const result = await syncStripeConnectStatus();

    if ("error" in result) {
      return result.error;
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load Stripe connection status.",
      },
      { status: 500 },
    );
  }
}

export async function POST() {
  try {
    if (!isStripeServerConfigured()) {
      return NextResponse.json(
        { error: "Stripe is not configured yet." },
        { status: 503 },
      );
    }

    const result = await createStripeConnectOnboarding();

    if ("error" in result) {
      return result.error;
    }

    return NextResponse.json({
      url: result.accountLinkUrl,
      stripeAccountId: result.stripeAccountId,
      status: result.status,
      chargesEnabled: result.chargesEnabled,
      payoutsEnabled: result.payoutsEnabled,
      profile: result.profile,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to start Stripe Connect onboarding.",
      },
      { status: 500 },
    );
  }
}
