import { NextResponse } from "next/server";

import { hasAppSessionForEmail } from "@/lib/auth/app-session";
import { getCurrentViewer } from "@/lib/auth/viewer";
import { normalizePlanKey } from "@/lib/config/plans";
import {
  getSupabaseSubscriptionRecord,
  getSupabaseSellerProfile,
  listSupabaseSellerProfiles,
  upsertSupabaseProfile,
  upsertSupabaseSellerProfile,
} from "@/lib/supabase/admin-sync";
import { getSupabaseServerUser } from "@/lib/supabase/server-auth";
import type { SellerProfileDraft } from "@/types";

export async function GET() {
  const viewer = await getCurrentViewer();

  if (!(await hasAppSessionForEmail(viewer.email))) {
    return NextResponse.json({ error: "Signed-in seller access required." }, { status: 401 });
  }

  const profiles = await listSupabaseSellerProfiles();
  if (viewer.role === "admin" || viewer.role === "owner") {
    return NextResponse.json({ profiles });
  }

  const syncedSubscription = await getSupabaseSubscriptionRecord(viewer.email).catch(
    () => null,
  );

  return NextResponse.json({
    profiles: profiles
      .filter((profile) => profile.email === viewer.email)
      .map((profile) =>
        syncedSubscription?.plan_name
          ? {
              ...profile,
              sellerPlanKey: normalizePlanKey(syncedSubscription.plan_name),
            }
          : profile,
      ),
  });
}

export async function POST(request: Request) {
  try {
    const viewer = await getCurrentViewer();

    if (!(await hasAppSessionForEmail(viewer.email))) {
      return NextResponse.json({ error: "Signed-in seller access required." }, { status: 401 });
    }

    const body = (await request.json()) as { profile?: SellerProfileDraft };

    if (!body.profile?.email || !body.profile?.displayName) {
      return NextResponse.json(
        { error: "Seller email and display name are required." },
        { status: 400 },
      );
    }

    if (
      viewer.role !== "admin" &&
      viewer.role !== "owner" &&
      body.profile.email !== viewer.email
    ) {
      return NextResponse.json(
        { error: "You can only save your own seller profile." },
        { status: 403 },
      );
    }

    const existingProfile = await getSupabaseSellerProfile(body.profile.email).catch(
      () => null,
    );
    const normalizedPlanKey = normalizePlanKey(body.profile.sellerPlanKey);
    const sanitizedProfile: SellerProfileDraft =
      viewer.role === "admin" || viewer.role === "owner"
        ? {
            ...body.profile,
            sellerPlanKey: normalizedPlanKey,
          }
        : {
            ...body.profile,
            sellerPlanKey: "starter",
            onboardingCompleted: existingProfile?.onboardingCompleted ?? false,
            stripeAccountId: existingProfile?.stripeAccountId ?? undefined,
            stripeOnboardingStatus: existingProfile?.stripeOnboardingStatus ?? undefined,
            stripeChargesEnabled: existingProfile?.stripeChargesEnabled ?? false,
            stripePayoutsEnabled: existingProfile?.stripePayoutsEnabled ?? false,
          };

    const supabaseUser = await getSupabaseServerUser();
    if (
      !supabaseUser?.id ||
      !supabaseUser.email ||
      supabaseUser.email.trim().toLowerCase() !== body.profile.email.trim().toLowerCase()
    ) {
      return NextResponse.json(
        { error: "Supabase authentication is required before saving seller profile data." },
        { status: 401 },
      );
    }

    await upsertSupabaseProfile({
      id: supabaseUser.id,
      email: supabaseUser.email,
      role: "seller",
    }).catch(() => null);

    const saved = await upsertSupabaseSellerProfile({
      userId: supabaseUser.id,
      email: supabaseUser.email,
      displayName: sanitizedProfile.displayName,
      storeName: sanitizedProfile.storeName,
      storeHandle: sanitizedProfile.storeHandle,
      primarySubject: sanitizedProfile.primarySubject,
      tagline: sanitizedProfile.tagline,
      sellerPlanKey: sanitizedProfile.sellerPlanKey,
      onboardingCompleted: sanitizedProfile.onboardingCompleted,
      stripeAccountId:
        sanitizedProfile.stripeAccountId ?? existingProfile?.stripeAccountId ?? null,
      stripeOnboardingStatus:
        sanitizedProfile.stripeOnboardingStatus ??
        existingProfile?.stripeOnboardingStatus ??
        null,
      stripeChargesEnabled:
        sanitizedProfile.stripeChargesEnabled ??
        existingProfile?.stripeChargesEnabled ??
        false,
      stripePayoutsEnabled:
        sanitizedProfile.stripePayoutsEnabled ??
        existingProfile?.stripePayoutsEnabled ??
        false,
    });

    return NextResponse.json({ profile: saved.profile });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to save seller profile.",
      },
      { status: 500 },
    );
  }
}
