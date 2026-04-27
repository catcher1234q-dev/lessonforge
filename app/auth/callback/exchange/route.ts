import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { sanitizeAuthNextPath } from "@/lib/auth/auth-redirect";
import {
  createSupabaseServerAuthClient,
  hasSupabaseServerEnv,
  type SupabaseCookie,
} from "@/lib/supabase/server";

function applyCookies(response: NextResponse, cookiesToSet: SupabaseCookie[]) {
  cookiesToSet.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options);
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;
  const code = url.searchParams.get("code");
  const nextPath = sanitizeAuthNextPath(url.searchParams.get("next") ?? "/account");

  if (!hasSupabaseServerEnv()) {
    return NextResponse.redirect(
      `${origin}/auth/callback?auth_message=${encodeURIComponent(
        "Supabase environment variables are missing. Add them before using sign-in.",
      )}&next=${encodeURIComponent(nextPath)}`,
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${origin}/auth/callback?auth_message=${encodeURIComponent(
        "No sign-in code was returned from the provider.",
      )}&next=${encodeURIComponent(nextPath)}`,
    );
  }

  const cookieStore = await cookies();
  let response = NextResponse.redirect(
    `${origin}/auth/callback?oauth=complete&next=${encodeURIComponent(nextPath)}`,
  );

  const supabase = createSupabaseServerAuthClient({
    getAll() {
      return cookieStore.getAll().map((cookie) => ({
        name: cookie.name,
        value: cookie.value,
      }));
    },
    setAll(cookiesToSet) {
      cookiesToSet.forEach(({ name, value }) => {
        cookieStore.set(name, value);
      });

      response = NextResponse.redirect(
        `${origin}/auth/callback?oauth=complete&next=${encodeURIComponent(nextPath)}`,
      );
      applyCookies(response, cookiesToSet);
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      `${origin}/auth/callback?auth_message=${encodeURIComponent(error.message)}&next=${encodeURIComponent(nextPath)}`,
    );
  }

  return response;
}
