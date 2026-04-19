import { NextResponse } from "next/server";

import { hasAppSessionForEmail } from "@/lib/auth/app-session";
import { getCurrentViewer } from "@/lib/auth/viewer";
import { classifyAiRouteError } from "@/lib/lessonforge/ai-route-errors";
import {
  handleListingAssistRequest,
  type ListingAssistRequestBody,
} from "@/lib/lessonforge/listing-assist-handler";
import {
  consumeCredits,
  findListingAssistCacheEntry,
  getAdminAiSettings,
  refundCredits,
  saveListingAssistCacheEntry,
} from "@/lib/lessonforge/data-access";
import {
  suggestListingWithGemini,
  suggestListingWithOpenAI,
} from "@/lib/ai/providers";

export async function POST(request: Request) {
  try {
    const viewer = await getCurrentViewer();
    const body = (await request.json()) as ListingAssistRequestBody;

    if (!(await hasAppSessionForEmail(viewer.email))) {
      console.info("[lessonforge.ai] seller access rejected", {
        reason: "missing_app_session",
        sellerId: body.sellerId || null,
      });
      return NextResponse.json({ error: "Signed-in seller access required." }, { status: 401 });
    }

    if (viewer.role !== "seller" && viewer.role !== "admin" && viewer.role !== "owner") {
      console.info("[lessonforge.ai] seller access rejected", {
        reason: "viewer_role_forbidden",
        viewerRole: viewer.role,
        sellerId: body.sellerId || null,
      });
      return NextResponse.json({ error: "Seller access required." }, { status: 403 });
    }

    if (
      !body.sellerId ||
      !body.sellerEmail ||
      !body.sellerPlanKey ||
      !body.provider ||
      !body.action ||
      !body.idempotencyKey
    ) {
      return NextResponse.json({ error: "Missing AI assist details." }, { status: 400 });
    }

    if (viewer.role === "seller" && body.sellerId !== viewer.email && body.sellerEmail !== viewer.email) {
      console.info("[lessonforge.ai] seller access rejected", {
        reason: "seller_ownership_mismatch",
        viewerEmail: viewer.email,
        sellerId: body.sellerId,
        sellerEmail: body.sellerEmail,
      });
      return NextResponse.json(
        { error: "You can only run AI for your own seller account." },
        { status: 403 },
      );
    }

    const response = await handleListingAssistRequest(body, {
      getAdminAiSettings,
      consumeCredits,
      refundCredits,
      findListingAssistCacheEntry,
      saveListingAssistCacheEntry,
      suggestListingWithOpenAI,
      suggestListingWithGemini,
    });

    return NextResponse.json(response.body, { status: response.status });
  } catch (error) {
    const classified = classifyAiRouteError(error);

    console.error("[lessonforge.ai] listing-assist route crashed", {
      reason: classified.reason,
      message: error instanceof Error ? error.message : "Unknown route error",
    });

    return NextResponse.json(
      { error: classified.userMessage },
      { status: classified.status },
    );
  }
}
