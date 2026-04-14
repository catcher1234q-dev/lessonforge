import "server-only";

import { cookies } from "next/headers";

import { getSupabaseServerAdminClient, hasSupabaseServerEnv } from "@/lib/supabase/server";

export const SUPABASE_ACCESS_TOKEN_COOKIE = "lessonforge-supabase-access-token";

export async function getSupabaseServerUser() {
  if (!hasSupabaseServerEnv()) {
    return null;
  }

  const cookieStore = await cookies();
  const accessToken = cookieStore.get(SUPABASE_ACCESS_TOKEN_COOKIE)?.value;

  if (!accessToken) {
    return null;
  }

  const supabase = getSupabaseServerAdminClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(accessToken);

  if (error || !user?.email) {
    return null;
  }

  return user;
}

