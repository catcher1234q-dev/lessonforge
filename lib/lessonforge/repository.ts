import { buildStoredAssetPaths } from "@/lib/lessonforge/preview-assets";
import { normalizeProductGallery } from "@/lib/lessonforge/product-gallery";
import {
  applyAdminProductModeration,
  debitAiCredits,
  refundAiCredits,
} from "@/lib/lessonforge/workflow-rules";
import {
  prismaConsumeCredits,
  prismaListAdminAuditLogs,
  prismaListFavorites,
  prismaGetOrCreateSubscription,
  prismaListOrders,
  prismaListPersistedProducts,
  prismaListReports,
  prismaListRefundRequests,
  prismaListReviews,
  prismaListSellerProfiles,
  prismaListSubscriptions,
  prismaListUsageLedger,
  prismaRefundCredits,
  prismaSaveOrder,
  prismaSaveAdminAuditLog,
  prismaSaveProduct,
  prismaSaveReport,
  prismaSaveRefundRequest,
  prismaSaveReview,
  prismaSaveSellerProfile,
  prismaToggleFavorite,
  prismaUpdateReportStatus,
  prismaUpdateRefundRequestStatus,
  prismaUpdateProductStatus,
} from "@/lib/lessonforge/repository-prisma";
import { prisma } from "@/lib/prisma/client";
import type {
  AdminAiSettings,
  AdminAuditLog,
  AiActionCacheRecord,
  FavoriteRecord,
  MonetizationEventRecord,
  OrderRecord,
  ProductRecord,
  RefundRequestRecord,
  ReportRecord,
  ReviewRecord,
  SubscriptionRecord,
  SystemSettings,
  UsageLedgerEntry,
  ViewerRole,
  SellerProfileDraft,
} from "@/types";

type LessonForgeDb = {
  teachers: unknown[];
  activities: unknown[];
  auditLog: unknown[];
  lessonforge?: {
    sellerProfiles?: SellerProfileDraft[];
    products?: ProductRecord[];
    orders?: OrderRecord[];
    reviews?: ReviewRecord[];
    reports?: ReportRecord[];
    favorites?: FavoriteRecord[];
    refundRequests?: RefundRequestRecord[];
    subscriptions?: SubscriptionRecord[];
    usageLedger?: UsageLedgerEntry[];
    aiActionCache?: AiActionCacheRecord[];
    monetizationEvents?: MonetizationEventRecord[];
    adminAiSettings?: AdminAiSettings;
    systemSettings?: SystemSettings;
  };
};

const defaultAdminAiSettings: AdminAiSettings = {
  aiKillSwitchEnabled: false,
  warningThresholds: {
    starter: 70,
    basic: 80,
    pro: 85,
  },
  updatedAt: new Date(0).toISOString(),
};

const defaultSystemSettings: SystemSettings = {
  maintenanceModeEnabled: false,
  maintenanceMessage:
    "LessonForge is temporarily in maintenance mode while the owner applies platform updates.",
  updatedAt: new Date(0).toISOString(),
};

function shouldUsePrisma() {
  return true;
}

const strictPrismaMode = true;

async function withPrismaAutoTimeout<T>(operation: Promise<T>) {
  return operation;
}

type CreditCycleWindow = {
  startsAt: string;
  endsAt: string;
  label: string;
};

function getCurrentCreditCycle(now = new Date()): CreditCycleWindow {
  const startsAt = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const endsAt = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const label = startsAt.toLocaleString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  return {
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
    label: `${label} billing cycle`,
  };
}

function syncJsonSubscriptionCycle(
  subscription: SubscriptionRecord,
  monthlyCredits: number,
) {
  const cycle = getCurrentCreditCycle();
  const planChanged = subscription.monthlyCredits !== monthlyCredits;
  const cycleChanged = subscription.cycleLabel !== cycle.label;

  subscription.monthlyCredits = monthlyCredits;
  if (planChanged || cycleChanged) {
    subscription.availableCredits = monthlyCredits;
    subscription.cycleLabel = cycle.label;
  }

  return subscription;
}

async function readDb(): Promise<LessonForgeDb> {
  const [
    auditLog,
    sellerProfiles,
    products,
    orders,
    favorites,
    reviews,
    reports,
    refundRequests,
    subscriptions,
    usageLedger,
    systemSetting,
  ] = await Promise.all([
    prismaListAdminAuditLogs(),
    prismaListSellerProfiles(),
    prismaListPersistedProducts(),
    prismaListOrders(),
    prismaListFavorites(),
    prismaListReviews(),
    prismaListReports(),
    prismaListRefundRequests(),
    prismaListSubscriptions(),
    prismaListUsageLedger(),
    prisma.systemSetting.findFirst({
      orderBy: {
        updatedAt: "desc",
      },
    }),
  ]);

  return {
    teachers: [],
    activities: [],
    auditLog,
    lessonforge: {
      sellerProfiles,
      products,
      orders,
      reviews,
      reports,
      favorites,
      refundRequests,
      subscriptions,
      usageLedger,
      aiActionCache: [],
      monetizationEvents: [],
      adminAiSettings: defaultAdminAiSettings,
      systemSettings: systemSetting
        ? {
            maintenanceModeEnabled: systemSetting.maintenanceModeEnabled,
            maintenanceMessage:
              systemSetting.maintenanceMessage ||
              defaultSystemSettings.maintenanceMessage,
            updatedAt: systemSetting.updatedAt.toISOString(),
          }
        : defaultSystemSettings,
    },
  } satisfies LessonForgeDb;
}

async function runMutation<T>(mutator: (db: LessonForgeDb) => Promise<T>): Promise<T> {
  void mutator;
  throw new Error(
    "Legacy in-memory repository mutations were removed. Use Prisma-backed repository helpers instead.",
  );
}

export async function saveLesson(product: ProductRecord) {
  return saveProduct(product);
}




export async function listAdminAuditLogs() {
  if (shouldUsePrisma()) {
    try {
      return await prismaListAdminAuditLogs();
    } catch (error) {
      if (strictPrismaMode) {
        throw error;
      }
    }
  }

  const db = await readDb();
  return (db.auditLog ?? []) as AdminAuditLog[];
}

async function saveAdminAuditLog(input: {
  actorEmail?: string;
  actorRole?: ViewerRole;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: Record<string, unknown>;
}) {
  const nextEntry: AdminAuditLog = {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    actorEmail: input.actorEmail,
    actorRole: input.actorRole,
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId,
    metadata: input.metadata,
    createdAt: new Date().toISOString(),
  };

  if (shouldUsePrisma()) {
    try {
      return await prismaSaveAdminAuditLog(nextEntry);
    } catch (error) {
      if (strictPrismaMode) {
        throw error;
      }
    }
  }

  return runMutation(async (db) => {
    db.auditLog ??= [];
    db.auditLog.unshift(nextEntry);
    return nextEntry;
  });
}

export async function listPersistedProducts() {
  if (shouldUsePrisma()) {
    try {
      return await prismaListPersistedProducts();
    } catch (error) {
      if (strictPrismaMode) {
        throw error;
      }
    }
  }

  const db = await readDb();
  return db.lessonforge?.products ?? [];
}

export async function saveProduct(product: ProductRecord) {
  if (shouldUsePrisma()) {
    try {
      return await prismaSaveProduct(product);
    } catch (error) {
      if (strictPrismaMode) {
        throw error;
      }
    }
  }

  return runMutation(async (db) => {
    db.lessonforge ??= {
      sellerProfiles: [],
      products: [],
      orders: [],
      reviews: [],
      reports: [],
      refundRequests: [],
      subscriptions: [],
      usageLedger: [],
    };
    db.lessonforge.products ??= [];

    const assetPaths = buildStoredAssetPaths({
      productId: product.id,
      title: product.title,
      format: product.format,
    });
    const normalizedProduct: ProductRecord = {
      ...product,
      imageGallery: product.imageGallery?.length
        ? normalizeProductGallery(product.id, product.imageGallery)
        : [],
      thumbnailUrl:
        product.imageGallery?.[0]?.coverUrl ?? product.thumbnailUrl ?? assetPaths.thumbnailUrl,
      previewAssetUrls:
        product.imageGallery && product.imageGallery.length > 1
          ? normalizeProductGallery(product.id, product.imageGallery)
              .slice(1)
              .map((image) => image.previewUrl)
          : product.previewAssetUrls?.length
            ? product.previewAssetUrls
            : assetPaths.previewUrls,
      originalAssetUrl: product.originalAssetUrl ?? assetPaths.originalUrl,
      assetVersionNumber: product.assetVersionNumber ?? assetPaths.assetVersionNumber,
    };

    const existingIndex = db.lessonforge.products.findIndex(
      (entry) => entry.id === normalizedProduct.id,
    );

    if (existingIndex >= 0) {
      db.lessonforge.products[existingIndex] = normalizedProduct;
    } else {
      db.lessonforge.products.unshift(normalizedProduct);
    }

    return normalizedProduct;
  });
}

export async function listSellerProfiles() {
  if (shouldUsePrisma()) {
    try {
      return await prismaListSellerProfiles();
    } catch (error) {
      if (strictPrismaMode) {
        throw error;
      }
    }
  }

  const db = await readDb();
  return db.lessonforge?.sellerProfiles ?? [];
}

export async function saveSellerProfile(profile: SellerProfileDraft) {
  if (shouldUsePrisma()) {
    try {
      return await prismaSaveSellerProfile(profile);
    } catch (error) {
      if (strictPrismaMode) {
        throw error;
      }
    }
  }

  return runMutation(async (db) => {
    db.lessonforge ??= {
      sellerProfiles: [],
      products: [],
      orders: [],
      reviews: [],
      reports: [],
      refundRequests: [],
      subscriptions: [],
      usageLedger: [],
    };
    db.lessonforge.sellerProfiles ??= [];

    const existingIndex = db.lessonforge.sellerProfiles.findIndex(
      (entry) => entry.email === profile.email,
    );

    if (existingIndex >= 0) {
      db.lessonforge.sellerProfiles[existingIndex] = profile;
    } else {
      db.lessonforge.sellerProfiles.unshift(profile);
    }

    return profile;
  });
}

export async function listOrders(): Promise<OrderRecord[]> {
  if (shouldUsePrisma()) {
    try {
      return await withPrismaAutoTimeout(prismaListOrders());
    } catch (error) {
      if (strictPrismaMode) {
        throw error;
      }
    }
  }

  const db = await readDb();
  return db.lessonforge?.orders ?? [];
}

export async function saveOrder(order: OrderRecord) {
  if (shouldUsePrisma()) {
    try {
      return await withPrismaAutoTimeout(prismaSaveOrder(order));
    } catch (error) {
      if (strictPrismaMode) {
        throw error;
      }
    }
  }

  return runMutation(async (db) => {
    db.lessonforge ??= {
      sellerProfiles: [],
      products: [],
      orders: [],
      reviews: [],
      reports: [],
      refundRequests: [],
      subscriptions: [],
      usageLedger: [],
    };
    db.lessonforge.orders ??= [];
    const existingIndex = db.lessonforge.orders.findIndex(
      (entry) =>
        entry.id === order.id ||
        (entry.stripeCheckoutSessionId &&
          order.stripeCheckoutSessionId &&
          entry.stripeCheckoutSessionId === order.stripeCheckoutSessionId) ||
        (entry.stripePaymentIntentId &&
          order.stripePaymentIntentId &&
          entry.stripePaymentIntentId === order.stripePaymentIntentId),
    );

    if (existingIndex >= 0) {
      db.lessonforge.orders[existingIndex] = {
        ...db.lessonforge.orders[existingIndex],
        ...order,
      };
      return db.lessonforge.orders[existingIndex];
    }

    db.lessonforge.orders.unshift(order);
    return order;
  });
}

export async function listFavorites() {
  if (shouldUsePrisma()) {
    try {
      const { prismaListFavorites } = await import("@/lib/lessonforge/repository-prisma");
      return await withPrismaAutoTimeout(prismaListFavorites());
    } catch (error) {
      if (strictPrismaMode) {
        throw error;
      }
    }
  }

  const db = await readDb();
  return db.lessonforge?.favorites ?? [];
}

export async function toggleFavorite(userEmail: string, productId: string) {
  if (shouldUsePrisma()) {
    try {
      const { prismaToggleFavorite } = await import("@/lib/lessonforge/repository-prisma");
      return await withPrismaAutoTimeout(prismaToggleFavorite(userEmail, productId));
    } catch (error) {
      if (strictPrismaMode) {
        throw error;
      }
    }
  }

  return runMutation(async (db) => {
    db.lessonforge ??= {
      sellerProfiles: [],
      products: [],
      orders: [],
      reviews: [],
      reports: [],
      favorites: [],
      refundRequests: [],
      subscriptions: [],
      usageLedger: [],
    };
    db.lessonforge.favorites ??= [];

    const existingIndex = db.lessonforge.favorites.findIndex(
      (entry) => entry.userEmail === userEmail && entry.productId === productId,
    );

    if (existingIndex >= 0) {
      const removedFavorites = db.lessonforge.favorites.filter(
        (entry) => entry.userEmail === userEmail && entry.productId === productId,
      );
      db.lessonforge.favorites = db.lessonforge.favorites.filter(
        (entry) => !(entry.userEmail === userEmail && entry.productId === productId),
      );
      return { favorite: removedFavorites[0], favorited: false };
    }

    const favorite: FavoriteRecord = {
      id: `favorite-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      userEmail,
      productId,
      createdAt: new Date().toISOString(),
    };

    db.lessonforge.favorites.unshift(favorite);
    return { favorite, favorited: true };
  });
}

export async function updateProductStatus(
  productId: string,
  nextStatus: NonNullable<ProductRecord["productStatus"]>,
  moderationFeedback?: string,
  actor?: { email?: string; role?: ViewerRole },
) {
  let updatedProduct: ProductRecord | null = null;

  if (shouldUsePrisma()) {
    try {
      updatedProduct = await prismaUpdateProductStatus(
        productId,
        nextStatus,
        moderationFeedback,
        actor,
      );
    } catch (error) {
      if (strictPrismaMode) {
        throw error;
      }
    }
  }

  if (!updatedProduct) {
    updatedProduct = await runMutation(async (db) => {
      db.lessonforge ??= {
        sellerProfiles: [],
        products: [],
        orders: [],
        reviews: [],
        reports: [],
        refundRequests: [],
        subscriptions: [],
        usageLedger: [],
      };
      db.lessonforge.products ??= [];

      const product = db.lessonforge.products.find((entry) => entry.id === productId);

      if (!product) {
        throw new Error("Product not found.");
      }

      const nextProduct = applyAdminProductModeration(
        product,
        nextStatus,
        moderationFeedback,
      );

      Object.assign(product, nextProduct);

      return nextProduct;
    });
  }

  await saveAdminAuditLog({
    actorEmail: actor?.email,
    actorRole: actor?.role,
    action: "product.status.updated",
    targetType: "product",
    targetId: productId,
    metadata: {
      nextStatus,
      moderationFeedback: moderationFeedback?.trim() || null,
    },
  });

  return updatedProduct;
}

export async function listReviews() {
  if (shouldUsePrisma()) {
    try {
      return await prismaListReviews();
    } catch (error) {
      if (strictPrismaMode) {
        throw error;
      }
    }
  }

  const db = await readDb();
  return db.lessonforge?.reviews ?? [];
}

export async function listRefundRequests() {
  if (shouldUsePrisma()) {
    try {
      return await prismaListRefundRequests();
    } catch (error) {
      if (strictPrismaMode) {
        throw error;
      }
    }
  }

  const db = await readDb();
  return db.lessonforge?.refundRequests ?? [];
}

export async function listReports() {
  if (shouldUsePrisma()) {
    try {
      return await prismaListReports();
    } catch (error) {
      if (strictPrismaMode) {
        throw error;
      }
    }
  }

  const db = await readDb();
  return db.lessonforge?.reports ?? [];
}

export async function saveReview(review: ReviewRecord) {
  if (shouldUsePrisma()) {
    try {
      return await prismaSaveReview(review);
    } catch (error) {
      if (strictPrismaMode) {
        throw error;
      }
    }
  }

  return runMutation(async (db) => {
    db.lessonforge ??= {
      sellerProfiles: [],
      products: [],
      orders: [],
      reviews: [],
      reports: [],
      refundRequests: [],
      subscriptions: [],
      usageLedger: [],
    };
    db.lessonforge.reviews ??= [];
    db.lessonforge.reviews.unshift(review);
    return review;
  });
}

export async function saveRefundRequest(refundRequest: RefundRequestRecord) {
  if (shouldUsePrisma()) {
    try {
      return await prismaSaveRefundRequest(refundRequest);
    } catch (error) {
      if (strictPrismaMode) {
        throw error;
      }
    }
  }

  return runMutation(async (db) => {
    db.lessonforge ??= {
      sellerProfiles: [],
      products: [],
      orders: [],
      reviews: [],
      reports: [],
      refundRequests: [],
      subscriptions: [],
      usageLedger: [],
    };
    db.lessonforge.refundRequests ??= [];
    db.lessonforge.refundRequests.unshift(refundRequest);
    return refundRequest;
  });
}

export async function saveReport(report: ReportRecord) {
  if (shouldUsePrisma()) {
    try {
      return await prismaSaveReport(report);
    } catch (error) {
      if (strictPrismaMode) {
        throw error;
      }
    }
  }

  return runMutation(async (db) => {
    db.lessonforge ??= {
      sellerProfiles: [],
      products: [],
      orders: [],
      reviews: [],
      reports: [],
      refundRequests: [],
      subscriptions: [],
      usageLedger: [],
    };
    db.lessonforge.reports ??= [];
    db.lessonforge.reports.unshift(report);
    return report;
  });
}

export async function updateRefundRequestStatus(
  refundRequestId: string,
  nextStatus: NonNullable<RefundRequestRecord["status"]>,
  adminResolutionNote?: string,
  actor?: { email?: string; role?: ViewerRole },
) {
  let updatedRefundRequest: RefundRequestRecord | null = null;

  if (shouldUsePrisma()) {
    try {
      updatedRefundRequest = await prismaUpdateRefundRequestStatus(
        refundRequestId,
        nextStatus,
        adminResolutionNote,
        actor,
      );
    } catch (error) {
      if (strictPrismaMode) {
        throw error;
      }
    }
  }

  if (!updatedRefundRequest) {
    updatedRefundRequest = await runMutation(async (db) => {
      db.lessonforge ??= {
        sellerProfiles: [],
        products: [],
        orders: [],
        reviews: [],
        reports: [],
        refundRequests: [],
        subscriptions: [],
        usageLedger: [],
      };
      db.lessonforge.refundRequests ??= [];

      const refundRequest = db.lessonforge.refundRequests.find(
        (entry) => entry.id === refundRequestId,
      );

      if (!refundRequest) {
        throw new Error("Refund request not found.");
      }

      refundRequest.status = nextStatus;
      refundRequest.adminResolutionNote = adminResolutionNote?.trim() || undefined;

      return refundRequest;
    });
  }

  await saveAdminAuditLog({
    actorEmail: actor?.email,
    actorRole: actor?.role,
    action: "refund.status.updated",
    targetType: "refundRequest",
    targetId: refundRequestId,
    metadata: {
      nextStatus,
      adminResolutionNote: adminResolutionNote?.trim() || null,
    },
  });

  return updatedRefundRequest;
}

export async function updateReportStatus(
  reportId: string,
  nextStatus: NonNullable<ReportRecord["status"]>,
  adminResolutionNote?: string,
  actor?: { email?: string; role?: ViewerRole },
) {
  let updatedReport: ReportRecord | null = null;

  if (shouldUsePrisma()) {
    try {
      updatedReport = await prismaUpdateReportStatus(
        reportId,
        nextStatus,
        adminResolutionNote,
        actor,
      );
    } catch (error) {
      if (strictPrismaMode) {
        throw error;
      }
    }
  }

  if (!updatedReport) {
    updatedReport = await runMutation(async (db) => {
      db.lessonforge ??= {
        sellerProfiles: [],
        products: [],
        orders: [],
        reviews: [],
        reports: [],
        refundRequests: [],
        subscriptions: [],
        usageLedger: [],
      };
      db.lessonforge.reports ??= [];

      const report = db.lessonforge.reports.find((entry) => entry.id === reportId);

      if (!report) {
        throw new Error("Report not found.");
      }

      report.status = nextStatus;
      report.adminResolutionNote = adminResolutionNote?.trim() || undefined;

      return report;
    });
  }

  await saveAdminAuditLog({
    actorEmail: actor?.email,
    actorRole: actor?.role,
    action: "report.status.updated",
    targetType: "report",
    targetId: reportId,
    metadata: {
      nextStatus,
      adminResolutionNote: adminResolutionNote?.trim() || null,
    },
  });

  return updatedReport;
}

export async function listSubscriptions() {
  if (shouldUsePrisma()) {
    try {
      return await prismaListSubscriptions();
    } catch (error) {
      if (strictPrismaMode) {
        throw error;
      }
    }
  }

  const db = await readDb();
  return db.lessonforge?.subscriptions ?? [];
}

export async function listUsageLedger() {
  if (shouldUsePrisma()) {
    try {
      return await prismaListUsageLedger();
    } catch (error) {
      if (strictPrismaMode) {
        throw error;
      }
    }
  }

  const db = await readDb();
  return db.lessonforge?.usageLedger ?? [];
}

export async function listMonetizationEvents() {
  const db = await readDb();
  return db.lessonforge?.monetizationEvents ?? [];
}

export async function trackMonetizationEvent(
  input: Omit<MonetizationEventRecord, "id" | "createdAt">,
) {
  // TODO: Persist monetization events in Prisma for production analytics.
  return runMutation(async (db) => {
    db.lessonforge ??= {
      sellerProfiles: [],
      products: [],
      orders: [],
      reviews: [],
      refundRequests: [],
      subscriptions: [],
      usageLedger: [],
      aiActionCache: [],
      monetizationEvents: [],
    };
    db.lessonforge.monetizationEvents ??= [];

    const event: MonetizationEventRecord = {
      id: `monetization-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      ...input,
    };

    db.lessonforge.monetizationEvents.unshift(event);
    return event;
  });
}

export async function findAiActionCacheEntry(input: {
  sellerId: string;
  action: AiActionCacheRecord["action"];
  provider: AiActionCacheRecord["provider"];
  cacheKey: string;
}) {
  const db = await readDb();
  return (
    db.lessonforge?.aiActionCache?.find(
      (entry) =>
        entry.sellerId === input.sellerId &&
        entry.action === input.action &&
        entry.provider === input.provider &&
        entry.cacheKey === input.cacheKey,
    ) ?? null
  );
}

export async function saveAiActionCacheEntry(
  input: Omit<AiActionCacheRecord, "id" | "createdAt">,
) {
  // TODO: Persist AI action cache in Prisma so repeated AI requests do not recompute after launch.
  return runMutation(async (db) => {
    db.lessonforge ??= {
      sellerProfiles: [],
      products: [],
      orders: [],
      reviews: [],
      refundRequests: [],
      subscriptions: [],
      usageLedger: [],
      aiActionCache: [],
      monetizationEvents: [],
    };
    db.lessonforge.aiActionCache ??= [];

    const existingIndex = db.lessonforge.aiActionCache.findIndex(
      (entry) =>
        entry.sellerId === input.sellerId &&
        entry.action === input.action &&
        entry.provider === input.provider &&
        entry.cacheKey === input.cacheKey,
    );

    const entry: AiActionCacheRecord = {
      id:
        existingIndex >= 0
          ? db.lessonforge.aiActionCache[existingIndex].id
          : `ai-cache-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt:
        existingIndex >= 0
          ? db.lessonforge.aiActionCache[existingIndex].createdAt
          : new Date().toISOString(),
      ...input,
    };

    if (existingIndex >= 0) {
      db.lessonforge.aiActionCache[existingIndex] = entry;
    } else {
      db.lessonforge.aiActionCache.unshift(entry);
    }

    return entry;
  });
}

export async function getOrCreateSubscription(
  sellerId: string,
  sellerEmail: string,
  planKey: SubscriptionRecord["planKey"],
  monthlyCredits: number,
) {
  if (shouldUsePrisma()) {
    try {
      return await prismaGetOrCreateSubscription(
        sellerId,
        sellerEmail,
        planKey,
        monthlyCredits,
      );
    } catch (error) {
      if (strictPrismaMode) {
        throw error;
      }
    }
  }

  return runMutation(async (db) => {
    db.lessonforge ??= {
      sellerProfiles: [],
      products: [],
      orders: [],
      reviews: [],
      refundRequests: [],
      subscriptions: [],
      usageLedger: [],
    };
    db.lessonforge.subscriptions ??= [];

    const existing = db.lessonforge.subscriptions.find(
      (entry) => entry.sellerId === sellerId,
    );

    if (existing) {
      const planChanged = existing.planKey !== planKey;
      existing.sellerEmail = sellerEmail;
      existing.planKey = planKey;
      if (planChanged) {
        existing.availableCredits = monthlyCredits;
      }
      return syncJsonSubscriptionCycle(existing, monthlyCredits);
    }

    const cycle = getCurrentCreditCycle();
    const subscription: SubscriptionRecord = {
      sellerId,
      sellerEmail,
      planKey,
      monthlyCredits,
      availableCredits: monthlyCredits,
      cycleLabel: cycle.label,
      rolloverPolicy: "none",
    };

    db.lessonforge.subscriptions.unshift(subscription);
    return subscription;
  });
}

export async function consumeCredits(input: {
  sellerId: string;
  sellerEmail: string;
  planKey: SubscriptionRecord["planKey"];
  monthlyCredits: number;
  action: UsageLedgerEntry["action"];
  creditsUsed: number;
  provider: UsageLedgerEntry["provider"];
  idempotencyKey: string;
}) {
  if (shouldUsePrisma()) {
    try {
      return await prismaConsumeCredits(input);
    } catch (error) {
      if (strictPrismaMode) {
        throw error;
      }
    }
  }

  return runMutation(async (db) => {
    db.lessonforge ??= {
      sellerProfiles: [],
      products: [],
      orders: [],
      reviews: [],
      refundRequests: [],
      subscriptions: [],
      usageLedger: [],
    };
    db.lessonforge.subscriptions ??= [];
    db.lessonforge.usageLedger ??= [];

    const existingEntry = db.lessonforge.usageLedger.find(
      (entry) => entry.idempotencyKey === input.idempotencyKey,
    );

    if (existingEntry) {
      const existingSubscription = db.lessonforge.subscriptions.find(
        (entry) => entry.sellerId === input.sellerId,
      );

      return {
        subscription: existingSubscription!,
        ledgerEntry: existingEntry,
      };
    }

    let subscription = db.lessonforge.subscriptions.find(
      (entry) => entry.sellerId === input.sellerId,
    );

    if (!subscription) {
      const cycle = getCurrentCreditCycle();
      subscription = {
        sellerId: input.sellerId,
        sellerEmail: input.sellerEmail,
        planKey: input.planKey,
        monthlyCredits: input.monthlyCredits,
        availableCredits: input.monthlyCredits,
        cycleLabel: cycle.label,
        rolloverPolicy: "none",
      };
      db.lessonforge.subscriptions.unshift(subscription);
    }

    syncJsonSubscriptionCycle(subscription, input.monthlyCredits);

    const debited = debitAiCredits(subscription, {
      sellerId: input.sellerId,
      action: input.action,
      creditsUsed: input.creditsUsed,
      provider: input.provider,
      idempotencyKey: input.idempotencyKey,
    });

    Object.assign(subscription, debited.subscription);

    db.lessonforge.usageLedger.unshift(debited.ledgerEntry);

    return {
      subscription,
      ledgerEntry: debited.ledgerEntry,
    };
  });
}

export async function refundCredits(idempotencyKey: string) {
  if (shouldUsePrisma()) {
    try {
      return await prismaRefundCredits(idempotencyKey);
    } catch (error) {
      if (strictPrismaMode) {
        throw error;
      }
    }
  }

  return runMutation(async (db) => {
    db.lessonforge ??= {
      sellerProfiles: [],
      products: [],
      orders: [],
      reviews: [],
      refundRequests: [],
      subscriptions: [],
      usageLedger: [],
    };
    db.lessonforge.subscriptions ??= [];
    db.lessonforge.usageLedger ??= [];

    const ledgerEntry = db.lessonforge.usageLedger.find(
      (entry) => entry.idempotencyKey === idempotencyKey,
    );

    if (!ledgerEntry) {
      return null;
    }

    const subscription = db.lessonforge.subscriptions.find(
      (entry) => entry.sellerId === ledgerEntry.sellerId,
    );
    const refunded = refundAiCredits(subscription, ledgerEntry);

    if (subscription && refunded.subscription) {
      Object.assign(subscription, refunded.subscription);
    }

    if (ledgerEntry && refunded.ledgerEntry) {
      Object.assign(ledgerEntry, refunded.ledgerEntry);
    }

    return refunded.ledgerEntry;
  });
}

export async function getAdminAiSettings() {
  const db = await readDb();
  return (
    db.lessonforge?.adminAiSettings ?? defaultAdminAiSettings
  );
}

export async function updateAdminAiSettings(
  input: Partial<AdminAiSettings>,
  actor?: { email?: string; role?: ViewerRole },
) {
  return runMutation(async (db) => {
    db.lessonforge ??= {
      sellerProfiles: [],
      products: [],
      orders: [],
      reviews: [],
      reports: [],
      refundRequests: [],
      subscriptions: [],
      usageLedger: [],
      adminAiSettings: defaultAdminAiSettings,
      systemSettings: defaultSystemSettings,
    };

    const current = db.lessonforge.adminAiSettings ?? defaultAdminAiSettings;

    const nextSettings: AdminAiSettings = {
      aiKillSwitchEnabled:
        input.aiKillSwitchEnabled ?? current.aiKillSwitchEnabled,
      warningThresholds: {
        starter:
          input.warningThresholds?.starter ?? current.warningThresholds.starter,
        basic:
          input.warningThresholds?.basic ?? current.warningThresholds.basic,
        pro:
          input.warningThresholds?.pro ?? current.warningThresholds.pro,
      },
      updatedAt: new Date().toISOString(),
    };

    db.lessonforge.adminAiSettings = nextSettings;
    db.auditLog ??= [];
    db.auditLog.unshift({
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      actorEmail: actor?.email,
      actorRole: actor?.role,
      action: "ai.settings.updated",
      targetType: "system",
      targetId: "admin-ai-settings",
      metadata: {
        aiKillSwitchEnabled: nextSettings.aiKillSwitchEnabled,
        warningThresholds: nextSettings.warningThresholds,
      },
      createdAt: new Date().toISOString(),
    } satisfies AdminAuditLog);
    return nextSettings;
  });
}

export async function getSystemSettings() {
  const db = await readDb();
  return db.lessonforge?.systemSettings ?? defaultSystemSettings;
}

export async function updateSystemSettings(
  input: Partial<SystemSettings>,
  actor?: { email?: string; role?: ViewerRole },
) {
  return runMutation(async (db) => {
    db.lessonforge ??= {
      sellerProfiles: [],
      products: [],
      orders: [],
      reviews: [],
      reports: [],
      refundRequests: [],
      subscriptions: [],
      usageLedger: [],
      adminAiSettings: defaultAdminAiSettings,
      systemSettings: defaultSystemSettings,
    };

    const current = db.lessonforge.systemSettings ?? defaultSystemSettings;
    const nextSettings: SystemSettings = {
      maintenanceModeEnabled:
        input.maintenanceModeEnabled ?? current.maintenanceModeEnabled,
      maintenanceMessage:
        input.maintenanceMessage?.trim() || current.maintenanceMessage,
      updatedAt: new Date().toISOString(),
    };

    db.lessonforge.systemSettings = nextSettings;
    db.auditLog ??= [];
    db.auditLog.unshift({
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      actorEmail: actor?.email,
      actorRole: actor?.role,
      action: "system.settings.updated",
      targetType: "system",
      targetId: "system-settings",
      metadata: {
        maintenanceModeEnabled: nextSettings.maintenanceModeEnabled,
        maintenanceMessage: nextSettings.maintenanceMessage,
      },
      createdAt: new Date().toISOString(),
    } satisfies AdminAuditLog);
    return nextSettings;
  });
}
