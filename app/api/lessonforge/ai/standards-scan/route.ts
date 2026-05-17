import { NextResponse } from "next/server";

import { mapStandardsWithGemini, mapStandardsWithOpenAI } from "@/lib/ai/providers";
import type { UploadedAiSource } from "@/lib/ai/providers";
import { hasAppSessionForEmail } from "@/lib/auth/app-session";
import { getAuthenticatedAccountEmail, getOwnerAccessContext } from "@/lib/auth/owner-access";
import { getCurrentViewer } from "@/lib/auth/viewer";
import type { PlanKey } from "@/lib/config/plans";
import { handleStandardsScanRequest } from "@/lib/lessonforge/api-handlers";
import { classifyAiRouteError } from "@/lib/lessonforge/ai-route-errors";
import {
  consumeCredits,
  findAiActionCacheEntry,
  getAdminAiSettings,
  refundCredits,
  saveAiActionCacheEntry,
  listSellerProfiles,
} from "@/lib/lessonforge/data-access";

export async function POST(request: Request) {
  try {
    const [viewer, authenticatedEmail, ownerAccess, sellerProfiles] = await Promise.all([
      getCurrentViewer(),
      getAuthenticatedAccountEmail(),
      getOwnerAccessContext(),
      listSellerProfiles(),
    ]);
    const body = (await request.json()) as {
      sellerId?: string;
      sellerEmail?: string;
      sellerPlanKey?: PlanKey;
      title?: string;
      excerpt?: string;
      upload?: UploadedAiSource;
      provider?: "openai" | "gemini";
      idempotencyKey?: string;
    };

    if (!authenticatedEmail || !(await hasAppSessionForEmail(authenticatedEmail))) {
      console.info("[lessonforge.ai] seller access rejected", {
        reason: "missing_app_session",
        sellerId: body.sellerId || null,
      });
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
      console.info("[lessonforge.ai] seller access rejected", {
        reason: "viewer_role_forbidden",
        viewerRole: viewer.role,
        authenticatedEmail,
        sellerId: body.sellerId || null,
      });
      return NextResponse.json({ error: "Seller access required." }, { status: 403 });
    }

    if (
      !ownerAccess.isOwner &&
      body.sellerId &&
      body.sellerId.trim().toLowerCase() !== normalizedAuthenticatedEmail &&
      body.sellerEmail?.trim().toLowerCase() !== normalizedAuthenticatedEmail
    ) {
      console.info("[lessonforge.ai] seller access rejected", {
        reason: "seller_ownership_mismatch",
        authenticatedEmail,
        sellerId: body.sellerId,
        sellerEmail: body.sellerEmail,
      });
      return NextResponse.json(
        { error: "You can only run AI for your own seller account." },
        { status: 403 },
      );
    }

    const response = await handleStandardsScanRequest(body, {
      getAdminAiSettings,
      ownerBypassCredits: ownerAccess.isOwner,
      findAiActionCacheEntry,
      saveAiActionCacheEntry,
      consumeCredits,
      refundCredits,
      mapStandardsWithOpenAI,
      mapStandardsWithGemini,
    });

    return NextResponse.json(response.body, { status: response.status });
  } catch (error) {
    const classified = classifyAiRouteError(error);

    console.error("[lessonforge.ai] standards-scan route crashed", {
      reason: classified.reason,
      message: error instanceof Error ? error.message : "Unknown route error",
    });

    return NextResponse.json(
      { error: classified.userMessage },
      { status: classified.status },
    );
  }
}
