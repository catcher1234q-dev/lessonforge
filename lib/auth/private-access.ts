import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";

import { env } from "@/lib/config/env";
import type { ViewerRole } from "@/types";

export const PRIVATE_ACCESS_COOKIE = "lessonforge-private-access";

export type PrivateAccessRole = "admin" | "owner";

function getSigningSecret() {
  return (
    env.LESSONFORGE_ACCESS_COOKIE_SECRET ||
    env.LESSONFORGE_OWNER_ACCESS_CODE ||
    env.LESSONFORGE_ADMIN_ACCESS_CODE ||
    "lessonforge-local-private-access"
  );
}

function signPayload(payload: string) {
  return createHmac("sha256", getSigningSecret()).update(payload).digest("hex");
}

function createToken(role: PrivateAccessRole, expiresAt: number) {
  const payload = `${role}:${expiresAt}`;
  return `${payload}:${signPayload(payload)}`;
}

function readTokenRole(token?: string | null): PrivateAccessRole | null {
  if (!token) {
    return null;
  }

  const [role, expiresAtRaw, signature] = token.split(":");

  if ((role !== "admin" && role !== "owner") || !expiresAtRaw || !signature) {
    return null;
  }

  const payload = `${role}:${expiresAtRaw}`;
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

  return role;
}

export function resolvePrivateAccessRoleFromCode(code: string): PrivateAccessRole | null {
  const normalized = code.trim();

  if (!normalized) {
    return null;
  }

  if (env.LESSONFORGE_OWNER_ACCESS_CODE && normalized === env.LESSONFORGE_OWNER_ACCESS_CODE) {
    return "owner";
  }

  if (env.LESSONFORGE_ADMIN_ACCESS_CODE && normalized === env.LESSONFORGE_ADMIN_ACCESS_CODE) {
    return "admin";
  }

  return null;
}

export function isPrivateAccessConfigured() {
  return Boolean(env.LESSONFORGE_OWNER_ACCESS_CODE || env.LESSONFORGE_ADMIN_ACCESS_CODE);
}

export async function getPrivateAccessRole(): Promise<PrivateAccessRole | null> {
  const cookieStore = await cookies();
  return readTokenRole(cookieStore.get(PRIVATE_ACCESS_COOKIE)?.value);
}

export function buildPrivateAccessCookieValue(role: PrivateAccessRole) {
  const expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 30;
  return createToken(role, expiresAt);
}

export function getAllowedViewerRoles(accessRole: PrivateAccessRole | null): ViewerRole[] {
  if (accessRole === "owner") {
    return ["buyer", "seller", "admin", "owner"];
  }

  if (accessRole === "admin") {
    return ["buyer", "seller", "admin"];
  }

  return ["buyer", "seller"];
}

export function canAccessAdmin(accessRole: PrivateAccessRole | null) {
  return accessRole === "admin" || accessRole === "owner";
}

export function canAccessOwner(accessRole: PrivateAccessRole | null) {
  return accessRole === "owner";
}
