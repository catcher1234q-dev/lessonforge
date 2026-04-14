import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";

import { env } from "@/lib/config/env";
import { getSupabaseServerUser } from "@/lib/supabase/server-auth";

export const APP_SESSION_COOKIE = "lessonforge-app-session";

function getSigningSecret() {
  return (
    env.LESSONFORGE_ACCESS_COOKIE_SECRET ||
    env.LESSONFORGE_OWNER_ACCESS_CODE ||
    env.LESSONFORGE_ADMIN_ACCESS_CODE ||
    "lessonforge-local-app-session"
  );
}

function signPayload(payload: string) {
  return createHmac("sha256", getSigningSecret()).update(payload).digest("hex");
}

export function buildAppSessionCookieValue(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 30;
  const payload = `${normalizedEmail}:${expiresAt}`;
  return `${payload}:${signPayload(payload)}`;
}

function readAppSessionEmail(token?: string | null) {
  if (!token) {
    return null;
  }

  const [email, expiresAtRaw, signature] = token.split(":");

  if (!email || !expiresAtRaw || !signature) {
    return null;
  }

  const payload = `${email}:${expiresAtRaw}`;
  const expectedSignature = signPayload(payload);

  try {
    if (
      !timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature)) ||
      Number(expiresAtRaw) < Date.now()
    ) {
      return null;
    }
  } catch {
    return null;
  }

  return email;
}

export async function getAppSessionEmail() {
  const cookieStore = await cookies();
  return readAppSessionEmail(cookieStore.get(APP_SESSION_COOKIE)?.value);
}

export async function hasAppSessionForEmail(email?: string | null) {
  if (!email) {
    return false;
  }

  const supabaseUser = await getSupabaseServerUser();
  const normalizedEmail = email.trim().toLowerCase();

  if (supabaseUser?.email?.trim().toLowerCase() === normalizedEmail) {
    return true;
  }

  const appSessionEmail = await getAppSessionEmail();
  return appSessionEmail === normalizedEmail;
}
