import { NextResponse } from "next/server";

import { upsertSupabaseProfile } from "@/lib/supabase/admin-sync";
import { getSupabaseServerUser } from "@/lib/supabase/server-auth";

export const runtime = "nodejs";

export async function POST() {
  const user = await getSupabaseServerUser();

  if (!user?.id || !user.email) {
    return NextResponse.json(
      { error: "You need to be signed in before LessonForge can sync your profile." },
      { status: 401 },
    );
  }

  const result = await upsertSupabaseProfile({
    id: user.id,
    email: user.email,
    role: "buyer",
  });

  if (!result.synced) {
    return NextResponse.json(
      { error: "Supabase profile sync is not configured yet." },
      { status: 503 },
    );
  }

  return NextResponse.json({ profile: result.profile });
}
