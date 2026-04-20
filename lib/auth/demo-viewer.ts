import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";

import {
  canAccessAdmin,
  canAccessOwner,
  getPrivateAccessRole,
} from "@/lib/auth/private-access";
import { hasOwnerPlatformAccess } from "@/lib/auth/owner-access";
import { env } from "@/lib/config/env";
import type { Viewer, ViewerRole } from "@/types";

export const VIEWER_COOKIE = "lessonforge-viewer";

export const VIEWERS: Record<ViewerRole, Viewer> = {
  buyer: {
    role: "buyer",
    name: "Jordan Teacher",
    email: "buyer@lessonforge.demo",
  },
  seller: {
    role: "seller",
    name: "Avery Johnson",
    email: "avery@lessonforge.demo",
    sellerDisplayName: "Avery Johnson",
  },
  admin: {
    role: "admin",
    name: "LessonForge Admin",
    email: "admin@lessonforge.demo",
  },
  owner: {
    role: "owner",
    name: "LessonForge Owner",
    email: "owner@lessonforge.demo",
  },
};

function getSigningSecret() {
  return (
    env.LESSONFORGE_ACCESS_COOKIE_SECRET ||
    env.LESSONFORGE_OWNER_ACCESS_CODE ||
    env.LESSONFORGE_ADMIN_ACCESS_CODE ||
    "lessonforge-local-viewer-session"
  );
}

function signPayload(payload: string) {
  return createHmac("sha256", getSigningSecret()).update(payload).digest("hex");
}

function isViewerRole(value: unknown): value is ViewerRole {
  return value === "buyer" || value === "seller" || value === "admin" || value === "owner";
}

export function getDefaultViewer() {
  return VIEWERS.buyer;
}

export function buildViewerCookieValue(viewer: Viewer) {
  const payload = JSON.stringify(viewer);
  return `${payload}.${signPayload(payload)}`;
}

function readViewerCookieValue(token?: string | null): Viewer | null {
  if (!token) {
    return null;
  }

  const lastSeparatorIndex = token.lastIndexOf(".");

  if (lastSeparatorIndex <= 0) {
    return null;
  }

  const payload = token.slice(0, lastSeparatorIndex);
  const signature = token.slice(lastSeparatorIndex + 1);
  const expectedSignature = signPayload(payload);

  try {
    if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return null;
    }
  } catch {
    return null;
  }

  try {
    const parsed = JSON.parse(payload) as Partial<Viewer>;

    if (!isViewerRole(parsed.role) || !parsed.email || !parsed.name) {
      return null;
    }

    return {
      role: parsed.role,
      email: parsed.email,
      name: parsed.name,
      sellerDisplayName: parsed.sellerDisplayName,
    };
  } catch {
    return null;
  }
}

export async function getCurrentViewer(): Promise<Viewer> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(VIEWER_COOKIE)?.value;
  const privateAccessRole = await getPrivateAccessRole();

  if (!raw) {
    return getDefaultViewer();
  }

  const resolvedViewer = readViewerCookieValue(raw);

  if (!resolvedViewer) {
    return getDefaultViewer();
  }

  if (resolvedViewer.role === "owner" && !canAccessOwner(privateAccessRole)) {
    return getDefaultViewer();
  }

  if (resolvedViewer.role === "admin" && !canAccessAdmin(privateAccessRole)) {
    return getDefaultViewer();
  }

  if (
    process.env.NODE_ENV === "production" &&
    (resolvedViewer.role === "admin" || resolvedViewer.role === "owner") &&
    !(await hasOwnerPlatformAccess())
  ) {
    return getDefaultViewer();
  }

  return resolvedViewer;
}

export const DEMO_VIEWER_COOKIE = VIEWER_COOKIE;
export const DEMO_VIEWERS = VIEWERS;
export const getDefaultDemoViewer = getDefaultViewer;
export const getCurrentDemoViewer = getCurrentViewer;
