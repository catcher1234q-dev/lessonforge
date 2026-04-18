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
import { hasRealDatabaseUrl, prisma } from "@/lib/prisma/client";
import {
  getSupabaseServerAdminClient,
  hasSupabaseServerEnv,
} from "@/lib/supabase/server";
import type {
  AdminAiSettings,
  AiActionCacheRecord,
  AIProviderResult,
  MonetizationEventRecord,
  PrivateFeedbackRecord,
  FeedbackRating,
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

let systemSettingsTableAvailable: boolean | null = null;
let adminAuditLogsTableAvailable: boolean | null = null;

function logDatabaseFallback(scope: string, error: unknown) {
  console.error(
    `[lessonforge:data-access] ${scope} failed`,
    error instanceof Error ? error.message : error,
  );
}

async function safeDatabaseRead<T>(
  scope: string,
  fallbackValue: T,
  operation: () => Promise<T>,
): Promise<T> {
  if (!hasRealDatabaseUrl()) {
    return fallbackValue;
  }

  try {
    return await operation();
  } catch (error) {
    logDatabaseFallback(scope, error);
    return fallbackValue;
  }
}

async function checkTableExists(tableName: string) {
  if (!hasRealDatabaseUrl()) {
    return false;
  }

  try {
    const rows = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = ${tableName}
      ) AS "exists"
    `;

    return Boolean(rows[0]?.exists);
  } catch (error) {
    logDatabaseFallback(`checkTableExists.${tableName}`, error);
    return false;
  }
}

async function hasSystemSettingsTable() {
  if (systemSettingsTableAvailable !== null) {
    return systemSettingsTableAvailable;
  }

  systemSettingsTableAvailable = await checkTableExists("system_settings");
  return systemSettingsTableAvailable;
}

async function hasAdminAuditLogsTable() {
  if (adminAuditLogsTableAvailable !== null) {
    return adminAuditLogsTableAvailable;
  }

  adminAuditLogsTableAvailable = await checkTableExists("admin_audit_logs");
  return adminAuditLogsTableAvailable;
}

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

function isFeedbackRating(value: unknown): value is FeedbackRating {
  return value === "Easy" || value === "Okay" || value === "Confusing";
}

function coercePrivateFeedback(
  entry: Awaited<ReturnType<typeof prisma.adminAuditLog.findFirst>>,
): PrivateFeedbackRecord | null {
  if (!entry || !isRecord(entry.metadataJson)) {
    return null;
  }

  const metadata = entry.metadataJson;

  return {
    id: entry.id,
    createdAt: entry.createdAt.toISOString(),
    rating: isFeedbackRating(metadata.rating) ? metadata.rating : undefined,
    confusingText:
      typeof metadata.confusingText === "string" ? metadata.confusingText : undefined,
    improvementText:
      typeof metadata.improvementText === "string" ? metadata.improvementText : undefined,
    contact: typeof metadata.contact === "string" ? metadata.contact : undefined,
    pageContext:
      typeof metadata.pageContext === "string" ? metadata.pageContext : undefined,
    source: typeof metadata.source === "string" ? metadata.source : undefined,
    signedIn: metadata.signedIn === true,
    userEmail: typeof metadata.userEmail === "string" ? metadata.userEmail : undefined,
    userRole:
      metadata.userRole === "buyer" ||
      metadata.userRole === "seller" ||
      metadata.userRole === "admin" ||
      metadata.userRole === "owner"
        ? metadata.userRole
        : undefined,
  };
}

function buildFeedbackPayload(input: {
  confusingText?: string;
  improvementText?: string;
  contact?: string;
  pageContext?: string;
  source?: string;
  rating?: FeedbackRating;
  signedIn: boolean;
  userEmail?: string;
  userRole?: ViewerRole;
}) {
  return {
    schemaVersion: 1,
    confusingText: input.confusingText,
    improvementText: input.improvementText,
    contact: input.contact,
    pageContext: input.pageContext,
    source: input.source,
    rating: input.rating,
    signedIn: input.signedIn,
    userEmail: input.signedIn ? input.userEmail : undefined,
    userRole: input.signedIn ? input.userRole : undefined,
  };
}

function toJsonValue(value: Record<string, unknown>) {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function coercePrivateFeedbackFromSupabaseRow(row: {
  id?: unknown;
  created_at?: unknown;
  metadata_json?: unknown;
}): PrivateFeedbackRecord | null {
  if (typeof row.id !== "string" || !isRecord(row.metadata_json)) {
    return null;
  }

  const metadata = row.metadata_json;

  return {
    id: row.id,
    createdAt:
      typeof row.created_at === "string" ? row.created_at : new Date().toISOString(),
    rating: isFeedbackRating(metadata.rating) ? metadata.rating : undefined,
    confusingText:
      typeof metadata.confusingText === "string" ? metadata.confusingText : undefined,
    improvementText:
      typeof metadata.improvementText === "string" ? metadata.improvementText : undefined,
    contact: typeof metadata.contact === "string" ? metadata.contact : undefined,
    pageContext:
      typeof metadata.pageContext === "string" ? metadata.pageContext : undefined,
    source: typeof metadata.source === "string" ? metadata.source : undefined,
    signedIn: metadata.signedIn === true,
    userEmail: typeof metadata.userEmail === "string" ? metadata.userEmail : undefined,
    userRole:
      metadata.userRole === "buyer" ||
      metadata.userRole === "seller" ||
      metadata.userRole === "admin" ||
      metadata.userRole === "owner"
        ? metadata.userRole
        : undefined,
  };
}

export async function listPersistedProducts() {
  return safeDatabaseRead("listPersistedProducts", [], () => prismaListPersistedProducts());
}
export const saveProduct = prismaSaveProduct;
export async function listAdminAuditLogs() {
  return safeDatabaseRead("listAdminAuditLogs", [], () => prismaListAdminAuditLogs());
}
export async function listOrders() {
  return safeDatabaseRead("listOrders", [], () => prismaListOrders());
}
export const saveOrder = prismaSaveOrder;
export async function listFavorites() {
  return safeDatabaseRead("listFavorites", [], () => prismaListFavorites());
}
export const toggleFavorite = prismaToggleFavorite;
export async function listReviews() {
  return safeDatabaseRead("listReviews", [], () => prismaListReviews());
}
export const saveReview = prismaSaveReview;
export async function listRefundRequests() {
  return safeDatabaseRead("listRefundRequests", [], () => prismaListRefundRequests());
}
export const saveRefundRequest = prismaSaveRefundRequest;
export const updateRefundRequestStatus = prismaUpdateRefundRequestStatus;
export async function listReports() {
  return safeDatabaseRead("listReports", [], () => prismaListReports());
}
export const saveReport = prismaSaveReport;
export const updateReportStatus = prismaUpdateReportStatus;
export const updateProductStatus = prismaUpdateProductStatus;
export async function listSubscriptions() {
  return safeDatabaseRead("listSubscriptions", [], () => prismaListSubscriptions());
}
export async function listUsageLedger() {
  return safeDatabaseRead("listUsageLedger", [], () => prismaListUsageLedger());
}
export const getOrCreateSubscription = prismaGetOrCreateSubscription;
export const consumeCredits = prismaConsumeCredits;
export const refundCredits = prismaRefundCredits;

export async function listSellerProfiles() {
  const [profiles, subscriptions] = await Promise.all([
    safeDatabaseRead("listSellerProfiles", [] as SellerProfileDraft[], () =>
      prismaListSellerProfiles(),
    ),
    safeDatabaseRead("listSellerProfiles.subscriptions", [] as SubscriptionRecord[], () =>
      prismaListSubscriptions(),
    ),
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
  if (!(await hasSystemSettingsTable())) {
    return defaultSystemSettings;
  }

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
  if (!(await hasSystemSettingsTable())) {
    throw new Error(
      "System settings storage is missing in the database. Run the latest Supabase schema patch before changing maintenance mode.",
    );
  }

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

  if (await hasAdminAuditLogsTable()) {
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
  } else {
    console.warn(
      "[lessonforge:data-access] admin_audit_logs table is missing; system settings change was saved without an audit log entry.",
    );
  }

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

export async function savePrivateFeedback(input: {
  confusingText?: string;
  improvementText?: string;
  contact?: string;
  pageContext?: string;
  source?: string;
  rating?: FeedbackRating;
  signedIn: boolean;
  userEmail?: string;
  userRole?: ViewerRole;
}): Promise<PrivateFeedbackRecord> {
  const payload = buildFeedbackPayload(input);
  const targetId = input.source || input.pageContext || "feedback";

  if (hasRealDatabaseUrl() && (await hasAdminAuditLogsTable())) {
    const actorUser = input.signedIn
      ? await ensureActorUser({
          email: input.userEmail,
          role: input.userRole,
        })
      : null;
    const entry = await prisma.adminAuditLog.create({
      data: {
        actorUserId: actorUser?.id ?? null,
        action: "user.feedback.submitted",
        targetType: "private_feedback",
        targetId,
        metadataJson: toJsonValue(payload),
      },
    });

    return {
      id: entry.id,
      createdAt: entry.createdAt.toISOString(),
      rating: input.rating,
      confusingText: input.confusingText,
      improvementText: input.improvementText,
      contact: input.contact,
      pageContext: input.pageContext,
      source: input.source,
      signedIn: input.signedIn,
      userEmail: input.signedIn ? input.userEmail : undefined,
      userRole: input.signedIn ? input.userRole : undefined,
    };
  }

  if (!hasSupabaseServerEnv()) {
    throw new Error("Feedback storage is unavailable right now.");
  }

  const id = `feedback-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const { data, error } = await getSupabaseServerAdminClient()
    .from("admin_audit_logs")
    .insert({
      id,
      action: "user.feedback.submitted",
      target_type: "private_feedback",
      target_id: targetId,
      metadata_json: payload,
    })
    .select("id, created_at, metadata_json")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return {
    id: typeof data?.id === "string" ? data.id : id,
    createdAt:
      typeof data?.created_at === "string"
        ? data.created_at
        : new Date().toISOString(),
    rating: input.rating,
    confusingText: input.confusingText,
    improvementText: input.improvementText,
    contact: input.contact,
    pageContext: input.pageContext,
    source: input.source,
    signedIn: input.signedIn,
    userEmail: input.signedIn ? input.userEmail : undefined,
    userRole: input.signedIn ? input.userRole : undefined,
  };
}

export async function listPrivateFeedback(): Promise<PrivateFeedbackRecord[]> {
  if (hasRealDatabaseUrl()) {
    return safeDatabaseRead("listPrivateFeedback", [], async () => {
      const entries = await prisma.adminAuditLog.findMany({
        where: {
          action: "user.feedback.submitted",
          targetType: "private_feedback",
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      });

      return entries
        .map((entry) => coercePrivateFeedback(entry))
        .filter((entry): entry is PrivateFeedbackRecord => Boolean(entry));
    });
  }

  if (!hasSupabaseServerEnv()) {
    return [];
  }

  try {
    const { data, error } = await getSupabaseServerAdminClient()
      .from("admin_audit_logs")
      .select("id, created_at, metadata_json")
      .eq("action", "user.feedback.submitted")
      .eq("target_type", "private_feedback")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? [])
      .map((row) => coercePrivateFeedbackFromSupabaseRow(row))
      .filter((entry): entry is PrivateFeedbackRecord => Boolean(entry));
  } catch (error) {
    logDatabaseFallback("listPrivateFeedback.supabase", error);
    return [];
  }
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
