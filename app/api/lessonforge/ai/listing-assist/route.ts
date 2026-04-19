import { NextResponse } from "next/server";

import {
  suggestListingWithGemini,
  suggestListingWithOpenAI,
  type UploadedAiSource,
} from "@/lib/ai/providers";
import { hasAppSessionForEmail } from "@/lib/auth/app-session";
import { getCurrentViewer } from "@/lib/auth/viewer";
import { getAiCreditCost } from "@/lib/services/ai/credits";
import { getAdminAiSettings, consumeCredits, refundCredits } from "@/lib/lessonforge/data-access";
import { planConfig, type PlanKey } from "@/lib/config/plans";

type ListingAssistAction = "autofill" | "title" | "description" | "tags";

const actionCostMap: Record<ListingAssistAction, { action: "titleSuggestion" | "descriptionRewrite"; cost: number }> = {
  autofill: {
    action: "descriptionRewrite",
    cost: getAiCreditCost("descriptionRewrite"),
  },
  title: {
    action: "titleSuggestion",
    cost: getAiCreditCost("titleSuggestion"),
  },
  description: {
    action: "descriptionRewrite",
    cost: getAiCreditCost("descriptionRewrite"),
  },
  tags: {
    action: "titleSuggestion",
    cost: getAiCreditCost("titleSuggestion"),
  },
};

export async function POST(request: Request) {
  const viewer = await getCurrentViewer();
  const body = (await request.json()) as {
    sellerId?: string;
    sellerEmail?: string;
    sellerPlanKey?: PlanKey;
    provider?: "openai" | "gemini";
    action?: ListingAssistAction;
    title?: string;
    excerpt?: string;
    subject?: string;
    gradeBand?: string;
    fileNames?: string[];
    upload?: UploadedAiSource;
    idempotencyKey?: string;
  };

  console.info("[lessonforge.ai] listing-assist request received", {
    sellerId: body.sellerId || null,
    action: body.action || null,
    provider: body.provider || null,
    hasUpload: Boolean(body.upload),
    uploadMimeType: body.upload?.mimeType || null,
    uploadSizeBytes: body.upload?.sizeBytes || 0,
    fileCount: body.fileNames?.length || 0,
  });

  if (!(await hasAppSessionForEmail(viewer.email))) {
    return NextResponse.json({ error: "Signed-in seller access required." }, { status: 401 });
  }

  if (viewer.role !== "seller" && viewer.role !== "admin" && viewer.role !== "owner") {
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
    return NextResponse.json(
      { error: "You can only run AI for your own seller account." },
      { status: 403 },
    );
  }

  const trimmedFileNames = (body.fileNames ?? []).map((name) => name.trim()).filter(Boolean);

  if (trimmedFileNames.length === 0) {
    return NextResponse.json(
      { error: "Upload a resource before running AI help." },
      { status: 400 },
    );
  }

  if (trimmedFileNames.length > 10 || trimmedFileNames.join(" ").length > 500) {
    return NextResponse.json(
      { error: "The uploaded file summary is too large for AI help right now." },
      { status: 400 },
    );
  }

  if (body.upload) {
    const isUploadValid =
      typeof body.upload.fileName === "string" &&
      body.upload.fileName.trim().length > 0 &&
      typeof body.upload.mimeType === "string" &&
      body.upload.mimeType.trim().length > 0 &&
      Number.isFinite(body.upload.sizeBytes) &&
      body.upload.sizeBytes > 0 &&
      ((typeof body.upload.textContent === "string" && body.upload.textContent.trim().length > 0) ||
        (typeof body.upload.base64Data === "string" && body.upload.base64Data.trim().length > 0));

    if (!isUploadValid) {
      return NextResponse.json(
        { error: "Uploaded file analysis details are incomplete." },
        { status: 400 },
      );
    }
  }

  const aiSettings = await getAdminAiSettings();

  if (aiSettings.aiKillSwitchEnabled) {
    return NextResponse.json(
      { error: "AI is temporarily unavailable right now." },
      { status: 503 },
    );
  }

  const plan = planConfig[body.sellerPlanKey];
  const costConfig = actionCostMap[body.action];

  try {
    const usage = await consumeCredits({
      sellerId: body.sellerId,
      sellerEmail: body.sellerEmail,
      planKey: body.sellerPlanKey,
      monthlyCredits: plan.availableCredits,
      action: costConfig.action,
      creditsUsed: costConfig.cost,
      provider: body.provider,
      idempotencyKey: body.idempotencyKey,
    });

    const suggestion =
      body.provider === "openai"
        ? await suggestListingWithOpenAI({
            title: body.title,
            excerpt: body.excerpt,
            fileNames: trimmedFileNames,
            subject: body.subject,
            gradeBand: body.gradeBand,
            upload: body.upload,
          })
        : await suggestListingWithGemini({
            title: body.title,
            excerpt: body.excerpt,
            fileNames: trimmedFileNames,
            subject: body.subject,
            gradeBand: body.gradeBand,
            upload: body.upload,
          });

    console.info("[lessonforge.ai] listing-assist completed", {
      provider: body.provider,
      status: suggestion.status,
      titleLength: suggestion.title.length,
      shortDescriptionLength: suggestion.shortDescription.length,
      fullDescriptionLength: suggestion.fullDescription.length,
      tagsCount: suggestion.tags.length,
    });

    return NextResponse.json({
      suggestion,
      availableCredits: usage.subscription.availableCredits,
      cost: costConfig.cost,
    });
  } catch (error) {
    await refundCredits(body.idempotencyKey);

    console.error("[lessonforge.ai] listing-assist failed", {
      provider: body.provider,
      action: body.action,
      message: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not generate this right now.",
      },
      { status: 500 },
    );
  }
}
