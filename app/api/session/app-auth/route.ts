import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { APP_SESSION_COOKIE, buildAppSessionCookieValue } from "@/lib/auth/app-session";
import { getCurrentViewer } from "@/lib/auth/viewer";
import { SUPABASE_ACCESS_TOKEN_COOKIE } from "@/lib/supabase/server-auth";

const APP_SESSION_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string; accessToken?: string };
  const email = body.email?.trim().toLowerCase();
  const accessToken = body.accessToken?.trim();

  if (!email) {
    return NextResponse.json({ error: "email is required." }, { status: 400 });
  }

  const viewer = await getCurrentViewer();
  const viewerEmail = viewer.email?.trim().toLowerCase();

  if (
    (viewer.role !== "buyer" && viewer.role !== "seller") ||
    !viewerEmail ||
    viewerEmail !== email
  ) {
    return NextResponse.json(
      { error: "A matching signed-in buyer or seller session is required." },
      { status: 403 },
    );
  }

  const cookieStore = await cookies();
  cookieStore.set(APP_SESSION_COOKIE, buildAppSessionCookieValue(email), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: APP_SESSION_COOKIE_MAX_AGE_SECONDS,
  });
  if (accessToken) {
    cookieStore.set(SUPABASE_ACCESS_TOKEN_COOKIE, accessToken, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: APP_SESSION_COOKIE_MAX_AGE_SECONDS,
    });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(APP_SESSION_COOKIE);
  cookieStore.delete(SUPABASE_ACCESS_TOKEN_COOKIE);
  return NextResponse.json({ ok: true });
}
