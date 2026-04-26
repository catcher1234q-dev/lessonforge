import { NextResponse, type NextRequest } from "next/server";

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

export async function proxy(request: NextRequest) {
  if (!hasSupabaseServerEnv()) {
    return NextResponse.next({
      request: {
        headers: request.headers,
      },
    });
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createSupabaseServerAuthClient({
    getAll() {
      return request.cookies.getAll().map((cookie) => ({
        name: cookie.name,
        value: cookie.value,
      }));
    },
    setAll(cookiesToSet) {
      cookiesToSet.forEach(({ name, value }) => {
        request.cookies.set(name, value);
      });

      response = NextResponse.next({
        request: {
          headers: request.headers,
        },
      });
      applyCookies(response, cookiesToSet);
    },
  });

  await supabase.auth.getUser().catch(() => null);

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
