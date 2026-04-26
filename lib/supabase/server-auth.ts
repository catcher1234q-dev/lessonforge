import "server-only";

import { cookies } from "next/headers";

import {
  createSupabaseServerAuthClient,
  getSupabaseServerAdminClient,
  hasSupabaseServerEnv,
} from "@/lib/supabase/server";

export const SUPABASE_ACCESS_TOKEN_COOKIE = "lessonforge-supabase-access-token";

export async function getSupabaseServerUser() {
  if (!hasSupabaseServerEnv()) {
    return null;
  }

  const cookieStore = await cookies();
  try {
    const supabase = createSupabaseServerAuthClient({
      getAll() {
        return cookieStore.getAll().map((cookie) => ({
          name: cookie.name,
          value: cookie.value,
        }));
      },
      setAll() {
        // Server components can read the refreshed auth cookies after middleware runs.
      },
    });

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (!error && user?.email) {
      return user;
    }
  } catch {
    // Fall back to the legacy access-token cookie during the cutover.
  }

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
