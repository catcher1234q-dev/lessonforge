import { NextResponse } from "next/server";

import { hasAppSessionForEmail } from "@/lib/auth/app-session";
import { getOwnerAccessContext } from "@/lib/auth/owner-access";
import { getCurrentViewer } from "@/lib/auth/viewer";
import { normalizePlanKey, planConfig } from "@/lib/config/plans";
import { classifyAiRouteError } from "@/lib/lessonforge/ai-route-errors";
import { extractPdfText } from "@/lib/lessonforge/file-text-extraction";
import { generateListingFromFileWithGemini } from "@/lib/lessonforge/gemini-listing-generator";
import { uploadProductOriginalFile } from "@/lib/lessonforge/product-file-storage";
import {
  consumeCredits,
  getAdminAiSettings,
  refundCredits,
} from "@/lib/lessonforge/data-access";
import { getAiCreditCost } from "@/lib/services/ai/credits";

export const runtime = "nodejs";

const MAX_FILE_BYTES = 20 * 1024 * 1024;
const GENERATE_LISTING_COST = getAiCreditCost("descriptionRewrite");

function buildIdempotencyKey(input: {
  sellerId: string;
  productId: string;
  fileName: string;
  fileSizeBytes: number;
  variationSeed: number;
}) {
  return [
    "generate-listing",
    input.sellerId,
    input.productId,
    input.fileName,
    String(input.fileSizeBytes),
    String(input.variationSeed),
  ].join(":");
}

export async function POST(request: Request) {
  try {
    const [viewer, ownerAccess] = await Promise.all([
      getCurrentViewer(),
      getOwnerAccessContext(),
    ]);

    if (!(await hasAppSessionForEmail(viewer.email))) {
      return NextResponse.json({ error: "Signed-in seller access required." }, { status: 401 });
    }

    if (viewer.role !== "seller" && !ownerAccess.isOwner) {
      return NextResponse.json({ error: "Seller access required." }, { status: 403 });
    }

    const formData = await request.formData();
    const productId = String(formData.get("productId") ?? "").trim();
    const sellerId = String(formData.get("sellerId") ?? "").trim();
    const sellerEmail = String(formData.get("sellerEmail") ?? "").trim();
    const sellerPlanKey = normalizePlanKey(String(formData.get("sellerPlanKey") ?? "starter"));
    const currentTitle = String(formData.get("currentTitle") ?? "").trim();
    const currentDescription = String(formData.get("currentDescription") ?? "").trim();
    const variationSeed = Number(formData.get("variationSeed") ?? "0") || 0;
    const file = formData.get("file");

    if (!(file instanceof File) || !productId || !sellerId || !sellerEmail) {
      return NextResponse.json({ error: "Missing listing generation details." }, { status: 400 });
    }

    if (
      !ownerAccess.isOwner &&
      viewer.role === "seller" &&
      sellerEmail.trim().toLowerCase() !== viewer.email.trim().toLowerCase()
    ) {
      return NextResponse.json(
        { error: "You can only generate listings for your own seller account." },
        { status: 403 },
      );
    }

    if (
      file.type !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      return NextResponse.json(
        { error: "Generate Listing From File currently supports PDF uploads only." },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: "Uploaded PDFs must stay under 20 MB." },
        { status: 400 },
      );
    }

    const aiSettings = await getAdminAiSettings();

    if (aiSettings.aiKillSwitchEnabled) {
      return NextResponse.json(
        { error: "AI is temporarily unavailable right now." },
        { status: 503 },
      );
    }

    const idempotencyKey = buildIdempotencyKey({
      sellerId,
      productId,
      fileName: file.name,
      fileSizeBytes: file.size,
      variationSeed,
    });

    const usage = ownerAccess.isOwner
      ? {
          subscription: { availableCredits: Number.MAX_SAFE_INTEGER },
          reservationState: "reserved" as const,
        }
      : await consumeCredits({
          sellerId,
          sellerEmail,
          planKey: sellerPlanKey,
          monthlyCredits: planConfig[sellerPlanKey].availableCredits,
          action: "descriptionRewrite",
          creditsUsed: GENERATE_LISTING_COST,
          provider: "gemini",
          idempotencyKey,
        });

    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const [{ textContent, pageCount }, storedFile] = await Promise.all([
        extractPdfText({ bytes }),
        uploadProductOriginalFile({ productId, file }),
      ]);

      if (!textContent.trim()) {
        if (!ownerAccess.isOwner) {
          await refundCredits(idempotencyKey);
        }
        return NextResponse.json(
          { error: "We could not read enough text from that PDF to build a listing." },
          { status: 400 },
        );
      }

      const suggestion = await generateListingFromFileWithGemini({
        fileName: file.name,
        pageCount,
        extractedText: textContent,
        currentTitle,
        currentDescription,
        variationSeed,
      });

      console.info("[lessonforge.ai] generate-listing completed", {
        sellerId,
        productId,
        fileName: file.name,
        pageCount,
        variationSeed,
      });

      return NextResponse.json({
        suggestion,
        storedFile,
        pageCount,
        availableCredits: usage.subscription.availableCredits,
      });
    } catch (error) {
      if (!ownerAccess.isOwner) {
        await refundCredits(idempotencyKey).catch(() => undefined);
      }
      throw error;
    }
  } catch (error) {
    const classified = classifyAiRouteError(error);

    console.error("[lessonforge.ai] generate-listing route crashed", {
      reason: classified.reason,
      message: error instanceof Error ? error.message : "Unknown route error",
    });

    return NextResponse.json(
      { error: classified.userMessage },
      { status: classified.status },
    );
  }
}
