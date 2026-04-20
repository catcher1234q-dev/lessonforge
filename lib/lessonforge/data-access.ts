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
import type { ListingAssistResult } from "@/lib/ai/providers";
import type {
  AdminAiSettings,
  AiActionCacheRecord,
  AIProviderResult,
  FavoriteRecord,
  MonetizationEventRecord,
  OrderRecord,
  PrivateFeedbackRecord,
  FeedbackRating,
  RefundRequestRecord,
  ReportRecord,
  SellerProfileDraft,
  SubscriptionRecord,
  ReviewRecord,
  SystemSettings,
  UsageLedgerEntry,
  ViewerRole,
} from "@/types";
import {
  getSupabaseSubscriptionRecord,
  listSupabaseSellerProfiles,
} from "@/lib/supabase/admin-sync";
import { getSupabaseServerAdminClient, hasSupabaseServerEnv } from "@/lib/supabase/server";

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
const prismaTableAvailability = new Map<string, boolean>();
const prismaColumnAvailability = new Map<string, boolean>();
const schemaSkipNotices = new Set<string>();

function logDatabaseFallback(scope: string, error: unknown) {
  if (
    process.env.NODE_ENV === "production" &&
    (scope.startsWith("checkTableExists.") || scope.startsWith("checkColumnExists."))
  ) {
    return;
  }

  console.error(
    `[lessonforge:data-access] ${scope} failed`,
    error instanceof Error ? error.message : error,
  );
}

function isMissingPrismaCoreTableError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  return /public\.(Product|UsageLedger|User|Order|OrderItem|Report|Review|Favorite|SellerProfile|RefundRequest|Subscription)|table `public\.(Product|UsageLedger|User|Order|OrderItem|Report|Review|Favorite|SellerProfile|RefundRequest|Subscription)`|relation "(Product|UsageLedger|User|Order|OrderItem|Report|Review|Favorite|SellerProfile|RefundRequest|Subscription)"|column `subject` does not exist|column Product\.subject does not exist/i.test(
    message,
  );
}

function logCriticalPrismaSchemaMismatch(scope: string, error: unknown) {
  if (!isMissingPrismaCoreTableError(error)) {
    return;
  }

  console.error("[lessonforge:data-access] critical Prisma schema mismatch", {
    scope,
    message: error instanceof Error ? error.message : String(error),
    remediation:
      "Confirm DATABASE_URL points at the intended production database and run prisma migrate deploy with DIRECT_URL set to the direct database host.",
  });
}

function logAiFallbackEvent(
  event:
    | "supabase_fallback_enabled"
    | "atomic_reservation_unavailable"
    | "seller_profile_missing"
    | "usage_duplicate_reused"
    | "credits_exhausted"
    | "usage_recorded"
    | "usage_refunded",
  metadata: Record<string, unknown>,
) {
  console.info("[lessonforge.ai] fallback event", {
    event,
    ...metadata,
  });
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
    logCriticalPrismaSchemaMismatch(scope, error);
    logDatabaseFallback(scope, error);
    return fallbackValue;
  }
}

async function checkTableExists(tableName: string) {
  if (!hasRealDatabaseUrl()) {
    return false;
  }

  if (prismaTableAvailability.has(tableName)) {
    return prismaTableAvailability.get(tableName) ?? false;
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

    const exists = Boolean(rows[0]?.exists);
    prismaTableAvailability.set(tableName, exists);
    return exists;
  } catch (error) {
    logDatabaseFallback(`checkTableExists.${tableName}`, error);
    return false;
  }
}

async function checkColumnExists(tableName: string, columnName: string) {
  if (!hasRealDatabaseUrl()) {
    return false;
  }

  const cacheKey = `${tableName}.${columnName}`;

  if (prismaColumnAvailability.has(cacheKey)) {
    return prismaColumnAvailability.get(cacheKey) ?? false;
  }

  try {
    const rows = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = ${tableName}
          AND column_name = ${columnName}
      ) AS "exists"
    `;

    const exists = Boolean(rows[0]?.exists);
    prismaColumnAvailability.set(cacheKey, exists);
    return exists;
  } catch (error) {
    logDatabaseFallback(`checkColumnExists.${tableName}.${columnName}`, error);
    return false;
  }
}

function logSchemaSkip(scope: string, details: string) {
  const key = `${scope}:${details}`;

  if (schemaSkipNotices.has(key)) {
    return;
  }

  schemaSkipNotices.add(key);
  if (process.env.NODE_ENV !== "production") {
    console.info("[lessonforge:data-access] skipped Prisma read because schema is still incomplete", {
      scope,
      details,
    });
  }
}

async function requirePrismaTable(scope: string, tableName: string) {
  const exists = await checkTableExists(tableName);

  if (!exists) {
    logSchemaSkip(scope, `missing table public.${tableName}`);
  }

  return exists;
}

async function requirePrismaColumn(scope: string, tableName: string, columnName: string) {
  const tableExists = await checkTableExists(tableName);

  if (!tableExists) {
    logSchemaSkip(scope, `missing table public.${tableName}`);
    return false;
  }

  const exists = await checkColumnExists(tableName, columnName);

  if (!exists) {
    logSchemaSkip(scope, `missing column public.${tableName}.${columnName}`);
  }

  return exists;
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

type SupabaseAiUsageMetadata = {
  schemaVersion?: number;
  sellerId?: string;
  sellerEmail?: string;
  planKey?: SubscriptionRecord["planKey"];
  action?: UsageLedgerEntry["action"];
  provider?: UsageLedgerEntry["provider"];
  creditsUsed?: number;
  refundedCredits?: number;
  status?: UsageLedgerEntry["status"];
  idempotencyKey?: string;
};

export type AiCreditReservationState = "reserved" | "reused";

type AiCreditConsumeResult = {
  subscription: SubscriptionRecord;
  ledgerEntry: UsageLedgerEntry;
  reservationState: AiCreditReservationState;
};

type ConsumeCreditsInput = {
  sellerId: string;
  sellerEmail: string;
  planKey: PlanKey;
  monthlyCredits: number;
  action: "titleSuggestion" | "descriptionRewrite" | "standardsScan";
  creditsUsed: number;
  provider: "openai" | "gemini";
  idempotencyKey: string;
};

type SupabaseAiUsageRow = {
  id?: unknown;
  target_id?: unknown;
  metadata_json?: unknown;
  created_at?: unknown;
};

type SupabaseAiActionCacheMetadata = {
  schemaVersion?: number;
  sellerId?: string;
  action?: AiActionCacheRecord["action"];
  provider?: AiActionCacheRecord["provider"];
  cacheKey?: string;
  result?: AIProviderResult;
};

type SupabaseAiActionCacheRow = {
  id?: unknown;
  target_id?: unknown;
  metadata_json?: unknown;
  created_at?: unknown;
};

type SupabaseListingAssistCacheMetadata = {
  schemaVersion?: number;
  sellerId?: string;
  action?: UsageLedgerEntry["action"];
  provider?: UsageLedgerEntry["provider"];
  cacheKey?: string;
  result?: ListingAssistResult;
};

type SupabaseListingAssistCacheRow = {
  id?: unknown;
  target_id?: unknown;
  metadata_json?: unknown;
  created_at?: unknown;
};

function isPrismaAiFallbackError(error: unknown) {
  if (!hasSupabaseServerEnv()) {
    return false;
  }

  const message = error instanceof Error ? error.message : String(error);

  return (
    /public\.User|table `public\.User`|relation "User"|Can't reach database server/i.test(message)
  );
}

function isMissingPrismaUserTableError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  return /public\.User|table `public\.User`|relation "User"/i.test(message);
}

function buildAiUsageAuditLogId(idempotencyKey: string) {
  const normalized = idempotencyKey.replace(/[^a-zA-Z0-9:_-]+/g, "-").slice(0, 80);
  return `ai-usage-${normalized}`;
}

function getAiSellerLockKey(sellerEmail: string) {
  return `lessonforge-ai:${sellerEmail.trim().toLowerCase()}`;
}

function getCurrentAiCycleWindow(now = new Date()) {
  const startsAt = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const endsAt = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const label = startsAt.toLocaleString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  return {
    startsAt,
    endsAt,
    label: `${label} billing cycle`,
  };
}

function coerceSupabaseAiUsageEntry(row: SupabaseAiUsageRow): UsageLedgerEntry | null {
  if (typeof row.id !== "string" || !isRecord(row.metadata_json)) {
    return null;
  }

  const metadata = row.metadata_json as SupabaseAiUsageMetadata;

  if (
    typeof metadata.sellerId !== "string" ||
    typeof metadata.action !== "string" ||
    typeof metadata.provider !== "string" ||
    typeof metadata.creditsUsed !== "number" ||
    typeof metadata.refundedCredits !== "number" ||
    typeof metadata.status !== "string" ||
    typeof metadata.idempotencyKey !== "string"
  ) {
    return null;
  }

  return {
    id: row.id,
    sellerId: metadata.sellerId,
    action: metadata.action,
    creditsUsed: metadata.creditsUsed,
    refundedCredits: metadata.refundedCredits,
    status: metadata.status,
    provider: metadata.provider,
    idempotencyKey: metadata.idempotencyKey,
    createdAt:
      typeof row.created_at === "string" ? row.created_at : new Date().toISOString(),
  };
}

function buildAiActionCacheLogId(cacheKey: string) {
  const normalized = cacheKey.replace(/[^a-zA-Z0-9:_-]+/g, "-").slice(0, 80);
  return `ai-cache-${normalized}`;
}

function coerceSupabaseAiActionCacheEntry(row: SupabaseAiActionCacheRow) {
  if (typeof row.id !== "string" || !isRecord(row.metadata_json)) {
    return null;
  }

  const metadata = row.metadata_json as SupabaseAiActionCacheMetadata;

  if (
    typeof metadata.sellerId !== "string" ||
    typeof metadata.action !== "string" ||
    typeof metadata.provider !== "string" ||
    typeof metadata.cacheKey !== "string" ||
    !metadata.result ||
    typeof metadata.result !== "object"
  ) {
    return null;
  }

  return {
    id: row.id,
    sellerId: metadata.sellerId,
    action: metadata.action,
    provider: metadata.provider,
    cacheKey: metadata.cacheKey,
    result: metadata.result,
    createdAt:
      typeof row.created_at === "string" ? row.created_at : new Date().toISOString(),
  } satisfies AiActionCacheRecord;
}

function buildListingAssistCacheLogId(cacheKey: string) {
  const normalized = cacheKey.replace(/[^a-zA-Z0-9:_-]+/g, "-").slice(0, 80);
  return `listing-cache-${normalized}`;
}

function coerceSupabaseListingAssistCacheEntry(row: SupabaseListingAssistCacheRow) {
  if (typeof row.id !== "string" || !isRecord(row.metadata_json)) {
    return null;
  }

  const metadata = row.metadata_json as SupabaseListingAssistCacheMetadata;

  if (
    typeof metadata.sellerId !== "string" ||
    typeof metadata.action !== "string" ||
    typeof metadata.provider !== "string" ||
    typeof metadata.cacheKey !== "string" ||
    !metadata.result ||
    typeof metadata.result !== "object"
  ) {
    return null;
  }

  return {
    id: row.id,
    sellerId: metadata.sellerId,
    action: metadata.action,
    provider: metadata.provider,
    cacheKey: metadata.cacheKey,
    result: metadata.result,
    createdAt:
      typeof row.created_at === "string" ? row.created_at : new Date().toISOString(),
  } as {
    id: string;
    sellerId: string;
    action: UsageLedgerEntry["action"];
    provider: UsageLedgerEntry["provider"];
    cacheKey: string;
    result: ListingAssistResult;
    createdAt: string;
  };
}

function coerceSupabaseReportEntry(row: {
  target_id: string | null;
  metadata_json: unknown;
  created_at: string | null;
}): ReportRecord | null {
  if (!isRecord(row.metadata_json)) {
    return null;
  }

  const metadata = row.metadata_json;
  const id = typeof metadata.id === "string" ? metadata.id : row.target_id;
  const category = metadata.category;
  const status = metadata.status;

  if (
    typeof id !== "string" ||
    typeof metadata.productId !== "string" ||
    typeof metadata.productTitle !== "string" ||
    typeof metadata.details !== "string" ||
    (category !== "Broken file" &&
      category !== "Copyright" &&
      category !== "Misleading listing" &&
      category !== "Low quality" &&
      category !== "Spam" &&
      category !== "Access issue") ||
    (status !== "Open" &&
      status !== "Under review" &&
      status !== "Resolved" &&
      status !== "Dismissed")
  ) {
    return null;
  }

  return {
    id,
    productId: metadata.productId,
    productTitle: metadata.productTitle,
    reporterName:
      typeof metadata.reporterName === "string" ? metadata.reporterName : undefined,
    reporterEmail:
      typeof metadata.reporterEmail === "string" ? metadata.reporterEmail : undefined,
    category,
    status,
    details: metadata.details,
    adminResolutionNote:
      typeof metadata.adminResolutionNote === "string"
        ? metadata.adminResolutionNote
        : undefined,
    createdAt:
      typeof metadata.createdAt === "string"
        ? metadata.createdAt
        : row.created_at || new Date().toISOString(),
  };
}

async function listSupabaseReportEntries(): Promise<ReportRecord[]> {
  if (!(await hasAdminAuditLogsTable()) || !hasSupabaseServerEnv()) {
    return [];
  }

  const { data, error } = await getSupabaseServerAdminClient()
    .from("admin_audit_logs")
    .select("target_id, metadata_json, created_at")
    .eq("action", "marketplace.report")
    .eq("target_type", "report")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    throw new Error(`Unable to load fallback reports: ${error.message}`);
  }

  return (data ?? [])
    .map((row) => coerceSupabaseReportEntry(row))
    .filter((entry): entry is ReportRecord => Boolean(entry));
}

function mergeReportEntries(
  prismaReports: ReportRecord[],
  fallbackReports: ReportRecord[],
) {
  const merged = new Map<string, ReportRecord>();

  for (const report of [...fallbackReports, ...prismaReports]) {
    merged.set(report.id, report);
  }

  return Array.from(merged.values()).sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
}

async function saveSupabaseReportEntry(report: ReportRecord) {
  if (!(await hasAdminAuditLogsTable()) || !hasSupabaseServerEnv()) {
    return report;
  }

  const { error } = await getSupabaseServerAdminClient().from("admin_audit_logs").upsert(
    {
      id: `report-${report.id}`,
      action: "marketplace.report",
      target_type: "report",
      target_id: report.id,
      metadata_json: report,
    },
    { onConflict: "id" },
  );

  if (error) {
    throw new Error(`Unable to store fallback report: ${error.message}`);
  }

  return report;
}

async function updateSupabaseReportEntry(
  reportId: string,
  nextStatus: NonNullable<ReportRecord["status"]>,
  adminResolutionNote?: string,
) {
  const reports = await listSupabaseReportEntries();
  const existing = reports.find((entry) => entry.id === reportId);

  if (!existing) {
    throw new Error("Report not found.");
  }

  return saveSupabaseReportEntry({
    ...existing,
    status: nextStatus,
    adminResolutionNote: adminResolutionNote?.trim() || undefined,
  });
}

async function listSupabaseAiUsageLedger(): Promise<UsageLedgerEntry[]> {
  if (!hasSupabaseServerEnv()) {
    return [];
  }

  const { data, error } = await getSupabaseServerAdminClient()
    .from("admin_audit_logs")
    .select("id, target_id, metadata_json, created_at")
    .eq("action", "ai.usage")
    .eq("target_type", "ai_usage")
    .order("created_at", { ascending: false })
    .limit(1000);

  if (error) {
    console.error("[lessonforge.ai] fallback ledger read failed", {
      message: error.message,
    });
    throw new Error(`Unable to load Supabase AI usage ledger: ${error.message}`);
  }

  return (data ?? [])
    .map((row) => coerceSupabaseAiUsageEntry(row))
    .filter((entry): entry is UsageLedgerEntry => Boolean(entry));
}

async function buildSupabaseSubscriptionRecordFromLedger(input: {
  sellerId: string;
  sellerEmail: string;
  planKey: SubscriptionRecord["planKey"];
  monthlyCredits: number;
  ledger: UsageLedgerEntry[];
}) {
  const resolvedPlanKey = normalizePlanKey(input.planKey);
  const monthlyCredits = getFallbackMonthlyCredits(resolvedPlanKey);
  const sellerLedger = input.ledger.filter(
    (entry) => entry.sellerId === input.sellerId || entry.sellerId === input.sellerEmail,
  );
  const cycle = calculateAvailableCredits({
    monthlyCredits,
    ledger: sellerLedger,
  });

  return {
    subscription: {
      sellerId: input.sellerId,
      sellerEmail: input.sellerEmail,
      planKey: resolvedPlanKey,
      monthlyCredits,
      availableCredits: cycle.availableCredits,
      cycleLabel: cycle.cycleLabel,
      rolloverPolicy: "none",
    } satisfies SubscriptionRecord,
    ledger: sellerLedger,
  };
}

async function consumeCreditsWithSupabaseTablesAtomic(
  input: ConsumeCreditsInput,
): Promise<AiCreditConsumeResult> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${getAiSellerLockKey(input.sellerEmail)})::bigint)`;

    const existingRows = await tx.$queryRaw<SupabaseAiUsageRow[]>`
      SELECT id, target_id, metadata_json, created_at
      FROM public.admin_audit_logs
      WHERE action = 'ai.usage'
        AND target_type = 'ai_usage'
        AND target_id = ${input.idempotencyKey}
      ORDER BY created_at DESC
      LIMIT 1
    `;
    const existingEntry = existingRows
      .map((row) => coerceSupabaseAiUsageEntry(row))
      .find((entry): entry is UsageLedgerEntry => Boolean(entry));

    const profileRows = await tx.$queryRaw<Array<{ id: string; email: string; role: string }>>`
      SELECT id, email, role
      FROM public.profiles
      WHERE lower(email) = lower(${input.sellerEmail})
      LIMIT 1
    `;
    const profile = profileRows[0];

    if (!profile?.id) {
      logAiFallbackEvent("seller_profile_missing", {
        sellerId: input.sellerId,
        sellerEmail: input.sellerEmail,
      });
      throw new Error("Signed-in seller access required.");
    }

    const subscriptionRows = await tx.$queryRaw<Array<{ plan_name: string | null }>>`
      SELECT plan_name
      FROM public.subscriptions
      WHERE user_id = ${profile.id}
      LIMIT 1
    `;
    const resolvedPlanKey = normalizePlanKey(subscriptionRows[0]?.plan_name ?? input.planKey);
    const monthlyCredits = getFallbackMonthlyCredits(resolvedPlanKey);

    const ledgerRows = await tx.$queryRaw<SupabaseAiUsageRow[]>`
      SELECT id, target_id, metadata_json, created_at
      FROM public.admin_audit_logs
      WHERE action = 'ai.usage'
        AND target_type = 'ai_usage'
        AND (
          metadata_json->>'sellerId' = ${input.sellerId}
          OR metadata_json->>'sellerId' = ${input.sellerEmail}
        )
      ORDER BY created_at DESC
      LIMIT 1000
    `;
    const ledger = ledgerRows
      .map((row) => coerceSupabaseAiUsageEntry(row))
      .filter((entry): entry is UsageLedgerEntry => Boolean(entry));

    const { subscription } = await buildSupabaseSubscriptionRecordFromLedger({
      sellerId: input.sellerId,
      sellerEmail: input.sellerEmail,
      planKey: resolvedPlanKey,
      monthlyCredits,
      ledger,
    });

    if (existingEntry) {
      if (existingEntry.refundedCredits >= existingEntry.creditsUsed) {
        if (subscription.availableCredits < input.creditsUsed) {
          logAiFallbackEvent("credits_exhausted", {
            sellerId: input.sellerId,
            provider: input.provider,
            action: input.action,
            availableCredits: subscription.availableCredits,
            requestedCredits: input.creditsUsed,
          });
          throw new Error("Not enough AI credits remaining for this action.");
        }

        const metadata: SupabaseAiUsageMetadata = {
          schemaVersion: 1,
          sellerId: input.sellerId,
          sellerEmail: input.sellerEmail,
          planKey: resolvedPlanKey,
          action: input.action,
          provider: input.provider,
          creditsUsed: input.creditsUsed,
          refundedCredits: 0,
          status: "applied",
          idempotencyKey: input.idempotencyKey,
        };

        const updatedRows = await tx.$queryRaw<SupabaseAiUsageRow[]>`
          UPDATE public.admin_audit_logs
          SET metadata_json = ${JSON.parse(JSON.stringify(metadata)) as Prisma.InputJsonValue}::jsonb
          WHERE id = ${buildAiUsageAuditLogId(input.idempotencyKey)}
          RETURNING id, target_id, metadata_json, created_at
        `;
        const retriedEntry = updatedRows
          .map((row) => coerceSupabaseAiUsageEntry(row))
          .find((entry): entry is UsageLedgerEntry => Boolean(entry));

        if (!retriedEntry) {
          throw new Error("AI usage could not be recorded right now.");
        }

        logAiFallbackEvent("usage_recorded", {
          sellerId: input.sellerId,
          provider: input.provider,
          action: input.action,
          creditsUsed: input.creditsUsed,
        });

        return {
          subscription: {
            ...subscription,
            availableCredits: Math.max(0, subscription.availableCredits - input.creditsUsed),
          },
          ledgerEntry: retriedEntry,
          reservationState: "reserved",
        };
      }

      logAiFallbackEvent("usage_duplicate_reused", {
        sellerId: input.sellerId,
        provider: input.provider,
        action: input.action,
      });
      return {
        subscription,
        ledgerEntry: existingEntry,
        reservationState: "reused",
      };
    }

    if (subscription.availableCredits < input.creditsUsed) {
      logAiFallbackEvent("credits_exhausted", {
        sellerId: input.sellerId,
        provider: input.provider,
        action: input.action,
        availableCredits: subscription.availableCredits,
        requestedCredits: input.creditsUsed,
      });
      throw new Error("Not enough AI credits remaining for this action.");
    }

    const metadata: SupabaseAiUsageMetadata = {
      schemaVersion: 1,
      sellerId: input.sellerId,
      sellerEmail: input.sellerEmail,
      planKey: resolvedPlanKey,
      action: input.action,
      provider: input.provider,
      creditsUsed: input.creditsUsed,
      refundedCredits: 0,
      status: "applied",
      idempotencyKey: input.idempotencyKey,
    };

    const insertedRows = await tx.$queryRaw<SupabaseAiUsageRow[]>`
      INSERT INTO public.admin_audit_logs (id, actor_user_id, action, target_type, target_id, metadata_json)
      VALUES (
        ${buildAiUsageAuditLogId(input.idempotencyKey)},
        ${profile.id},
        'ai.usage',
        'ai_usage',
        ${input.idempotencyKey},
        ${JSON.parse(JSON.stringify(metadata)) as Prisma.InputJsonValue}::jsonb
      )
      RETURNING id, target_id, metadata_json, created_at
    `;
    const ledgerEntry = insertedRows
      .map((row) => coerceSupabaseAiUsageEntry(row))
      .find((entry): entry is UsageLedgerEntry => Boolean(entry));

    if (!ledgerEntry) {
      throw new Error("AI usage could not be recorded right now.");
    }

    logAiFallbackEvent("usage_recorded", {
      sellerId: input.sellerId,
      provider: input.provider,
      action: input.action,
      creditsUsed: input.creditsUsed,
    });

    return {
      subscription: {
        ...subscription,
        availableCredits: Math.max(0, subscription.availableCredits - input.creditsUsed),
      },
      ledgerEntry,
      reservationState: "reserved",
    };
  });
}

async function refundCreditsWithSupabaseTablesAtomic(idempotencyKey: string) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`lessonforge-ai-refund:${idempotencyKey}`})::bigint)`;

    const rows = await tx.$queryRaw<SupabaseAiUsageRow[]>`
      SELECT id, target_id, metadata_json, created_at
      FROM public.admin_audit_logs
      WHERE action = 'ai.usage'
        AND target_type = 'ai_usage'
        AND target_id = ${idempotencyKey}
      ORDER BY created_at DESC
      LIMIT 1
    `;
    const entry = rows
      .map((row) => coerceSupabaseAiUsageEntry(row))
      .find((value): value is UsageLedgerEntry => Boolean(value));

    if (!entry || entry.refundedCredits > 0) {
      return entry ?? null;
    }

    const nextMetadata: SupabaseAiUsageMetadata = {
      schemaVersion: 1,
      sellerId: entry.sellerId,
      action: entry.action,
      provider: entry.provider,
      creditsUsed: entry.creditsUsed,
      refundedCredits: entry.creditsUsed,
      status: "refunded",
      idempotencyKey: entry.idempotencyKey,
    };

    const updatedRows = await tx.$queryRaw<SupabaseAiUsageRow[]>`
      UPDATE public.admin_audit_logs
      SET metadata_json = ${JSON.parse(JSON.stringify(nextMetadata)) as Prisma.InputJsonValue}::jsonb
      WHERE id = ${buildAiUsageAuditLogId(idempotencyKey)}
      RETURNING id, target_id, metadata_json, created_at
    `;
    const updatedEntry = updatedRows
      .map((row) => coerceSupabaseAiUsageEntry(row))
      .find((value): value is UsageLedgerEntry => Boolean(value));

    if (updatedEntry) {
      logAiFallbackEvent("usage_refunded", {
        idempotencyKey,
        refundedCredits: entry.creditsUsed,
      });
    }

    return updatedEntry ?? null;
  });
}

function calculateAvailableCredits(input: {
  monthlyCredits: number;
  ledger: UsageLedgerEntry[];
}) {
  const cycle = getCurrentAiCycleWindow();
  const usedThisCycle = input.ledger.reduce((sum, entry) => {
    const createdAt = new Date(entry.createdAt);

    if (createdAt < cycle.startsAt || createdAt >= cycle.endsAt) {
      return sum;
    }

    return sum + Math.max(0, entry.creditsUsed - entry.refundedCredits);
  }, 0);

  return {
    cycleLabel: cycle.label,
    availableCredits: Math.max(0, input.monthlyCredits - usedThisCycle),
  };
}

function getFallbackMonthlyCredits(planKey: SubscriptionRecord["planKey"]) {
  switch (planKey) {
    case "basic":
      return Number(process.env.PLAN_BASIC_MONTHLY_CREDITS || "100");
    case "pro":
      return Number(process.env.PLAN_PRO_MONTHLY_CREDITS || "300");
    default:
      return Number(process.env.PLAN_STARTER_CREDITS || "5");
  }
}

async function buildSupabaseSubscriptionRecord(input: {
  sellerId: string;
  sellerEmail: string;
  planKey: SubscriptionRecord["planKey"];
  monthlyCredits: number;
}) {
  const [subscriptionRow, ledger] = await Promise.all([
    getSupabaseSubscriptionRecord(input.sellerEmail),
    listSupabaseAiUsageLedger(),
  ]);
  const resolvedPlanKey = normalizePlanKey(subscriptionRow?.plan_name ?? input.planKey);
  const monthlyCredits = getFallbackMonthlyCredits(resolvedPlanKey);
  const sellerLedger = ledger.filter(
    (entry) => entry.sellerId === input.sellerId || entry.sellerId === input.sellerEmail,
  );
  const cycle = calculateAvailableCredits({
    monthlyCredits,
    ledger: sellerLedger,
  });

  return {
    subscription: {
      sellerId: input.sellerId,
      sellerEmail: input.sellerEmail,
      planKey: resolvedPlanKey,
      monthlyCredits,
      availableCredits: cycle.availableCredits,
      cycleLabel: cycle.cycleLabel,
      rolloverPolicy: "none",
    } satisfies SubscriptionRecord,
    ledger: sellerLedger,
  };
}

export async function listPersistedProducts() {
  if (!(await requirePrismaColumn("listPersistedProducts", "Product", "subject"))) {
    return [];
  }

  return safeDatabaseRead("listPersistedProducts", [], () => prismaListPersistedProducts());
}
export const saveProduct = prismaSaveProduct;
export async function listAdminAuditLogs() {
  return safeDatabaseRead("listAdminAuditLogs", [], () => prismaListAdminAuditLogs());
}
export async function listOrders() {
  if (!(await requirePrismaTable("listOrders", "Order"))) {
    return [];
  }

  return safeDatabaseRead("listOrders", [], () => prismaListOrders());
}
export async function saveOrder(order: OrderRecord) {
  if (!(await requirePrismaTable("saveOrder", "Order"))) {
    return order;
  }

  try {
    return await prismaSaveOrder(order);
  } catch (error) {
    logCriticalPrismaSchemaMismatch("saveOrder", error);
    throw error;
  }
}
export async function listFavorites() {
  if (!(await requirePrismaTable("listFavorites", "Favorite"))) {
    return [];
  }

  return safeDatabaseRead("listFavorites", [], () => prismaListFavorites());
}
export const toggleFavorite = prismaToggleFavorite;
export async function listReviews() {
  if (!(await requirePrismaTable("listReviews", "Review"))) {
    return [];
  }

  return safeDatabaseRead("listReviews", [], () => prismaListReviews());
}
export const saveReview = prismaSaveReview;
export async function listRefundRequests() {
  if (!(await requirePrismaTable("listRefundRequests", "RefundRequest"))) {
    return [];
  }

  return safeDatabaseRead("listRefundRequests", [], () => prismaListRefundRequests());
}
export const saveRefundRequest = prismaSaveRefundRequest;
export const updateRefundRequestStatus = prismaUpdateRefundRequestStatus;
export async function listReports() {
  if (!(await requirePrismaTable("listReports", "Report"))) {
    return listSupabaseReportEntries();
  }

  const [prismaReports, fallbackReports] = await Promise.all([
    safeDatabaseRead("listReports", [], () => prismaListReports()),
    listSupabaseReportEntries().catch(() => [] as ReportRecord[]),
  ]);

  return mergeReportEntries(prismaReports, fallbackReports);
}
export async function saveReport(report: ReportRecord) {
  if (!(await requirePrismaTable("saveReport", "Report"))) {
    return saveSupabaseReportEntry(report);
  }

  try {
    return await prismaSaveReport(report);
  } catch (error) {
    logDatabaseFallback("saveReport", error);
    return saveSupabaseReportEntry(report);
  }
}
export async function updateReportStatus(
  reportId: string,
  status: NonNullable<ReportRecord["status"]>,
  adminResolutionNote?: string,
  actor?: { email?: string; role?: ViewerRole },
) {
  if (!(await requirePrismaTable("updateReportStatus", "Report"))) {
    return updateSupabaseReportEntry(reportId, status, adminResolutionNote);
  }

  try {
    return await prismaUpdateReportStatus(reportId, status, adminResolutionNote, actor);
  } catch (error) {
    logDatabaseFallback("updateReportStatus", error);
    return updateSupabaseReportEntry(reportId, status, adminResolutionNote);
  }
}
export const updateProductStatus = prismaUpdateProductStatus;
export async function listSubscriptions() {
  try {
    return await prismaListSubscriptions();
  } catch (error) {
    if (!isPrismaAiFallbackError(error)) {
      logDatabaseFallback("listSubscriptions", error);
      return [];
    }

    logAiFallbackEvent("supabase_fallback_enabled", {
      scope: "listSubscriptions",
      message: error instanceof Error ? error.message : String(error),
    });

    const profiles = await listSupabaseSellerProfiles();
    const subscriptions = await Promise.all(
      profiles.map(async (profile) => {
        const { subscription } = await buildSupabaseSubscriptionRecord({
          sellerId: profile.email,
          sellerEmail: profile.email,
          planKey: normalizePlanKey(profile.sellerPlanKey),
          monthlyCredits: getFallbackMonthlyCredits(normalizePlanKey(profile.sellerPlanKey)),
        });

        return subscription;
      }),
    );

    return subscriptions;
  }
}
export async function listUsageLedger() {
  try {
    return await prismaListUsageLedger();
  } catch (error) {
    if (!isPrismaAiFallbackError(error)) {
      logDatabaseFallback("listUsageLedger", error);
      return [];
    }

    logAiFallbackEvent("supabase_fallback_enabled", {
      scope: "listUsageLedger",
      message: error instanceof Error ? error.message : String(error),
    });

    return listSupabaseAiUsageLedger();
  }
}
export async function getOrCreateSubscription(
  sellerId: string,
  sellerEmail: string,
  planKey: SubscriptionRecord["planKey"],
  monthlyCredits: number,
) {
  try {
    return await prismaGetOrCreateSubscription(sellerId, sellerEmail, planKey, monthlyCredits);
  } catch (error) {
    if (!isPrismaAiFallbackError(error)) {
      throw error;
    }

    logAiFallbackEvent("supabase_fallback_enabled", {
      scope: "getOrCreateSubscription",
      sellerId,
      message: error instanceof Error ? error.message : String(error),
    });

    const { subscription } = await buildSupabaseSubscriptionRecord({
      sellerId,
      sellerEmail,
      planKey,
      monthlyCredits,
    });

    return subscription;
  }
}

export async function consumeCredits(input: ConsumeCreditsInput): Promise<AiCreditConsumeResult> {
  try {
    return await prismaConsumeCredits(input);
  } catch (error) {
    if (!isPrismaAiFallbackError(error)) {
      throw error;
    }

    logAiFallbackEvent("supabase_fallback_enabled", {
      scope: "consumeCredits",
      sellerId: input.sellerId,
      provider: input.provider,
      action: input.action,
      message: error instanceof Error ? error.message : String(error),
    });

    if (isMissingPrismaUserTableError(error) && hasRealDatabaseUrl()) {
      return consumeCreditsWithSupabaseTablesAtomic(input);
    }

    logAiFallbackEvent("atomic_reservation_unavailable", {
      sellerId: input.sellerId,
      sellerEmail: input.sellerEmail,
      provider: input.provider,
      action: input.action,
    });
    throw new Error("Atomic AI credit reservation is temporarily unavailable.");
  }
}

export async function refundCredits(idempotencyKey: string) {
  try {
    return await prismaRefundCredits(idempotencyKey);
  } catch (error) {
    if (!isPrismaAiFallbackError(error)) {
      throw error;
    }

    logAiFallbackEvent("supabase_fallback_enabled", {
      scope: "refundCredits",
      idempotencyKey,
      message: error instanceof Error ? error.message : String(error),
    });

    if (isMissingPrismaUserTableError(error) && hasRealDatabaseUrl()) {
      return refundCreditsWithSupabaseTablesAtomic(idempotencyKey);
    }

    const { data, error: selectError } = await getSupabaseServerAdminClient()
      .from("admin_audit_logs")
      .select("id, target_id, metadata_json, created_at")
      .eq("action", "ai.usage")
      .eq("target_type", "ai_usage")
      .eq("target_id", idempotencyKey)
      .maybeSingle();

    if (selectError) {
      throw new Error(`Unable to load AI usage for refund: ${selectError.message}`);
    }

    const entry = data ? coerceSupabaseAiUsageEntry(data) : null;

    if (!entry || entry.refundedCredits > 0) {
      return entry;
    }

    const nextMetadata: SupabaseAiUsageMetadata = {
      ...(isRecord(data?.metadata_json) ? (data?.metadata_json as SupabaseAiUsageMetadata) : {}),
      refundedCredits: entry.creditsUsed,
      status: "refunded",
    };

    const { data: updatedData, error: updateError } = await getSupabaseServerAdminClient()
      .from("admin_audit_logs")
      .update({
        metadata_json: nextMetadata,
      })
      .eq("id", entry.id)
      .select("id, target_id, metadata_json, created_at")
      .single();

    if (updateError) {
      throw new Error(`Unable to refund AI usage: ${updateError.message}`);
    }

    logAiFallbackEvent("usage_refunded", {
      idempotencyKey,
      refundedCredits: entry.creditsUsed,
    });

    return updatedData ? coerceSupabaseAiUsageEntry(updatedData) : null;
  }
}

export async function listSellerProfiles() {
  let profiles: SellerProfileDraft[] = [];
  let subscriptions: SubscriptionRecord[] = [];

  try {
    [profiles, subscriptions] = await Promise.all([
      prismaListSellerProfiles(),
      prismaListSubscriptions(),
    ]);
  } catch (error) {
    if (!isPrismaAiFallbackError(error)) {
      logDatabaseFallback("listSellerProfiles", error);
      return [];
    }

    profiles = await listSupabaseSellerProfiles();
    subscriptions = await Promise.all(
      profiles.map(async (profile) => {
        const { subscription } = await buildSupabaseSubscriptionRecord({
          sellerId: profile.email,
          sellerEmail: profile.email,
          planKey: normalizePlanKey(profile.sellerPlanKey),
          monthlyCredits: getFallbackMonthlyCredits(normalizePlanKey(profile.sellerPlanKey)),
        });

        return subscription;
      }),
    );
  }

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
  if (!(await requirePrismaTable("saveSellerProfile", "SellerProfile"))) {
    return profile;
  }

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
  if (!hasRealDatabaseUrl() && !hasSupabaseServerEnv()) {
    return null;
  }

  try {
    if (hasRealDatabaseUrl()) {
      const rows = await prisma.$queryRaw<SupabaseAiActionCacheRow[]>`
        SELECT id, target_id, metadata_json, created_at
        FROM public.admin_audit_logs
        WHERE action = 'ai.cache'
          AND target_type = 'ai_action_cache'
          AND target_id = ${_input.cacheKey}
        ORDER BY created_at DESC
        LIMIT 1
      `;

      const entry = rows
        .map((row) => coerceSupabaseAiActionCacheEntry(row))
        .find((value): value is AiActionCacheRecord => Boolean(value));

      return entry ? { result: entry.result } : null;
    }

    const { data, error } = await getSupabaseServerAdminClient()
      .from("admin_audit_logs")
      .select("id, target_id, metadata_json, created_at")
      .eq("action", "ai.cache")
      .eq("target_type", "ai_action_cache")
      .eq("target_id", _input.cacheKey)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    const entry = data ? coerceSupabaseAiActionCacheEntry(data) : null;
    return entry ? { result: entry.result } : null;
  } catch (error) {
    logDatabaseFallback("findAiActionCacheEntry", error);
    return null;
  }
}

export async function saveAiActionCacheEntry(input: {
  sellerId: string;
  action: AiActionCacheRecord["action"];
  provider: AiActionCacheRecord["provider"];
  cacheKey: string;
  result: AIProviderResult;
}) {
  const metadata = {
    schemaVersion: 1,
    sellerId: input.sellerId,
    action: input.action,
    provider: input.provider,
    cacheKey: input.cacheKey,
    result: input.result,
  } satisfies SupabaseAiActionCacheMetadata;

  if (!hasRealDatabaseUrl() && !hasSupabaseServerEnv()) {
    return {
      id: buildAiActionCacheLogId(input.cacheKey),
      sellerId: input.sellerId,
      action: input.action,
      provider: input.provider,
      cacheKey: input.cacheKey,
      result: input.result,
      createdAt: new Date().toISOString(),
    } satisfies AiActionCacheRecord;
  }

  try {
    if (hasRealDatabaseUrl()) {
      const rows = await prisma.$queryRaw<SupabaseAiActionCacheRow[]>`
        INSERT INTO public.admin_audit_logs (id, actor_user_id, action, target_type, target_id, metadata_json)
        VALUES (
          ${buildAiActionCacheLogId(input.cacheKey)},
          NULL,
          'ai.cache',
          'ai_action_cache',
          ${input.cacheKey},
          ${JSON.parse(JSON.stringify(metadata)) as Prisma.InputJsonValue}::jsonb
        )
        ON CONFLICT (id)
        DO UPDATE SET metadata_json = EXCLUDED.metadata_json
        RETURNING id, target_id, metadata_json, created_at
      `;

      const entry = rows
        .map((row) => coerceSupabaseAiActionCacheEntry(row))
        .find((value): value is AiActionCacheRecord => Boolean(value));

      return entry;
    }

    const { data, error } = await getSupabaseServerAdminClient()
      .from("admin_audit_logs")
      .upsert({
        id: buildAiActionCacheLogId(input.cacheKey),
        actor_user_id: null,
        action: "ai.cache",
        target_type: "ai_action_cache",
        target_id: input.cacheKey,
        metadata_json: metadata,
      })
      .select("id, target_id, metadata_json, created_at")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data ? coerceSupabaseAiActionCacheEntry(data) : null;
  } catch (error) {
    logDatabaseFallback("saveAiActionCacheEntry", error);
    return {
      id: buildAiActionCacheLogId(input.cacheKey),
      sellerId: input.sellerId,
      action: input.action,
      provider: input.provider,
      cacheKey: input.cacheKey,
      result: input.result,
      createdAt: new Date().toISOString(),
    } satisfies AiActionCacheRecord;
  }
}

export async function findListingAssistCacheEntry(input: {
  sellerId: string;
  action: UsageLedgerEntry["action"];
  provider: UsageLedgerEntry["provider"];
  cacheKey: string;
}): Promise<{ result: ListingAssistResult } | null> {
  if (!hasRealDatabaseUrl() && !hasSupabaseServerEnv()) {
    return null;
  }

  try {
    if (hasRealDatabaseUrl()) {
      const rows = await prisma.$queryRaw<SupabaseListingAssistCacheRow[]>`
        SELECT id, target_id, metadata_json, created_at
        FROM public.admin_audit_logs
        WHERE action = 'ai.cache'
          AND target_type = 'listing_assist_cache'
          AND target_id = ${input.cacheKey}
        ORDER BY created_at DESC
        LIMIT 1
      `;

      const entry = rows
        .map((row) => coerceSupabaseListingAssistCacheEntry(row))
        .find((value): value is NonNullable<typeof value> => Boolean(value));

      return entry ? { result: entry.result } : null;
    }

    const { data, error } = await getSupabaseServerAdminClient()
      .from("admin_audit_logs")
      .select("id, target_id, metadata_json, created_at")
      .eq("action", "ai.cache")
      .eq("target_type", "listing_assist_cache")
      .eq("target_id", input.cacheKey)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    const entry = data ? coerceSupabaseListingAssistCacheEntry(data) : null;
    return entry ? { result: entry.result } : null;
  } catch (error) {
    logDatabaseFallback("findListingAssistCacheEntry", error);
    return null;
  }
}

export async function saveListingAssistCacheEntry(input: {
  sellerId: string;
  action: UsageLedgerEntry["action"];
  provider: UsageLedgerEntry["provider"];
  cacheKey: string;
  result: ListingAssistResult;
}) {
  const metadata = {
    schemaVersion: 1,
    sellerId: input.sellerId,
    action: input.action,
    provider: input.provider,
    cacheKey: input.cacheKey,
    result: input.result,
  } satisfies SupabaseListingAssistCacheMetadata;

  if (!hasRealDatabaseUrl() && !hasSupabaseServerEnv()) {
    return {
      id: buildListingAssistCacheLogId(input.cacheKey),
      sellerId: input.sellerId,
      action: input.action,
      provider: input.provider,
      cacheKey: input.cacheKey,
      result: input.result,
      createdAt: new Date().toISOString(),
    };
  }

  try {
    if (hasRealDatabaseUrl()) {
      const rows = await prisma.$queryRaw<SupabaseListingAssistCacheRow[]>`
        INSERT INTO public.admin_audit_logs (id, actor_user_id, action, target_type, target_id, metadata_json)
        VALUES (
          ${buildListingAssistCacheLogId(input.cacheKey)},
          NULL,
          'ai.cache',
          'listing_assist_cache',
          ${input.cacheKey},
          ${JSON.parse(JSON.stringify(metadata)) as Prisma.InputJsonValue}::jsonb
        )
        ON CONFLICT (id)
        DO UPDATE SET metadata_json = EXCLUDED.metadata_json
        RETURNING id, target_id, metadata_json, created_at
      `;

      return rows
        .map((row) => coerceSupabaseListingAssistCacheEntry(row))
        .find((value): value is NonNullable<typeof value> => Boolean(value));
    }

    const { data, error } = await getSupabaseServerAdminClient()
      .from("admin_audit_logs")
      .upsert({
        id: buildListingAssistCacheLogId(input.cacheKey),
        actor_user_id: null,
        action: "ai.cache",
        target_type: "listing_assist_cache",
        target_id: input.cacheKey,
        metadata_json: metadata,
      })
      .select("id, target_id, metadata_json, created_at")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data ? coerceSupabaseListingAssistCacheEntry(data) : null;
  } catch (error) {
    logDatabaseFallback("saveListingAssistCacheEntry", error);
    return {
      id: buildListingAssistCacheLogId(input.cacheKey),
      sellerId: input.sellerId,
      action: input.action,
      provider: input.provider,
      cacheKey: input.cacheKey,
      result: input.result,
      createdAt: new Date().toISOString(),
    };
  }
}
