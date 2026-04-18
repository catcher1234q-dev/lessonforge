import { NextResponse } from "next/server";

import { mapStandardsWithGemini, mapStandardsWithOpenAI } from "@/lib/ai/providers";
import type { UploadedAiSource } from "@/lib/ai/providers";
import type { PlanKey } from "@/lib/config/plans";
import { handleStandardsScanRequest } from "@/lib/lessonforge/api-handlers";
import {
  consumeCredits,
  findAiActionCacheEntry,
  getAdminAiSettings,
  refundCredits,
  saveAiActionCacheEntry,
} from "@/lib/lessonforge/data-access";

export async function POST(request: Request) {
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
}
