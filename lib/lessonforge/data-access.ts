import { UserRole, type Prisma } from "@prisma/client";

import { normalizePlanKey, type PlanKey } from "@/lib/config/plans";
import {
  prismaConsumeCredits,
  prismaGetOrCreateSubscription,
  prismaListAdminAuditLogs,
  prismaListFavorites,
  prismaListOrders,
  prismaListPersistedProducts,
  prismaListRefundRequests,
  prismaListReports,
  prismaListReviews,
  prismaListSellerProfiles,
  prismaListSubscriptions,
  prismaListUsageLedger,
  prismaRefundCredits,
  prismaSaveOrder,
  prismaSaveProduct,
  prismaSaveRefundRequest,
  prismaSaveReport,
  prismaSaveReview,
  prismaSaveSellerProfile,
  prismaToggleFavorite,
  prismaUpdateProductStatus,
  prismaUpdateRefundRequestStatus,
  prismaUpdateReportStatus,
} from "@/lib/lessonforge/repository-prisma";
import { prisma } from "@/lib/prisma/client";
import type {
  AdminAiSettings,
  AiActionCacheRecord,
  AIProviderResult,
  MonetizationEventRecord,
  SellerProfileDraft,
  SubscriptionRecord,
  SystemSettings,
  ViewerRole,
} from "@/types";

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

function mapViewerRoleToUserRole(role?: ViewerRole): UserRole | undefined {
  switch (role) {
    case "owner":
      return UserRole.OWNER;
    case "admin":
      return UserRole.ADMIN;
    case "buyer":
    case "seller":
      return UserRole.USER;
    default:
      return undefined;
  }
}

async function ensureActorUser(input?: { email?: string; role?: ViewerRole }) {
  if (!input?.email) {
    return null;
  }

  const role = mapViewerRoleToUserRole(input.role) ?? UserRole.USER;

  return prisma.user.upsert({
    where: { email: input.email },
    update: {
      role,
      name: input.email.split("@")[0] ?? input.email,
    },
    create: {
      email: input.email,
      role,
      name: input.email.split("@")[0] ?? input.email,
    },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function coerceAdminAiSettings(value: unknown): AdminAiSettings | null {
  if (!isRecord(value)) {
    return null;
  }

  const warningThresholds = isRecord(value.warningThresholds)
    ? value.warningThresholds
    : null;

  if (
    typeof value.aiKillSwitchEnabled !== "boolean" ||
    !warningThresholds ||
    typeof warningThresholds.starter !== "number" ||
    typeof warningThresholds.basic !== "number" ||
    typeof warningThresholds.pro !== "number"
  ) {
    return null;
  }

  return {
    aiKillSwitchEnabled: value.aiKillSwitchEnabled,
    warningThresholds: {
      starter: warningThresholds.starter,
      basic: warningThresholds.basic,
      pro: warningThresholds.pro,
    },
    updatedAt:
      typeof value.updatedAt === "string"
        ? value.updatedAt
        : new Date().toISOString(),
  };
}

function coerceMonetizationEvent(
  entry: Awaited<ReturnType<typeof prisma.adminAuditLog.findFirst>>,
): MonetizationEventRecord | null {
  if (!entry || !isRecord(entry.metadataJson)) {
    return null;
  }

  const metadata = entry.metadataJson;

  if (
    typeof metadata.sellerId !== "string" ||
    typeof metadata.sellerEmail !== "string" ||
    typeof metadata.planKey !== "string" ||
    typeof metadata.eventType !== "string" ||
    typeof metadata.source !== "string"
  ) {
    return null;
  }

  return {
    id: entry.id,
    sellerId: metadata.sellerId,
    sellerEmail: metadata.sellerEmail,
    planKey: normalizePlanKey(metadata.planKey) as SubscriptionRecord["planKey"],
    eventType: metadata.eventType as MonetizationEventRecord["eventType"],
    source: metadata.source as MonetizationEventRecord["source"],
    metadata: isRecord(metadata.payload) ? metadata.payload : undefined,
    createdAt: entry.createdAt.toISOString(),
  };
}

export const listPersistedProducts = prismaListPersistedProducts;
export const saveProduct = prismaSaveProduct;
export const listAdminAuditLogs = prismaListAdminAuditLogs;
export const listOrders = prismaListOrders;
export const saveOrder = prismaSaveOrder;
export const listFavorites = prismaListFavorites;
export const toggleFavorite = prismaToggleFavorite;
export const listReviews = prismaListReviews;
export const saveReview = prismaSaveReview;
export const listRefundRequests = prismaListRefundRequests;
export const saveRefundRequest = prismaSaveRefundRequest;
export const updateRefundRequestStatus = prismaUpdateRefundRequestStatus;
export const listReports = prismaListReports;
export const saveReport = prismaSaveReport;
export const updateReportStatus = prismaUpdateReportStatus;
export const updateProductStatus = prismaUpdateProductStatus;
export const listSubscriptions = prismaListSubscriptions;
export const listUsageLedger = prismaListUsageLedger;
export const getOrCreateSubscription = prismaGetOrCreateSubscription;
export const consumeCredits = prismaConsumeCredits;
export const refundCredits = prismaRefundCredits;

export async function listSellerProfiles() {
  const [profiles, subscriptions] = await Promise.all([
    prismaListSellerProfiles(),
    prismaListSubscriptions().catch(() => [] as SubscriptionRecord[]),
  ]);

  const planByEmail = new Map(
    subscriptions.map((entry) => [
      entry.sellerEmail.trim().toLowerCase(),
      normalizePlanKey(entry.planKey) as SellerProfileDraft["sellerPlanKey"],
    ]),
  );

  return profiles.map((profile) => ({
    ...profile,
    sellerPlanKey:
      planByEmail.get(profile.email.trim().toLowerCase()) ??
      profile.sellerPlanKey ??
      "starter",
  }));
}

export async function saveSellerProfile(profile: SellerProfileDraft) {
  return prismaSaveSellerProfile(profile);
}

export async function saveLesson(product: Parameters<typeof prismaSaveProduct>[0]) {
  return prismaSaveProduct(product);
}

export async function getSystemSettings(): Promise<SystemSettings> {
  try {
    const record = await prisma.systemSetting.findFirst({
      orderBy: { updatedAt: "desc" },
    });

    if (!record) {
      return defaultSystemSettings;
    }

    return {
      maintenanceModeEnabled: record.maintenanceModeEnabled,
      maintenanceMessage:
        record.maintenanceMessage || defaultSystemSettings.maintenanceMessage,
      updatedAt: record.updatedAt.toISOString(),
    };
  } catch {
    return defaultSystemSettings;
  }
}

export async function updateSystemSettings(
  input: Partial<SystemSettings>,
  actor?: { email?: string; role?: ViewerRole },
): Promise<SystemSettings> {
  const current = await getSystemSettings();
  const nextSettings: SystemSettings = {
    maintenanceModeEnabled:
      input.maintenanceModeEnabled ?? current.maintenanceModeEnabled,
    maintenanceMessage:
      input.maintenanceMessage?.trim() || current.maintenanceMessage,
    updatedAt: new Date().toISOString(),
  };

  const existing = await prisma.systemSetting.findFirst({
    orderBy: { updatedAt: "desc" },
  });

  if (existing) {
    await prisma.systemSetting.update({
      where: { id: existing.id },
      data: {
        maintenanceModeEnabled: nextSettings.maintenanceModeEnabled,
        maintenanceMessage: nextSettings.maintenanceMessage,
      },
    });
  } else {
    await prisma.systemSetting.create({
      data: {
        maintenanceModeEnabled: nextSettings.maintenanceModeEnabled,
        maintenanceMessage: nextSettings.maintenanceMessage,
      },
    });
  }

  const actorUser = await ensureActorUser(actor);
  await prisma.adminAuditLog.create({
    data: {
      actorUserId: actorUser?.id ?? null,
      action: "system.settings.updated",
      targetType: "system",
      targetId: "system-settings",
      metadataJson: {
        maintenanceModeEnabled: nextSettings.maintenanceModeEnabled,
        maintenanceMessage: nextSettings.maintenanceMessage,
      } as Prisma.InputJsonValue,
    },
  });

  return nextSettings;
}

export async function getAdminAiSettings(): Promise<AdminAiSettings> {
  try {
    const latestLog = await prisma.adminAuditLog.findFirst({
      where: {
        action: "ai.settings.updated",
        targetType: "system",
        targetId: "admin-ai-settings",
      },
      orderBy: { createdAt: "desc" },
    });

    return coerceAdminAiSettings(latestLog?.metadataJson) ?? defaultAdminAiSettings;
  } catch {
    return defaultAdminAiSettings;
  }
}

export async function updateAdminAiSettings(
  input: Partial<AdminAiSettings>,
  actor?: { email?: string; role?: ViewerRole },
): Promise<AdminAiSettings> {
  const current = await getAdminAiSettings();
  const nextSettings: AdminAiSettings = {
    aiKillSwitchEnabled:
      input.aiKillSwitchEnabled ?? current.aiKillSwitchEnabled,
    warningThresholds: {
      starter: input.warningThresholds?.starter ?? current.warningThresholds.starter,
      basic: input.warningThresholds?.basic ?? current.warningThresholds.basic,
      pro: input.warningThresholds?.pro ?? current.warningThresholds.pro,
    },
    updatedAt: new Date().toISOString(),
  };

  const actorUser = await ensureActorUser(actor);
  await prisma.adminAuditLog.create({
    data: {
      actorUserId: actorUser?.id ?? null,
      action: "ai.settings.updated",
      targetType: "system",
      targetId: "admin-ai-settings",
      metadataJson: nextSettings as Prisma.InputJsonValue,
    },
  });

  return nextSettings;
}

export async function listMonetizationEvents(): Promise<MonetizationEventRecord[]> {
  try {
    const entries = await prisma.adminAuditLog.findMany({
      where: {
        action: "monetization.event",
        targetType: "monetization",
      },
      orderBy: { createdAt: "desc" },
      take: 250,
    });

    return entries
      .map((entry) => coerceMonetizationEvent(entry))
      .filter((entry): entry is MonetizationEventRecord => Boolean(entry));
  } catch {
    return [];
  }
}

export async function trackMonetizationEvent(input: {
  sellerId: string;
  sellerEmail: string;
  planKey: SubscriptionRecord["planKey"] | PlanKey;
  eventType: MonetizationEventRecord["eventType"];
  source: MonetizationEventRecord["source"];
  metadata?: Record<string, unknown>;
}): Promise<MonetizationEventRecord> {
  const createdAt = new Date().toISOString();
  const payload = {
    sellerId: input.sellerId,
    sellerEmail: input.sellerEmail,
    planKey: normalizePlanKey(input.planKey),
    eventType: input.eventType,
    source: input.source,
    payload: input.metadata ?? {},
    createdAt,
  };

  const actorUser = await ensureActorUser({
    email: input.sellerEmail,
    role: "seller",
  });

  const entry = await prisma.adminAuditLog.create({
    data: {
      actorUserId: actorUser?.id ?? null,
      action: "monetization.event",
      targetType: "monetization",
      targetId: input.eventType,
      metadataJson: payload as Prisma.InputJsonValue,
    },
  });

  return {
    id: entry.id,
    sellerId: input.sellerId,
    sellerEmail: input.sellerEmail,
    planKey: normalizePlanKey(input.planKey) as SubscriptionRecord["planKey"],
    eventType: input.eventType,
    source: input.source,
    metadata: input.metadata,
    createdAt: entry.createdAt.toISOString(),
  };
}

export async function findAiActionCacheEntry(_input: {
  sellerId: string;
  action: AiActionCacheRecord["action"];
  provider: AiActionCacheRecord["provider"];
  cacheKey: string;
}): Promise<{ result: AIProviderResult } | null> {
  return null;
}

export async function saveAiActionCacheEntry(input: {
  sellerId: string;
  action: AiActionCacheRecord["action"];
  provider: AiActionCacheRecord["provider"];
  cacheKey: string;
  result: AIProviderResult;
}) {
  return {
    id: `ai-cache-${Date.now()}`,
    sellerId: input.sellerId,
    action: input.action,
    provider: input.provider,
    cacheKey: input.cacheKey,
    result: input.result,
    createdAt: new Date().toISOString(),
  } satisfies AiActionCacheRecord;
}
