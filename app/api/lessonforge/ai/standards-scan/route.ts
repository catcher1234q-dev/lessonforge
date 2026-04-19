import { NextResponse } from "next/server";

import { mapStandardsWithGemini, mapStandardsWithOpenAI } from "@/lib/ai/providers";
import type { UploadedAiSource } from "@/lib/ai/providers";
import { hasAppSessionForEmail } from "@/lib/auth/app-session";
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
} from "@/lib/lessonforge/data-access";

export async function POST(request: Request) {
  try {
    const viewer = await getCurrentViewer();
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

    if (viewer.role === "seller" && body.sellerId && body.sellerId !== viewer.email && body.sellerEmail !== viewer.email) {
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

    const response = await handleStandardsScanRequest(body, {
      getAdminAiSettings,
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
