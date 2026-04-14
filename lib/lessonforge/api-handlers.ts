import { planConfig, type PlanKey } from "@/lib/config/plans";
import { calculateMarketplaceSplit } from "@/lib/domain/marketplace";
import {
  findExistingOpenReport,
  findExistingReview,
  findExistingSubmittedRefundRequest,
  findOrderById,
  hasVerifiedPurchase,
  orderBelongsToBuyer,
} from "@/lib/lessonforge/marketplace-rules";
import type {
  PersistenceReadiness,
  PersistenceReadinessError,
} from "@/lib/lessonforge/persistence-readiness-contract";
import { getAiCreditCost } from "@/lib/services/ai/credits";
import type {
  AdminAiSettings,
  AIProviderResult,
  OrderRecord,
  ProductRecord,
  RefundRequestRecord,
  ReportRecord,
  ReviewRecord,
  ViewerRole,
} from "@/types";

type StandardsScanBody = {
  sellerId?: string;
  sellerEmail?: string;
  sellerPlanKey?: PlanKey;
  title?: string;
  excerpt?: string;
  provider?: "openai" | "gemini";
  idempotencyKey?: string;
};

type ModerationBody = {
  productId?: string;
  productStatus?: NonNullable<ProductRecord["productStatus"]>;
  moderationFeedback?: string;
};

type ReviewBody = {
  productId?: string;
  productTitle?: string;
  rating?: number;
  title?: string;
  body?: string;
  buyerName?: string;
  buyerEmail?: string;
};

type RefundRequestBody = {
  orderId?: string;
  productId?: string;
  productTitle?: string;
  buyerName?: string;
  buyerEmail?: string;
  sellerName?: string;
  reason?: string;
};

type RefundPatchBody = {
  refundRequestId?: string;
  status?: NonNullable<RefundRequestRecord["status"]>;
  adminResolutionNote?: string;
};

type ReportBody = {
  report?: ReportRecord;
};

type ReportPatchBody = {
  reportId?: string;
  status?: NonNullable<ReportRecord["status"]>;
  adminResolutionNote?: string;
};

type PurchaseBody = {
  productId?: string;
  productTitle?: string;
  buyerName?: string;
  buyerEmail?: string;
  sellerName?: string;
  sellerId?: string;
  sellerPlanKey?: PlanKey;
  amountCents?: number;
};

type HandlerResponse<T> = {
  status: number;
  body: T;
};

type StandardsScanDeps = {
  getAdminAiSettings: () => Promise<AdminAiSettings>;
  findAiActionCacheEntry?: (input: {
    sellerId: string;
    action: "standardsScan";
    provider: "openai" | "gemini";
    cacheKey: string;
  }) => Promise<{ result: AIProviderResult } | null>;
  saveAiActionCacheEntry?: (input: {
    sellerId: string;
    action: "standardsScan";
    provider: "openai" | "gemini";
    cacheKey: string;
    result: AIProviderResult;
  }) => Promise<unknown>;
  consumeCredits: (input: {
    sellerId: string;
    sellerEmail: string;
    planKey: PlanKey;
    monthlyCredits: number;
    action: "standardsScan";
    creditsUsed: number;
    provider: "openai" | "gemini";
    idempotencyKey: string;
  }) => Promise<{ subscription: { availableCredits: number } }>;
  refundCredits: (idempotencyKey: string) => Promise<unknown>;
  mapStandardsWithOpenAI: (input: {
    title: string;
    excerpt: string;
  }) => Promise<AIProviderResult>;
  mapStandardsWithGemini: (input: {
    title: string;
    excerpt: string;
  }) => Promise<AIProviderResult>;
};

type ProductModerationDeps = {
  updateProductStatus: (
    productId: string,
    productStatus: NonNullable<ProductRecord["productStatus"]>,
    moderationFeedback?: string,
  ) => Promise<ProductRecord>;
};

type ReviewDeps = {
  listOrders: () => Promise<OrderRecord[]>;
  listReviews: () => Promise<ReviewRecord[]>;
  saveReview: (review: ReviewRecord) => Promise<ReviewRecord>;
};

type RefundRequestDeps = {
  listOrders: () => Promise<OrderRecord[]>;
  listRefundRequests: () => Promise<RefundRequestRecord[]>;
  saveRefundRequest: (refundRequest: RefundRequestRecord) => Promise<RefundRequestRecord>;
  updateRefundRequestStatus: (
    refundRequestId: string,
    status: NonNullable<RefundRequestRecord["status"]>,
    adminResolutionNote?: string,
  ) => Promise<RefundRequestRecord>;
};

type ReportDeps = {
  listReports: () => Promise<ReportRecord[]>;
  saveReport: (report: ReportRecord) => Promise<ReportRecord>;
  updateReportStatus: (
    reportId: string,
    status: NonNullable<ReportRecord["status"]>,
    adminResolutionNote?: string,
  ) => Promise<ReportRecord>;
};

type PurchaseDeps = {
  saveOrder: (order: OrderRecord) => Promise<OrderRecord>;
};

type PersistenceReadinessDeps = {
  getPersistenceReadiness: () => Promise<PersistenceReadiness>;
};

export async function handleStandardsScanRequest(
  body: StandardsScanBody,
  deps: StandardsScanDeps,
): Promise<
  HandlerResponse<
    | { error: string }
    | { mapping: AIProviderResult; availableCredits: number; cost: number }
  >
> {
  if (
    !body.sellerId ||
    !body.sellerEmail ||
    !body.sellerPlanKey ||
    !body.title ||
    !body.provider ||
    !body.idempotencyKey
  ) {
    return {
      status: 400,
      body: { error: "Missing AI scan details." },
    };
  }

  const plan = planConfig[body.sellerPlanKey];
  const cost = getAiCreditCost("standardsScan");
  const aiSettings = await deps.getAdminAiSettings();
  const cached = deps.findAiActionCacheEntry
    ? await deps.findAiActionCacheEntry({
        sellerId: body.sellerId,
        action: "standardsScan",
        provider: body.provider,
        cacheKey: body.idempotencyKey,
      })
    : null;

  if (cached) {
    return {
      status: 200,
      body: {
        mapping: cached.result,
        availableCredits: (
          await deps.consumeCredits({
            sellerId: body.sellerId,
            sellerEmail: body.sellerEmail,
            planKey: body.sellerPlanKey,
            monthlyCredits: plan.availableCredits,
            action: "standardsScan",
            creditsUsed: cost,
            provider: body.provider,
            idempotencyKey: body.idempotencyKey,
          })
        ).subscription.availableCredits,
        cost,
      },
    };
  }

  if (aiSettings.aiKillSwitchEnabled) {
    return {
      status: 503,
      body: {
        error: "AI is temporarily unavailable while the admin kill switch is enabled.",
      },
    };
  }

  try {
    const usage = await deps.consumeCredits({
      sellerId: body.sellerId,
      sellerEmail: body.sellerEmail,
      planKey: body.sellerPlanKey,
      monthlyCredits: plan.availableCredits,
      action: "standardsScan",
      creditsUsed: cost,
      provider: body.provider,
      idempotencyKey: body.idempotencyKey,
    });

    const mapping =
      body.provider === "openai"
        ? await deps.mapStandardsWithOpenAI({
            title: body.title,
            excerpt: body.excerpt || "",
          })
        : await deps.mapStandardsWithGemini({
            title: body.title,
            excerpt: body.excerpt || "",
          });

    if (deps.saveAiActionCacheEntry) {
      await deps.saveAiActionCacheEntry({
        sellerId: body.sellerId,
        action: "standardsScan",
        provider: body.provider,
        cacheKey: body.idempotencyKey,
        result: mapping,
      });
    }

    return {
      status: 200,
      body: {
        mapping,
        availableCredits: usage.subscription.availableCredits,
        cost,
      },
    };
  } catch (error) {
    await deps.refundCredits(body.idempotencyKey);

    return {
      status: 500,
      body: {
        error:
          error instanceof Error ? error.message : "Unable to complete AI scan.",
      },
    };
  }
}

export async function handleProductModerationRequest(
  body: ModerationBody,
  deps: ProductModerationDeps,
): Promise<HandlerResponse<{ error: string } | { product: ProductRecord }>> {
  if (!body.productId || !body.productStatus) {
    return {
      status: 400,
      body: { error: "Product id and status are required." },
    };
  }

  try {
    const product = await deps.updateProductStatus(
      body.productId,
      body.productStatus,
      body.moderationFeedback,
    );

    return {
      status: 200,
      body: { product },
    };
  } catch (error) {
    return {
      status: 500,
      body: {
        error:
          error instanceof Error
            ? error.message
            : "Unable to update product status.",
      },
    };
  }
}

export async function handleReviewRequest(
  body: ReviewBody,
  deps: ReviewDeps,
): Promise<HandlerResponse<{ error: string } | { review: ReviewRecord }>> {
  if (
    !body.productId ||
    !body.productTitle ||
    !body.rating ||
    !body.buyerName ||
    !body.buyerEmail
  ) {
    return {
      status: 400,
      body: { error: "Missing review details." },
    };
  }

  try {
    const orders = await deps.listOrders();
    const purchased = hasVerifiedPurchase(orders, body.productId, body.buyerEmail);

    if (!purchased) {
      return {
        status: 403,
        body: { error: "Only verified purchasers can leave a review." },
      };
    }

    const existingReviews = await deps.listReviews();
    const existingReview = findExistingReview(
      existingReviews,
      body.productId,
      body.buyerName,
      body.buyerEmail,
    );

    if (existingReview) {
      return {
        status: 200,
        body: { review: existingReview },
      };
    }

    const review = await deps.saveReview({
      id: `review-${Date.now()}`,
      productId: body.productId,
      productTitle: body.productTitle,
      rating: body.rating,
      title: body.title || "Verified purchase review",
      body: body.body || "",
      buyerName: body.buyerName,
      buyerEmail: body.buyerEmail,
      verifiedPurchase: true,
      createdAt: new Date().toISOString(),
    });

    return {
      status: 200,
      body: { review },
    };
  } catch (error) {
    return {
      status: 500,
      body: {
        error: error instanceof Error ? error.message : "Unable to save review.",
      },
    };
  }
}

export async function handleRefundRequestCreate(
  body: RefundRequestBody,
  deps: RefundRequestDeps,
): Promise<HandlerResponse<{ error: string } | { refundRequest: RefundRequestRecord }>> {
  if (
    !body.orderId ||
    !body.productId ||
    !body.productTitle ||
    !body.buyerName ||
    !body.buyerEmail ||
    !body.sellerName ||
    !body.reason
  ) {
    return {
      status: 400,
      body: { error: "Missing refund request details." },
    };
  }

  try {
    const orders = await deps.listOrders();
    const matchingOrder = findOrderById(orders, body.orderId);

    if (!matchingOrder) {
      return {
        status: 404,
        body: { error: "Order not found for refund request." },
      };
    }

    if (!orderBelongsToBuyer(matchingOrder, body.buyerEmail)) {
      return {
        status: 403,
        body: { error: "This order does not belong to the current buyer." },
      };
    }

    const existingRefundRequests = await deps.listRefundRequests();
    const existingRequest = findExistingSubmittedRefundRequest(
      existingRefundRequests,
      body.orderId,
    );

    if (existingRequest) {
      return {
        status: 200,
        body: { refundRequest: existingRequest },
      };
    }

    const refundRequest = await deps.saveRefundRequest({
      id: `refund-${Date.now()}`,
      orderId: body.orderId,
      productId: body.productId,
      productTitle: body.productTitle,
      buyerName: body.buyerName,
      buyerEmail: body.buyerEmail,
      sellerName: body.sellerName,
      reason: body.reason,
      status: "Submitted",
      requestedAt: new Date().toISOString(),
    });

    return {
      status: 200,
      body: { refundRequest },
    };
  } catch (error) {
    return {
      status: 500,
      body: {
        error:
          error instanceof Error
            ? error.message
            : "Unable to create refund request.",
      },
    };
  }
}

export async function handleRefundRequestPatch(
  body: RefundPatchBody,
  deps: RefundRequestDeps,
): Promise<HandlerResponse<{ error: string } | { refundRequest: RefundRequestRecord }>> {
  if (!body.refundRequestId || !body.status) {
    return {
      status: 400,
      body: { error: "Refund request id and status are required." },
    };
  }

  try {
    const refundRequest = await deps.updateRefundRequestStatus(
      body.refundRequestId,
      body.status,
      body.adminResolutionNote,
    );

    return {
      status: 200,
      body: { refundRequest },
    };
  } catch (error) {
    return {
      status: 500,
      body: {
        error:
          error instanceof Error
            ? error.message
            : "Unable to update refund request.",
      },
    };
  }
}

export async function handleReportCreate(
  body: ReportBody,
  deps: ReportDeps,
): Promise<HandlerResponse<{ error: string } | { report: ReportRecord }>> {
  if (
    !body.report?.productId ||
    !body.report?.productTitle ||
    !body.report?.reporterEmail ||
    !body.report?.category ||
    !body.report?.details
  ) {
    return {
      status: 400,
      body: { error: "Missing report details." },
    };
  }

  try {
    const reports = await deps.listReports();
    const existing = findExistingOpenReport(
      reports,
      body.report.productId,
      body.report.reporterEmail,
    );

    if (existing) {
      return {
        status: 200,
        body: { report: existing },
      };
    }

    const report = await deps.saveReport(body.report);
    return {
      status: 200,
      body: { report },
    };
  } catch (error) {
    return {
      status: 500,
      body: {
        error:
          error instanceof Error ? error.message : "Unable to submit report.",
      },
    };
  }
}

export async function handleReportPatch(
  body: ReportPatchBody,
  deps: ReportDeps,
): Promise<HandlerResponse<{ error: string } | { report: ReportRecord }>> {
  if (!body.reportId || !body.status) {
    return {
      status: 400,
      body: { error: "Report id and status are required." },
    };
  }

  try {
    const report = await deps.updateReportStatus(
      body.reportId,
      body.status,
      body.adminResolutionNote,
    );

    return {
      status: 200,
      body: { report },
    };
  } catch (error) {
    return {
      status: 500,
      body: {
        error:
          error instanceof Error ? error.message : "Unable to update report.",
      },
    };
  }
}

export async function handlePurchaseRequest(
  body: PurchaseBody,
  deps: PurchaseDeps,
): Promise<HandlerResponse<{ error: string } | { order: OrderRecord }>> {
  if (
    !body.productId ||
    !body.productTitle ||
    !body.buyerName ||
    !body.buyerEmail ||
    !body.sellerName ||
    !body.amountCents
  ) {
    return {
      status: 400,
      body: { error: "Missing purchase details." },
    };
  }

  try {
    const split = calculateMarketplaceSplit(
      body.amountCents,
      body.sellerPlanKey ?? "starter",
    );

    const order = await deps.saveOrder({
      id: `order-${Date.now()}`,
      productId: body.productId,
      productTitle: body.productTitle,
      buyerName: body.buyerName,
      buyerEmail: body.buyerEmail,
      sellerName: body.sellerName,
      sellerId: body.sellerId || body.sellerName,
      amountCents: body.amountCents,
      sellerShareCents: split.sellerCents,
      platformShareCents: split.platformCents,
      paymentStatus: "paid",
      versionLabel: "Version 1",
      accessType: "Download + linked asset",
      updatedLabel: "Current version",
      instructions:
        "Download the included files from your library. Linked Google assets can be opened from the same screen.",
      purchasedAt: new Date().toISOString(),
    });

    return {
      status: 200,
      body: { order },
    };
  } catch (error) {
    return {
      status: 500,
      body: {
        error:
          error instanceof Error
            ? error.message
            : "Unable to complete purchase.",
      },
    };
  }
}

export async function handlePersistenceReadinessRequest(
  viewerRole: ViewerRole,
  deps: PersistenceReadinessDeps,
): Promise<HandlerResponse<PersistenceReadinessError | PersistenceReadiness>> {
  if (viewerRole !== "admin" && viewerRole !== "owner") {
    return {
      status: 403,
      body: { error: "Admin access required." },
    };
  }

  try {
    const readiness = await deps.getPersistenceReadiness();

    return {
      status: 200,
      body: readiness,
    };
  } catch (error) {
    return {
      status: 500,
      body: {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load persistence readiness.",
      },
    };
  }
}
