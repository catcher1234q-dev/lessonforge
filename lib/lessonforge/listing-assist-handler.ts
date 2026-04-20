import {
  type ListingAssistResult,
  suggestListingWithGemini,
  suggestListingWithOpenAI,
  type UploadedAiSource,
} from "@/lib/ai/providers";
import { type PlanKey, planConfig } from "@/lib/config/plans";
import { classifyAiRouteError } from "@/lib/lessonforge/ai-route-errors";
import { getAiCreditCost } from "@/lib/services/ai/credits";

export type ListingAssistAction = "autofill" | "title" | "description" | "tags";

export type ListingAssistRequestBody = {
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

export type ListingAssistResponse =
  | { error: string }
  | { suggestion: ListingAssistResult; availableCredits: number; cost: number };

type ListingAssistDeps = {
  getAdminAiSettings: () => Promise<{
    aiKillSwitchEnabled: boolean;
    warningThresholds: { starter: number; basic: number; pro: number };
    updatedAt: string;
  }>;
  ownerBypassCredits?: boolean;
  consumeCredits: (input: {
    sellerId: string;
    sellerEmail: string;
    planKey: PlanKey;
    monthlyCredits: number;
    action: "titleSuggestion" | "descriptionRewrite";
    creditsUsed: number;
    provider: "openai" | "gemini";
    idempotencyKey: string;
  }) => Promise<{ subscription: { availableCredits: number }; reservationState: "reserved" | "reused" }>;
  refundCredits: (idempotencyKey: string) => Promise<unknown>;
  findListingAssistCacheEntry: (input: {
    sellerId: string;
    action: "titleSuggestion" | "descriptionRewrite";
    provider: "openai" | "gemini";
    cacheKey: string;
  }) => Promise<{ result: ListingAssistResult } | null>;
  saveListingAssistCacheEntry: (input: {
    sellerId: string;
    action: "titleSuggestion" | "descriptionRewrite";
    provider: "openai" | "gemini";
    cacheKey: string;
    result: ListingAssistResult;
  }) => Promise<unknown>;
  suggestListingWithOpenAI: typeof suggestListingWithOpenAI;
  suggestListingWithGemini: typeof suggestListingWithGemini;
};

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

export async function handleListingAssistRequest(
  body: ListingAssistRequestBody,
  deps: ListingAssistDeps,
): Promise<{ status: number; body: ListingAssistResponse }> {
  console.info("[lessonforge.ai] listing-assist request received", {
    sellerId: body.sellerId || null,
    action: body.action || null,
    provider: body.provider || null,
    hasUpload: Boolean(body.upload),
    uploadMimeType: body.upload?.mimeType || null,
    uploadSizeBytes: body.upload?.sizeBytes || 0,
    fileCount: body.fileNames?.length || 0,
  });

  if (
    !body.sellerId ||
    !body.sellerEmail ||
    !body.sellerPlanKey ||
    !body.provider ||
    !body.action ||
    !body.idempotencyKey
  ) {
    return {
      status: 400,
      body: { error: "Missing AI assist details." },
    };
  }

  const trimmedFileNames = (body.fileNames ?? []).map((name) => name.trim()).filter(Boolean);

  if (trimmedFileNames.length === 0) {
    return {
      status: 400,
      body: { error: "Upload a resource before running AI help." },
    };
  }

  if (trimmedFileNames.length > 10 || trimmedFileNames.join(" ").length > 500) {
    return {
      status: 400,
      body: { error: "The uploaded file summary is too large for AI help right now." },
    };
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
      return {
        status: 400,
        body: { error: "Uploaded file analysis details are incomplete." },
      };
    }
  }

  const plan = planConfig[body.sellerPlanKey];
  const costConfig = actionCostMap[body.action];
  const ownerBypassCredits = deps.ownerBypassCredits === true;
  let reservationState: "reserved" | "reused" | null = null;
  const cached = await deps.findListingAssistCacheEntry({
    sellerId: body.sellerId,
    action: costConfig.action,
    provider: body.provider,
    cacheKey: body.idempotencyKey,
  });

  if (cached) {
    const usage = ownerBypassCredits
      ? {
          subscription: { availableCredits: Number.MAX_SAFE_INTEGER },
          reservationState: "reserved" as const,
        }
      : await deps.consumeCredits({
          sellerId: body.sellerId,
          sellerEmail: body.sellerEmail,
          planKey: body.sellerPlanKey,
          monthlyCredits: plan.availableCredits,
          action: costConfig.action,
          creditsUsed: costConfig.cost,
          provider: body.provider,
          idempotencyKey: body.idempotencyKey,
        });

    return {
      status: 200,
      body: {
        suggestion: cached.result,
        availableCredits: usage.subscription.availableCredits,
        cost: costConfig.cost,
      },
    };
  }

  const aiSettings = await deps.getAdminAiSettings();

  if (aiSettings.aiKillSwitchEnabled) {
    return {
      status: 503,
      body: { error: "AI is temporarily unavailable right now." },
    };
  }

  try {
    const usage = ownerBypassCredits
      ? {
          subscription: { availableCredits: Number.MAX_SAFE_INTEGER },
          reservationState: "reserved" as const,
        }
      : await deps.consumeCredits({
          sellerId: body.sellerId,
          sellerEmail: body.sellerEmail,
          planKey: body.sellerPlanKey,
          monthlyCredits: plan.availableCredits,
          action: costConfig.action,
          creditsUsed: costConfig.cost,
          provider: body.provider,
          idempotencyKey: body.idempotencyKey,
        });
    reservationState = ownerBypassCredits ? null : usage.reservationState;

    console.info("[lessonforge.ai] ai provider started", {
      provider: body.provider,
      action: body.action,
      reservationState: usage.reservationState,
    });

    if (reservationState === "reused") {
      const reusedCached = await deps.findListingAssistCacheEntry({
        sellerId: body.sellerId,
        action: costConfig.action,
        provider: body.provider,
        cacheKey: body.idempotencyKey,
      });

      if (reusedCached) {
        return {
          status: 200,
          body: {
            suggestion: reusedCached.result,
            availableCredits: usage.subscription.availableCredits,
            cost: costConfig.cost,
          },
        };
      }

      console.info("[lessonforge.ai] duplicate request blocked while original run is in flight", {
        provider: body.provider,
        action: body.action,
        sellerId: body.sellerId,
      });

      return {
        status: 503,
        body: { error: "AI could not finish this right now. Try again." },
      };
    }

    const suggestion =
      body.provider === "openai"
        ? await deps.suggestListingWithOpenAI({
            title: body.title,
            excerpt: body.excerpt,
            fileNames: trimmedFileNames,
            subject: body.subject,
            gradeBand: body.gradeBand,
            upload: body.upload,
          })
        : await deps.suggestListingWithGemini({
            title: body.title,
            excerpt: body.excerpt,
            fileNames: trimmedFileNames,
            subject: body.subject,
            gradeBand: body.gradeBand,
            upload: body.upload,
          });

    await deps.saveListingAssistCacheEntry({
      sellerId: body.sellerId,
      action: costConfig.action,
      provider: body.provider,
      cacheKey: body.idempotencyKey,
      result: suggestion,
    });

    console.info("[lessonforge.ai] listing-assist completed", {
      provider: body.provider,
      status: suggestion.status,
      titleLength: suggestion.title.length,
      shortDescriptionLength: suggestion.shortDescription.length,
      fullDescriptionLength: suggestion.fullDescription.length,
      tagsCount: suggestion.tags.length,
    });

    return {
      status: 200,
      body: {
        suggestion,
        availableCredits: usage.subscription.availableCredits,
        cost: costConfig.cost,
      },
    };
  } catch (error) {
    const classified = classifyAiRouteError(error);

    if (reservationState === "reserved") {
      try {
        await deps.refundCredits(body.idempotencyKey);
      } catch (refundError) {
        console.error("[lessonforge.ai] listing-assist refund failed", {
          provider: body.provider,
          action: body.action,
          message: refundError instanceof Error ? refundError.message : "Unknown refund error",
        });
      }
    }

    console.error("[lessonforge.ai] listing-assist failed", {
      provider: body.provider,
      action: body.action,
      reason: classified.reason,
      message: error instanceof Error ? error.message : "Unknown error",
    });

    return {
      status: classified.status,
      body: { error: classified.userMessage },
    };
  }
}
