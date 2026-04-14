import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import {
  APP_SESSION_COOKIE,
  buildAppSessionCookieValue,
  hasAppSessionForEmail,
} from "@/lib/auth/app-session";
import {
  canAccessAdmin,
  canAccessOwner,
  getAllowedViewerRoles,
  getPrivateAccessRole,
} from "@/lib/auth/private-access";
import {
  VIEWER_COOKIE,
  VIEWERS,
  buildViewerCookieValue,
  getCurrentViewer,
} from "@/lib/auth/viewer";
import type { ViewerRole } from "@/types";

const VIEWER_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function isViewerRole(value: unknown): value is ViewerRole {
  return value === "buyer" || value === "seller" || value === "admin" || value === "owner";
}

export async function GET() {
  const viewer = await getCurrentViewer();
  const accessRole = await getPrivateAccessRole();
  const signedIn =
    (viewer.role === "buyer" || viewer.role === "seller") &&
    (await hasAppSessionForEmail(viewer.email));
  return NextResponse.json({
    viewer,
    allowedRoles: getAllowedViewerRoles(accessRole),
    signedIn,
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    role?: ViewerRole;
    name?: string;
    email?: string;
    sellerDisplayName?: string;
  };
  const accessRole = await getPrivateAccessRole();

  if (!isViewerRole(body.role)) {
    return NextResponse.json({ error: "Invalid viewer role." }, { status: 400 });
  }

  if (body.role === "admin" && !canAccessAdmin(accessRole)) {
    return NextResponse.json({ error: "Private admin access is required." }, { status: 403 });
  }

  if (body.role === "owner" && !canAccessOwner(accessRole)) {
    return NextResponse.json({ error: "Private owner access is required." }, { status: 403 });
  }

  const fallbackViewer = VIEWERS[body.role];
  const viewer =
    body.role === "buyer" || body.role === "seller"
      ? {
          ...fallbackViewer,
          name: body.name?.trim() || fallbackViewer.name,
          email: body.email?.trim() || fallbackViewer.email,
          sellerDisplayName:
            body.role === "seller"
              ? body.sellerDisplayName?.trim() ||
                body.name?.trim() ||
                fallbackViewer.sellerDisplayName
              : undefined,
        }
      : fallbackViewer;
  const cookieStore = await cookies();

  cookieStore.set(VIEWER_COOKIE, buildViewerCookieValue(viewer), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: VIEWER_COOKIE_MAX_AGE_SECONDS,
  });

  if ((viewer.role === "buyer" || viewer.role === "seller") && viewer.email) {
    cookieStore.set(APP_SESSION_COOKIE, buildAppSessionCookieValue(viewer.email), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: VIEWER_COOKIE_MAX_AGE_SECONDS,
    });
  } else {
    cookieStore.delete(APP_SESSION_COOKIE);
  }

  return NextResponse.json({ viewer });
}
