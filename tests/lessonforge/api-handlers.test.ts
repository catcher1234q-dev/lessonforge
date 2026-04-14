import assert from "node:assert/strict";
import test from "node:test";

import {
  handlePurchaseRequest,
  handlePersistenceReadinessRequest,
  handleProductModerationRequest,
  handleRefundRequestCreate,
  handleRefundRequestPatch,
  handleReportCreate,
  handleReportPatch,
  handleReviewRequest,
  handleStandardsScanRequest,
} from "@/lib/lessonforge/api-handlers";
import { buildPrismaCutoverReport } from "@/lib/lessonforge/prisma-cutover";
import type { PersistenceReadiness } from "@/lib/lessonforge/persistence-readiness-contract";
import type {
  AIProviderResult,
  AdminAiSettings,
  OrderRecord,
  RefundRequestRecord,
  ReportRecord,
  ProductRecord,
  ReviewRecord,
} from "@/types";

const sampleMapping: AIProviderResult = {
  provider: "openai",
  status: "success",
  message: "OpenAI demo mapping completed.",
  subject: "Math",
  suggestedStandard: "CCSS.MATH.CONTENT.4.NF.A.1",
  rationale: "Fractions focus detected.",
  confidence: "89%",
};

const sampleProduct: ProductRecord = {
  id: "product-1",
  title: "Fractions Pack",
  subject: "Math",
  gradeBand: "3-5",
  standardsTag: "CCSS.MATH.CONTENT.4.NF.A.1",
  updatedAt: "Saved just now",
  format: "PDF Resource",
  summary: "Fractions practice set.",
  demoOnly: false,
  sellerId: "seller-1",
  priceCents: 1200,
  isPurchasable: false,
  productStatus: "Draft",
};

const sampleOrder: OrderRecord = {
  id: "order-1",
  productId: "product-1",
  productTitle: "Fractions Pack",
  buyerName: "Jordan Teacher",
  buyerEmail: "buyer@example.com",
  sellerName: "Avery Studio",
  sellerId: "seller-1",
  amountCents: 1000,
  sellerShareCents: 600,
  platformShareCents: 400,
  versionLabel: "Version 1",
  accessType: "Download + linked asset",
  updatedLabel: "Current version",
  instructions: "Open from the library.",
  purchasedAt: "2026-03-31T10:00:00.000Z",
};

const sampleReview: ReviewRecord = {
  id: "review-1",
  productId: "product-1",
  productTitle: "Fractions Pack",
  rating: 5,
  title: "Great fit",
  body: "Clear and ready to use.",
  buyerName: "Jordan Teacher",
  buyerEmail: "buyer@example.com",
  verifiedPurchase: true,
  createdAt: "2026-03-31T10:05:00.000Z",
};

const sampleRefund: RefundRequestRecord = {
  id: "refund-1",
  orderId: "order-1",
  productId: "product-1",
  productTitle: "Fractions Pack",
  buyerName: "Jordan Teacher",
  buyerEmail: "buyer@example.com",
  sellerName: "Avery Studio",
  reason: "Broken file",
  status: "Submitted",
  requestedAt: "2026-03-31T11:00:00.000Z",
};

const sampleReport: ReportRecord = {
  id: "report-1",
  productId: "product-1",
  productTitle: "Fractions Pack",
  reporterName: "Jordan Teacher",
  reporterEmail: "buyer@example.com",
  category: "Access issue",
  status: "Open",
  details: "The linked file is missing.",
  createdAt: "2026-03-31T12:00:00.000Z",
};

const defaultAdminAiSettings: AdminAiSettings = {
  aiKillSwitchEnabled: false,
  warningThresholds: {
    starter: 70,
    basic: 80,
    pro: 85,
  },
  updatedAt: "2026-03-31T00:00:00.000Z",
};

const samplePersistenceReadiness: PersistenceReadiness = {
  persistenceStatus: {
    mode: "auto",
    prismaEnabled: false,
    label: "Auto mode using demo JSON",
    detail:
      "Auto mode did not find a real database URL, so the app is currently using local demo JSON storage.",
  },
  hasRealDatabaseUrl: false,
  databaseReachable: false,
  databaseError: null,
  probes: [
    {
      label: "Persistence mode configured",
      status: "waiting",
      detail:
        "The app is still in auto mode, which can fall back to JSON while the database cutover is unfinished.",
    },
  ],
  preflightReport: {
    mode: "auto",
    hasRealDatabaseUrl: false,
    databaseReachable: false,
    databaseError: null,
    summary: "The current DATABASE_URL is missing or still using the placeholder value.",
    checks: [
      {
        label: "Real DATABASE_URL configured",
        status: "blocked",
        detail: "The current DATABASE_URL is missing or still using the placeholder value.",
        command: "DATABASE_URL=postgresql://username:password@host:5432/lessonforge",
      },
    ],
  },
  cutoverReport: buildPrismaCutoverReport({
    preflightReport: {
      mode: "auto",
      hasRealDatabaseUrl: false,
      databaseReachable: false,
      databaseError: null,
      summary: "The current DATABASE_URL is missing or still using the placeholder value.",
      checks: [
        {
          label: "Real DATABASE_URL configured",
          status: "blocked",
          detail: "The current DATABASE_URL is missing or still using the placeholder value.",
          command: "DATABASE_URL=postgresql://username:password@host:5432/lessonforge",
        },
      ],
    },
  }),
  nextActions: [
    {
      label: "Real DATABASE_URL configured",
      status: "blocked",
      detail: "The current DATABASE_URL is missing or still using the placeholder value.",
      command: "DATABASE_URL=postgresql://username:password@host:5432/lessonforge",
    },
  ],
  founderSummary:
    "Database setup is still blocked. The next founder-visible step is DATABASE_URL=postgresql://username:password@host:5432/lessonforge.",
};

test("AI handler rejects missing scan details before charging credits", async () => {
  let consumed = false;

  const response = await handleStandardsScanRequest(
    {
      sellerId: "seller-1",
      sellerEmail: "seller@example.com",
      sellerPlanKey: "starter",
      provider: "openai",
      idempotencyKey: "scan-1",
    },
    {
      getAdminAiSettings: async () => defaultAdminAiSettings,
      consumeCredits: async () => {
        consumed = true;
        return { subscription: { availableCredits: 8 } };
      },
      refundCredits: async () => undefined,
      mapStandardsWithOpenAI: async () => sampleMapping,
      mapStandardsWithGemini: async () => ({ ...sampleMapping, provider: "gemini" }),
    },
  );

  assert.equal(response.status, 400);
  assert.deepEqual(response.body, { error: "Missing AI scan details." });
  assert.equal(consumed, false);
});

test("AI handler returns mapping and remaining credits on success", async () => {
  let consumedInput:
    | {
        action: "standardsScan";
        creditsUsed: number;
      }
    | null = null;

  const response = await handleStandardsScanRequest(
    {
      sellerId: "seller-1",
      sellerEmail: "seller@example.com",
      sellerPlanKey: "starter",
      title: "Fraction number line warm-up",
      excerpt: "Students model equivalent fractions on a number line.",
      provider: "openai",
      idempotencyKey: "scan-2",
    },
    {
      getAdminAiSettings: async () => defaultAdminAiSettings,
      consumeCredits: async (input) => {
        consumedInput = {
          action: input.action,
          creditsUsed: input.creditsUsed,
        };
        return { subscription: { availableCredits: 8 } };
      },
      refundCredits: async () => undefined,
      mapStandardsWithOpenAI: async () => sampleMapping,
      mapStandardsWithGemini: async () => ({ ...sampleMapping, provider: "gemini" }),
    },
  );

  assert.equal(response.status, 200);
  assert.deepEqual(consumedInput, {
    action: "standardsScan",
    creditsUsed: 2,
  });
  assert.deepEqual(response.body, {
    mapping: sampleMapping,
    availableCredits: 8,
    cost: 2,
  });
});

test("AI handler refunds credits when the upstream mapping call fails", async () => {
  const refundCalls: string[] = [];

  const response = await handleStandardsScanRequest(
    {
      sellerId: "seller-1",
      sellerEmail: "seller@example.com",
      sellerPlanKey: "basic",
      title: "Fraction number line warm-up",
      provider: "openai",
      idempotencyKey: "scan-3",
    },
    {
      getAdminAiSettings: async () => defaultAdminAiSettings,
      consumeCredits: async () => ({ subscription: { availableCredits: 98 } }),
      refundCredits: async (idempotencyKey) => {
        refundCalls.push(idempotencyKey);
      },
      mapStandardsWithOpenAI: async () => {
        throw new Error("Provider timeout");
      },
      mapStandardsWithGemini: async () => ({ ...sampleMapping, provider: "gemini" }),
    },
  );

  assert.equal(response.status, 500);
  assert.deepEqual(response.body, { error: "Provider timeout" });
  assert.deepEqual(refundCalls, ["scan-3"]);
});

test("AI handler blocks new requests when the admin kill switch is enabled", async () => {
  let consumed = false;
  let providerCalled = false;

  const response = await handleStandardsScanRequest(
    {
      sellerId: "seller-1",
      sellerEmail: "seller@example.com",
      sellerPlanKey: "basic",
      title: "Fraction number line warm-up",
      provider: "openai",
      idempotencyKey: "scan-4",
    },
    {
      getAdminAiSettings: async () => ({
        ...defaultAdminAiSettings,
        aiKillSwitchEnabled: true,
      }),
      consumeCredits: async () => {
        consumed = true;
        return { subscription: { availableCredits: 98 } };
      },
      refundCredits: async () => undefined,
      mapStandardsWithOpenAI: async () => {
        providerCalled = true;
        return sampleMapping;
      },
      mapStandardsWithGemini: async () => ({ ...sampleMapping, provider: "gemini" }),
    },
  );

  assert.equal(response.status, 503);
  assert.deepEqual(response.body, {
    error: "AI is temporarily unavailable while the admin kill switch is enabled.",
  });
  assert.equal(consumed, false);
  assert.equal(providerCalled, false);
});

test("moderation handler rejects incomplete moderation requests", async () => {
  const response = await handleProductModerationRequest(
    {
      productId: "product-1",
    },
    {
      updateProductStatus: async () => sampleProduct,
    },
  );

  assert.equal(response.status, 400);
  assert.deepEqual(response.body, {
    error: "Product id and status are required.",
  });
});

test("moderation handler returns the updated product on success", async () => {
  let call: {
    productId: string;
    productStatus: NonNullable<ProductRecord["productStatus"]>;
    moderationFeedback?: string;
  } | null = null;

  const response = await handleProductModerationRequest(
    {
      productId: "product-1",
      productStatus: "Published",
      moderationFeedback: "Looks good to publish.",
    },
    {
      updateProductStatus: async (productId, productStatus, moderationFeedback) => {
        call = { productId, productStatus, moderationFeedback };
        return {
          ...sampleProduct,
          productStatus,
          moderationFeedback,
          isPurchasable: true,
        };
      },
    },
  );

  assert.equal(response.status, 200);
  assert.deepEqual(call, {
    productId: "product-1",
    productStatus: "Published",
    moderationFeedback: "Looks good to publish.",
  });
  assert.equal("product" in response.body && response.body.product.productStatus, "Published");
});

test("moderation handler returns a server error when the update fails", async () => {
  const response = await handleProductModerationRequest(
    {
      productId: "missing-product",
      productStatus: "Rejected",
    },
    {
      updateProductStatus: async () => {
        throw new Error("Product not found.");
      },
    },
  );

  assert.equal(response.status, 500);
  assert.deepEqual(response.body, { error: "Product not found." });
});

test("persistence readiness handler blocks non-admin viewers", async () => {
  const response = await handlePersistenceReadinessRequest("buyer", {
    getPersistenceReadiness: async () => samplePersistenceReadiness,
  });

  assert.equal(response.status, 403);
  assert.deepEqual(response.body, { error: "Admin access required." });
});

test("persistence readiness handler returns the shared readiness contract for admins", async () => {
  const response = await handlePersistenceReadinessRequest("owner", {
    getPersistenceReadiness: async () => samplePersistenceReadiness,
  });

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, samplePersistenceReadiness);
  if ("cutoverReport" in response.body) {
    assert.equal(
      response.body.cutoverReport.stageHeadline,
      "Blocked before live verification",
    );
    assert.equal(
      response.body.cutoverReport.stageDescription,
      "Required database or Prisma setup is still missing before a live verification run can begin.",
    );
    assert.deepEqual(response.body.cutoverReport.detailLines, [
      "The current DATABASE_URL is missing or still using the placeholder value.",
    ]);
    assert.deepEqual(response.body.cutoverReport.runbookCommands, [
      "npm run verify:persistence:ops",
      "DATABASE_URL=postgresql://username:password@host:5432/lessonforge",
    ]);
    assert.equal(response.body.cutoverReport.runbookCommands[0], "npm run verify:persistence:ops");
    assert.deepEqual(response.body.cutoverReport.actionItems, [
      {
        label: "Real DATABASE_URL configured",
        status: "blocked",
        statusDescription: "Waiting on an earlier prerequisite.",
      },
    ]);
  }
});

test("persistence readiness handler returns a server error when loading fails", async () => {
  const response = await handlePersistenceReadinessRequest("admin", {
    getPersistenceReadiness: async () => {
      throw new Error("Probe failure");
    },
  });

  assert.equal(response.status, 500);
  assert.deepEqual(response.body, {
    error: "Probe failure",
  });
});

test("review handler rejects non-purchasers", async () => {
  const response = await handleReviewRequest(
    {
      productId: "product-1",
      productTitle: "Fractions Pack",
      rating: 5,
      buyerName: "Jordan Teacher",
      buyerEmail: "buyer@example.com",
    },
    {
      listOrders: async () => [],
      listReviews: async () => [],
      saveReview: async (review) => review,
    },
  );

  assert.equal(response.status, 403);
  assert.deepEqual(response.body, {
    error: "Only verified purchasers can leave a review.",
  });
});

test("review handler returns an existing review instead of duplicating it", async () => {
  const response = await handleReviewRequest(
    {
      productId: "product-1",
      productTitle: "Fractions Pack",
      rating: 5,
      buyerName: "Jordan Teacher",
      buyerEmail: "buyer@example.com",
    },
    {
      listOrders: async () => [sampleOrder],
      listReviews: async () => [sampleReview],
      saveReview: async (review) => review,
    },
  );

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { review: sampleReview });
});

test("refund create handler rejects requests for the wrong buyer", async () => {
  const response = await handleRefundRequestCreate(
    {
      orderId: "order-1",
      productId: "product-1",
      productTitle: "Fractions Pack",
      buyerName: "Jordan Teacher",
      buyerEmail: "other@example.com",
      sellerName: "Avery Studio",
      reason: "Broken file",
    },
    {
      listOrders: async () => [sampleOrder],
      listRefundRequests: async () => [],
      saveRefundRequest: async (refundRequest) => refundRequest,
      updateRefundRequestStatus: async () => sampleRefund,
    },
  );

  assert.equal(response.status, 403);
  assert.deepEqual(response.body, {
    error: "This order does not belong to the current buyer.",
  });
});

test("refund create handler reuses an existing submitted refund request", async () => {
  const response = await handleRefundRequestCreate(
    {
      orderId: "order-1",
      productId: "product-1",
      productTitle: "Fractions Pack",
      buyerName: "Jordan Teacher",
      buyerEmail: "buyer@example.com",
      sellerName: "Avery Studio",
      reason: "Broken file",
    },
    {
      listOrders: async () => [sampleOrder],
      listRefundRequests: async () => [sampleRefund],
      saveRefundRequest: async (refundRequest) => refundRequest,
      updateRefundRequestStatus: async () => sampleRefund,
    },
  );

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { refundRequest: sampleRefund });
});

test("refund patch handler updates status when the request is valid", async () => {
  const response = await handleRefundRequestPatch(
    {
      refundRequestId: "refund-1",
      status: "Approved",
      adminResolutionNote: "Approved after file replacement.",
    },
    {
      listOrders: async () => [],
      listRefundRequests: async () => [],
      saveRefundRequest: async (refundRequest) => refundRequest,
      updateRefundRequestStatus: async (refundRequestId, status, adminResolutionNote) => ({
        ...sampleRefund,
        id: refundRequestId,
        status,
        adminResolutionNote,
      }),
    },
  );

  assert.equal(response.status, 200);
  assert.equal("refundRequest" in response.body && response.body.refundRequest.status, "Approved");
});

test("report create handler reuses an existing open report", async () => {
  const response = await handleReportCreate(
    {
      report: sampleReport,
    },
    {
      listReports: async () => [sampleReport],
      saveReport: async (report) => report,
      updateReportStatus: async () => sampleReport,
    },
  );

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { report: sampleReport });
});

test("report patch handler validates required fields", async () => {
  const response = await handleReportPatch(
    {
      reportId: "report-1",
    },
    {
      listReports: async () => [],
      saveReport: async (report) => report,
      updateReportStatus: async () => sampleReport,
    },
  );

  assert.equal(response.status, 400);
  assert.deepEqual(response.body, {
    error: "Report id and status are required.",
  });
});

test("purchase handler uses the seller plan to calculate marketplace split", async () => {
  const response = await handlePurchaseRequest(
    {
      productId: "product-1",
      productTitle: "Fractions Pack",
      buyerName: "Jordan Teacher",
      buyerEmail: "buyer@example.com",
      sellerName: "Avery Studio",
      sellerId: "seller-1",
      sellerPlanKey: "basic",
      amountCents: 100,
    },
    {
      saveOrder: async (order: OrderRecord) => order,
    },
  );

  assert.equal(response.status, 200);
  assert.ok("order" in response.body);
  if ("order" in response.body) {
    assert.equal(response.body.order.sellerShareCents, 60);
    assert.equal(response.body.order.platformShareCents, 40);
    assert.equal(response.body.order.amountCents, 100);
    assert.equal(response.body.order.paymentStatus, "paid");
  }
});

test("purchase handler defaults to Starter pricing when no seller plan is provided", async () => {
  const response = await handlePurchaseRequest(
    {
      productId: "product-1",
      productTitle: "Fractions Pack",
      buyerName: "Jordan Teacher",
      buyerEmail: "buyer@example.com",
      sellerName: "Avery Studio",
      sellerId: "seller-1",
      amountCents: 100,
    },
    {
      saveOrder: async (order: OrderRecord) => order,
    },
  );

  assert.equal(response.status, 200);
  assert.ok("order" in response.body);
  if ("order" in response.body) {
    assert.equal(response.body.order.sellerShareCents, 50);
    assert.equal(response.body.order.platformShareCents, 50);
    assert.equal(response.body.order.paymentStatus, "paid");
  }
});
