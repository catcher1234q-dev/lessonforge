import { NextResponse } from "next/server";

import { hasAppSessionForEmail } from "@/lib/auth/app-session";
import { getCurrentViewer } from "@/lib/auth/viewer";
import { normalizePlanKey } from "@/lib/config/plans";
import { listSellerProfiles, saveSellerProfile } from "@/lib/lessonforge/repository";
import {
  getSupabaseSubscriptionRecord,
  upsertSupabaseProfile,
} from "@/lib/supabase/admin-sync";
import { getSupabaseServerUser } from "@/lib/supabase/server-auth";
import type { SellerProfileDraft } from "@/types";

export async function GET() {
  const viewer = await getCurrentViewer();

  if (!(await hasAppSessionForEmail(viewer.email))) {
    return NextResponse.json({ error: "Signed-in seller access required." }, { status: 401 });
  }

  const profiles = await listSellerProfiles();
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

    const normalizedPlanKey = normalizePlanKey(body.profile.sellerPlanKey);
    const sanitizedProfile: SellerProfileDraft =
      viewer.role === "admin" || viewer.role === "owner"
        ? {
            ...body.profile,
            sellerPlanKey: normalizedPlanKey,
          }
        : {
            ...body.profile,
            sellerPlanKey: normalizedPlanKey === "starter" ? "starter" : "starter",
          };

    const saved = await saveSellerProfile(sanitizedProfile);

    const supabaseUser = await getSupabaseServerUser();
    if (
      supabaseUser?.id &&
      supabaseUser.email &&
      supabaseUser.email.trim().toLowerCase() === body.profile.email.trim().toLowerCase()
    ) {
      await upsertSupabaseProfile({
        id: supabaseUser.id,
        email: supabaseUser.email,
        role: "seller",
      }).catch(() => null);
    }

    return NextResponse.json({ profile: saved });
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
