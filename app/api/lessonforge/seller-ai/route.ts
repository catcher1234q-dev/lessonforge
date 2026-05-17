import { NextResponse } from "next/server";

import { hasAppSessionForEmail } from "@/lib/auth/app-session";
import { getAuthenticatedAccountEmail, getOwnerAccessContext } from "@/lib/auth/owner-access";
import { getCurrentViewer } from "@/lib/auth/viewer";
import type { PlanKey } from "@/lib/config/plans";
import { listSellerProfiles } from "@/lib/lessonforge/data-access";
import { getSellerAiOverview } from "@/lib/lessonforge/server-operations";

export async function GET(request: Request) {
  const [viewer, authenticatedEmail, ownerAccess, sellerProfiles] = await Promise.all([
    getCurrentViewer(),
    getAuthenticatedAccountEmail(),
    getOwnerAccessContext(),
    listSellerProfiles(),
  ]);
  const url = new URL(request.url);
  const sellerId = url.searchParams.get("sellerId");
  const sellerEmail = url.searchParams.get("sellerEmail");
  const sellerPlanKey = url.searchParams.get("sellerPlanKey") as PlanKey | null;

  if (!sellerId || !sellerEmail) {
    return NextResponse.json(
      { error: "Missing seller id or email." },
      { status: 400 },
    );
  }

  if (!authenticatedEmail || !(await hasAppSessionForEmail(authenticatedEmail))) {
    return NextResponse.json({ error: "Signed-in seller access required." }, { status: 401 });
  }

  const normalizedAuthenticatedEmail = authenticatedEmail.trim().toLowerCase();
  const matchingSellerProfile = sellerProfiles.find(
    (profile) => profile.email.trim().toLowerCase() === normalizedAuthenticatedEmail,
  );
  const hasSellerWorkspaceAccess =
    viewer.role === "seller" ||
    viewer.role === "admin" ||
    viewer.role === "owner" ||
    ownerAccess.isOwner ||
    Boolean(matchingSellerProfile);

  if (!hasSellerWorkspaceAccess) {
    return NextResponse.json({ error: "Seller access required." }, { status: 403 });
  }

  if (
    !ownerAccess.isOwner &&
    sellerId.trim().toLowerCase() !== normalizedAuthenticatedEmail &&
    sellerEmail.trim().toLowerCase() !== normalizedAuthenticatedEmail
  ) {
    return NextResponse.json(
      { error: "You can only view AI details for your own seller account." },
      { status: 403 },
    );
  }

  const overview = await getSellerAiOverview(
    sellerId,
    sellerEmail,
    sellerPlanKey ?? undefined,
  );
  return NextResponse.json(overview);
}
