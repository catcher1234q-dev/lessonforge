import { NextResponse } from "next/server";

import { hasAppSessionForEmail } from "@/lib/auth/app-session";
import { getCurrentViewer } from "@/lib/auth/viewer";
import { listSellerProfiles, saveSellerProfile } from "@/lib/lessonforge/data-access";

type OnboardBody = {
  email?: string;
  displayName?: string;
  accountId?: string;
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

    const body = (await request.json()) as OnboardBody;
    const email = body.email?.trim().toLowerCase() || viewer.email.trim().toLowerCase();
    const displayName = body.displayName?.trim() || viewer.name || "Teacher seller";
    const paypalMerchantId = body.accountId?.trim();

    if (viewer.role === "seller" && email !== viewer.email.trim().toLowerCase()) {
      return NextResponse.json(
        { error: "You can only update PayPal payout setup for your own seller account." },
        { status: 403 },
      );
    }

    if (!paypalMerchantId) {
      return NextResponse.json(
        {
          error:
            "Add your PayPal merchant ID in seller onboarding to mark payout setup ready.",
        },
        { status: 400 },
      );
    }

    const existingProfile =
      (await listSellerProfiles()).find(
        (profile) => profile.email.trim().toLowerCase() === email,
      ) ?? null;

    const profile = await saveSellerProfile({
      displayName,
      email,
      storeName: existingProfile?.storeName || displayName,
      storeHandle:
        existingProfile?.storeHandle ||
        email.split("@")[0]?.replace(/[^a-z0-9-]+/gi, "-") ||
        "seller",
      primarySubject: existingProfile?.primarySubject || "Math",
      tagline: existingProfile?.tagline || "",
      sellerPlanKey: existingProfile?.sellerPlanKey || "starter",
      onboardingCompleted: existingProfile?.onboardingCompleted ?? true,
      paypalMerchantId,
      paypalOnboardingStatus: "connected",
      paypalPayoutsEnabled: true,
      paypalConsentGranted: true,
      stripeAccountId: existingProfile?.stripeAccountId,
      stripeOnboardingStatus: existingProfile?.stripeOnboardingStatus,
      stripeChargesEnabled: existingProfile?.stripeChargesEnabled,
      stripePayoutsEnabled: existingProfile?.stripePayoutsEnabled,
    });

    return NextResponse.json({
      url: "/sell/onboarding?payout=paypal-ready",
      accountId: profile.paypalMerchantId,
      profile,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to save PayPal payout setup.",
      },
      { status: 500 },
    );
  }
}
