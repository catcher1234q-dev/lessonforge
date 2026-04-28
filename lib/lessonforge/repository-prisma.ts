import {
  randomUUID,
} from "node:crypto";

import {
  AiAction,
  PlanKey,
  Prisma,
  ProductStatus,
  ProductAssetType,
  ResourceType,
  ReviewStatus,
  RolloverPolicy,
  SubscriptionStatus,
  UsageEntryType,
  UserRole,
  type CreditBalance,
  type Product,
  type SellerProfile,
  type Subscription,
  type UsageLedger,
  type User,
} from "@prisma/client";

import {
  buildStoredAssetPaths,
  inferProductAssetType,
} from "@/lib/lessonforge/preview-assets";
import {
  deserializeProductGallery,
  serializeProductGallery,
} from "@/lib/lessonforge/product-gallery";
import { prisma } from "@/lib/prisma/client";
import type {
  AdminAuditLog,
  FavoriteRecord,
  OrderRecord,
  ProductRecord,
  RefundRequestRecord,
  ReportRecord,
  ReviewRecord,
  SubscriptionRecord,
  UsageLedgerEntry,
  ViewerRole,
  SellerProfileDraft,
} from "@/types";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function resolveUniqueProductSlug(input: { id: string; title: string }) {
  const slugBase = slugify(input.title) || "resource";
  const preferredSlug = input.id.startsWith("upload-")
    ? slugBase
    : `${slugBase}-${slugify(input.id) || input.id.toLowerCase()}`;

  const conflictingProduct = await prisma.product.findFirst({
    where: {
      slug: preferredSlug,
      NOT: {
        id: input.id,
      },
    },
    select: {
      id: true,
    },
  });

  if (!conflictingProduct) {
    return preferredSlug;
  }

  const stableSuffix = slugify(input.id).replace(/^upload-/, "") || slugify(input.id) || "draft";
  return `${slugBase}-${stableSuffix}`;
}

function normalizeBuyerEmail(value: string) {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return `${normalized || "buyer"}@lessonforge.demo`;
}

function asUuidOrNull(value?: string | null) {
  if (!value) {
    return null;
  }

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  )
    ? value
    : null;
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

function mapPlanKey(planKey: SubscriptionRecord["planKey"]) {
  switch (planKey) {
    case "basic":
      return PlanKey.BASIC;
    case "pro":
      return PlanKey.PRO;
    default:
      return PlanKey.STARTER;
  }
}

function unmapPlanKey(planKey: PlanKey): SubscriptionRecord["planKey"] {
  switch (planKey) {
    case PlanKey.BASIC:
      return "basic";
    case PlanKey.PRO:
      return "pro";
    default:
      return "starter";
  }
}

function mapProductStatus(status?: ProductRecord["productStatus"]) {
  switch (status) {
    case "Pending review":
      return ProductStatus.PENDING_REVIEW;
    case "Published":
      return ProductStatus.PUBLISHED;
    case "Flagged":
      return ProductStatus.FLAGGED;
    case "Rejected":
      return ProductStatus.REJECTED;
    case "Removed":
      return ProductStatus.REMOVED;
    default:
      return ProductStatus.DRAFT;
  }
}

function unmapProductStatus(status: ProductStatus): NonNullable<ProductRecord["productStatus"]> {
  switch (status) {
    case ProductStatus.PENDING_REVIEW:
      return "Pending review";
    case ProductStatus.PUBLISHED:
      return "Published";
    case ProductStatus.FLAGGED:
      return "Flagged";
    case ProductStatus.REJECTED:
      return "Rejected";
    case ProductStatus.REMOVED:
      return "Removed";
    default:
      return "Draft";
  }
}

type CreditCycleWindow = {
  startsAt: Date;
  endsAt: Date;
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
    startsAt,
    endsAt,
    label: `${label} billing cycle`,
  };
}

function mapReportCategory(category: ReportRecord["category"]) {
  switch (category) {
    case "Broken file":
      return "BROKEN_FILE";
    case "Copyright":
      return "COPYRIGHT";
    case "Misleading listing":
      return "MISLEADING_LISTING";
    case "Low quality":
      return "LOW_QUALITY";
    case "Spam":
      return "SPAM";
    default:
      return "ACCESS_ISSUE";
  }
}

function unmapReportCategory(category: string): ReportRecord["category"] {
  switch (category) {
    case "BROKEN_FILE":
      return "Broken file";
    case "COPYRIGHT":
      return "Copyright";
    case "MISLEADING_LISTING":
      return "Misleading listing";
    case "LOW_QUALITY":
      return "Low quality";
    case "SPAM":
      return "Spam";
    default:
      return "Access issue";
  }
}

function mapModerationStatus(status: ReportRecord["status"]) {
  switch (status) {
    case "Under review":
      return "UNDER_REVIEW";
    case "Resolved":
      return "RESOLVED";
    case "Dismissed":
      return "DISMISSED";
    default:
      return "OPEN";
  }
}

function unmapModerationStatus(status: string): ReportRecord["status"] {
  switch (status) {
    case "UNDER_REVIEW":
      return "Under review";
    case "RESOLVED":
      return "Resolved";
    case "DISMISSED":
      return "Dismissed";
    default:
      return "Open";
  }
}

function splitReportDetails(value: string) {
  const marker = "\n\n--- Original report ---\n";

  if (!value.includes(marker)) {
    return {
      adminResolutionNote: undefined,
      details: value,
    };
  }

  const [adminResolutionNote, details] = value.split(marker);

  return {
    adminResolutionNote: adminResolutionNote.trim() || undefined,
    details: details?.trim() || "",
  };
}

function mapResourceType(format: string): ResourceType {
  const lower = format.toLowerCase();

  if (lower.includes("intervention")) {
    return ResourceType.INTERVENTION_RESOURCE;
  }
  if (lower.includes("slide")) {
    return ResourceType.SLIDE_DECK;
  }
  if (lower.includes("warm")) {
    return ResourceType.WARM_UP;
  }
  if (lower.includes("lab")) {
    return ResourceType.LAB;
  }
  if (lower.includes("assessment") || lower.includes("quiz")) {
    return ResourceType.ASSESSMENT;
  }

  return ResourceType.SUPPLEMENTAL_TOOL;
}

function mapAiAction(action: UsageLedgerEntry["action"]) {
  switch (action) {
    case "titleSuggestion":
      return AiAction.TITLE_SUGGESTION;
    case "descriptionRewrite":
      return AiAction.DESCRIPTION_REWRITE;
    case "thumbnailGeneration":
      return AiAction.THUMBNAIL_GENERATION;
    case "previewGeneration":
      return AiAction.PREVIEW_GENERATION;
    default:
      return AiAction.STANDARDS_SCAN;
  }
}

function unmapAiAction(action: AiAction): UsageLedgerEntry["action"] {
  switch (action) {
    case AiAction.TITLE_SUGGESTION:
      return "titleSuggestion";
    case AiAction.DESCRIPTION_REWRITE:
      return "descriptionRewrite";
    case AiAction.THUMBNAIL_GENERATION:
      return "thumbnailGeneration";
    case AiAction.PREVIEW_GENERATION:
      return "previewGeneration";
    default:
      return "standardsScan";
  }
}

function toSellerProfileDraft(profile: SellerProfile & { user: User }): SellerProfileDraft {
  return {
    displayName: profile.user.name ?? profile.storeName,
    email: profile.user.email,
    storeName: profile.storeName,
    storeHandle: profile.storeHandle,
    primarySubject: "Math",
    tagline: profile.bio ?? "",
    sellerPlanKey: "starter",
    onboardingCompleted: Boolean(profile.onboardingCompletedAt),
    stripeAccountId: profile.stripeAccountId ?? undefined,
    stripeOnboardingStatus: profile.stripeOnboardingStatus ?? undefined,
    stripeChargesEnabled: profile.stripeChargesEnabled,
    stripePayoutsEnabled: profile.stripePayoutsEnabled,
  };
}

function toProductRecord(
  product: Product & {
    seller: User;
    sellerProfile: SellerProfile | null;
    assets?: Array<{
      storageKey: string;
      previewUrl: string | null;
      originalUrl: string | null;
      versionNumber: number;
      isPreview: boolean;
    }>;
  },
): ProductRecord {
  const imageGallery = deserializeProductGallery(product.id, product.previewImageUrls);
  const previewAssets = (product.assets ?? []).filter(
    (asset) => asset.isPreview && !asset.storageKey.includes("/gallery/"),
  );
  const originalAsset = (product.assets ?? []).find(
    (asset) => !asset.isPreview && !asset.storageKey.includes("/gallery/"),
  );
  const coverImage = imageGallery[0] ?? null;
  const previewGalleryImages = imageGallery.slice(1);

  return {
    id: product.id,
    title: product.title,
    subject: product.subject,
    gradeBand: product.gradeBand,
    standardsTag: product.standardsSummary ?? "Standards pending",
    updatedAt:
      product.status === ProductStatus.PUBLISHED
        ? "Published from database"
        : "Saved in database",
    format: product.fileTypesSummary[0] ?? "Uploaded Resource",
    summary: product.shortDescription,
    demoOnly: false,
    shortDescription: product.shortDescription,
    fullDescription: product.fullDescription,
    licenseType:
      product.primaryLicenseType === "MULTIPLE_CLASSROOM"
        ? "Multiple classroom"
        : "Single classroom",
    fileTypes: product.fileTypesSummary,
    thumbnailUrl: coverImage?.coverUrl ?? product.thumbnailUrl ?? undefined,
    previewAssetUrls:
      previewGalleryImages.length > 0
        ? previewGalleryImages.map((image) => image.previewUrl)
        : previewAssets
            .map((asset) => asset.previewUrl)
            .filter((value): value is string => Boolean(value)),
    originalAssetUrl: originalAsset?.originalUrl ?? undefined,
    assetVersionNumber: originalAsset?.versionNumber ?? previewAssets[0]?.versionNumber ?? 1,
    includedItems: product.whatIsIncluded
      ? product.whatIsIncluded.split("\n").filter(Boolean)
      : [],
    freshnessScore: product.freshnessScore,
    sellerName: product.seller.name ?? product.sellerProfile?.storeName ?? "Seller",
    sellerHandle: product.sellerProfile?.storeHandle
      ? `@${product.sellerProfile.storeHandle}`
      : "@lessonforge-seller",
    sellerId: product.seller.email,
    sellerStripeAccountId: product.sellerProfile?.stripeAccountId ?? undefined,
    priceCents: product.basePriceCents,
    isPurchasable:
      product.status === ProductStatus.PUBLISHED &&
      Boolean(product.sellerProfile?.stripeAccountId),
    productStatus: unmapProductStatus(product.status),
    previewIncluded: product.previewIncluded,
    thumbnailIncluded: product.thumbnailIncluded,
    rightsConfirmed: product.rightsConfirmed,
    moderationFeedback: product.moderationNotes ?? undefined,
    createdPath: product.isAiAssisted ? "AI assisted" : "Manual upload",
    imageGallery,
  };
}

function toSubscriptionRecord(
  user: User,
  subscription: Subscription,
  creditBalance: CreditBalance | null,
  fallbackAvailableCredits?: number,
): SubscriptionRecord {
  const cycleDate = creditBalance?.cycleStartedAt ?? subscription.currentPeriodStart ?? new Date();
  const cycle = getCurrentCreditCycle(cycleDate);

  return {
    sellerId: user.email,
    sellerEmail: user.email,
    planKey: unmapPlanKey(subscription.planKey),
    monthlyCredits: subscription.monthlyCreditAllowance,
    availableCredits: creditBalance?.availableCredits ?? fallbackAvailableCredits ?? 0,
    cycleLabel: cycle.label,
    rolloverPolicy: "none",
  };
}

function isMissingTableError(error: unknown, tableNames: string[]) {
  const message = error instanceof Error ? error.message : String(error);
  const normalized = message.toLowerCase();

  return tableNames.some((tableName) => {
    const table = tableName.toLowerCase();
    const compactTable = table.replace(/_/g, "");

    return (
      normalized.includes(`public.${table}`) ||
      normalized.includes(`table \`${table}\``) ||
      normalized.includes(`relation "${table}"`) ||
      normalized.includes(table) ||
      normalized.includes(compactTable)
    );
  });
}

async function aggregateUsedCreditsForCycle(input: {
  userId: string;
  startsAt: Date;
  endsAt: Date;
}) {
  const aggregate = await prisma.usageLedger.aggregate({
    where: {
      userId: input.userId,
      createdAt: {
        gte: input.startsAt,
        lt: input.endsAt,
      },
    },
    _sum: {
      creditsUsed: true,
      refundedCredits: true,
    },
  });

  const used = aggregate._sum.creditsUsed ?? 0;
  const refunded = aggregate._sum.refundedCredits ?? 0;

  return Math.max(0, used - refunded);
}

async function getAvailableCreditsWithoutBalanceTable(input: {
  userId: string;
  monthlyCredits: number;
  startsAt: Date;
  endsAt: Date;
}) {
  const usedCredits = await aggregateUsedCreditsForCycle(input);
  return Math.max(0, input.monthlyCredits - usedCredits);
}

function toUsageLedgerEntryRecord(
  entry: UsageLedger & { user: User },
): UsageLedgerEntry {
  return {
    id: entry.id,
    sellerId: entry.user.email,
    action: unmapAiAction(entry.action),
    creditsUsed: entry.creditsUsed,
    refundedCredits: entry.refundedCredits,
    status: entry.refundedCredits > 0 ? "refunded" : "applied",
    provider: entry.providerName === "gemini" ? "gemini" : "openai",
    idempotencyKey: entry.idempotencyKey,
    createdAt: entry.createdAt.toISOString(),
  };
}

async function ensureUser(input: {
  email: string;
  name?: string;
  role: UserRole;
}) {
  return prisma.user.upsert({
    where: { email: input.email },
    update: {
      name: input.name ?? undefined,
      role: input.role,
    },
    create: {
      id: randomUUID(),
      email: input.email,
      name: input.name ?? null,
      role: input.role,
    },
  });
}

async function ensureSellerProfileForUser(user: User, draft?: Partial<SellerProfileDraft>) {
  const existing = await prisma.sellerProfile.findUnique({
    where: { userId: user.id },
  });

  if (existing) {
    return existing;
  }

  return prisma.sellerProfile.create({
    data: {
      userId: user.id,
      storeName: draft?.storeName ?? user.name ?? "LessonForge Seller",
      storeHandle:
        draft?.storeHandle && draft.storeHandle.length > 0
          ? draft.storeHandle
          : slugify(user.name ?? user.email.split("@")[0] ?? "seller"),
      bio: draft?.tagline ?? null,
      onboardingCompletedAt: draft?.onboardingCompleted ? new Date() : null,
      stripeAccountId: draft?.stripeAccountId ?? null,
      stripeOnboardingStatus: draft?.stripeOnboardingStatus ?? null,
      stripeChargesEnabled: draft?.stripeChargesEnabled ?? false,
      stripePayoutsEnabled: draft?.stripePayoutsEnabled ?? false,
    },
  });
}

async function ensureProductShadowRecord(input: {
  productId: string;
  productTitle: string;
  sellerUser: User;
  sellerProfile: SellerProfile | null;
}) {
  const existing = await prisma.product.findUnique({
    where: { id: input.productId },
  });

  if (existing) {
    return existing;
  }

  const assetPaths = buildStoredAssetPaths({
    productId: input.productId,
    title: input.productTitle,
    format: "Uploaded Resource",
  });

  return prisma.product.create({
    data: {
      id: input.productId,
      sellerId: input.sellerUser.id,
      sellerProfileId: input.sellerProfile?.id ?? null,
      slug: slugify(input.productTitle),
      title: input.productTitle,
      shortDescription: "Uploaded material imported for marketplace flow support",
      fullDescription: "Uploaded material imported for marketplace flow support",
      whatIsIncluded: "Uploaded resource files and preview assets",
      resourceType: mapResourceType("Uploaded Resource"),
      status: ProductStatus.PUBLISHED,
      basePriceCents: 0,
      previewImageUrls: [],
      fileTypesSummary: ["Uploaded Resource"],
      subject: "General",
      gradeBand: "K-12",
      standardsSummary: null,
      primaryLicenseType: "SINGLE_CLASSROOM",
      freshnessScore: 4,
      boostScore: 4,
      publishedAt: new Date(),
      assets: {
        create: [
          ...assetPaths.previewUrls.map((previewUrl, index) => ({
            assetType: inferProductAssetType("Uploaded Resource") as ProductAssetType,
            storageKey: `${input.productId}/preview-${index + 1}`,
            fileName: `${slugify(input.productTitle)}-preview-${index + 1}.svg`,
            previewUrl,
            originalUrl: null,
            isPreview: true,
            mimeType: "image/svg+xml",
            fileSizeBytes: 0,
            versionNumber: assetPaths.assetVersionNumber,
          })),
          {
            assetType: inferProductAssetType("Uploaded Resource") as ProductAssetType,
            storageKey: `${input.productId}/original`,
            fileName: `${slugify(input.productTitle)}-original`,
            originalUrl: assetPaths.originalUrl,
            previewUrl: null,
            isPreview: false,
            mimeType: "application/octet-stream",
            fileSizeBytes: 0,
            versionNumber: assetPaths.assetVersionNumber,
          },
        ],
      },
    } as Prisma.ProductUncheckedCreateInput,
  });
}

export async function prismaListPersistedProducts() {
  const products = await prisma.product.findMany({
    include: {
      seller: true,
      sellerProfile: true,
      assets: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  return products.map(toProductRecord);
}

export async function prismaListAdminAuditLogs() {
  const logs = await prisma.adminAuditLog.findMany({
    include: {
      actor: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 50,
  });

  return logs.map((entry) => ({
    id: entry.id,
    actorEmail: entry.actor?.email ?? undefined,
    actorRole:
      entry.actor?.role === UserRole.OWNER
        ? "owner"
        : entry.actor?.role === UserRole.ADMIN
          ? "admin"
          : undefined,
    action: entry.action,
    targetType: entry.targetType,
    targetId: entry.targetId,
    metadata:
      entry.metadataJson && typeof entry.metadataJson === "object"
        ? (entry.metadataJson as Record<string, unknown>)
        : undefined,
    createdAt: entry.createdAt.toISOString(),
  })) satisfies AdminAuditLog[];
}

export async function prismaSaveAdminAuditLog(entry: AdminAuditLog) {
  const actorRole = mapViewerRoleToUserRole(entry.actorRole);
  const actor =
    entry.actorEmail && actorRole
      ? await ensureUser({
          email: entry.actorEmail,
          name: entry.actorEmail.split("@")[0] ?? entry.actorEmail,
          role: actorRole,
        })
      : null;

  const created = await prisma.adminAuditLog.create({
    data: {
      id: entry.id,
      actorUserId: asUuidOrNull(actor?.id),
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId,
      metadataJson: entry.metadata ? (entry.metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
      createdAt: new Date(entry.createdAt),
    },
    include: {
      actor: true,
    },
  });

  return {
    id: created.id,
    actorEmail: created.actor?.email ?? undefined,
    actorRole:
      created.actor?.role === UserRole.OWNER
        ? "owner"
        : created.actor?.role === UserRole.ADMIN
          ? "admin"
          : undefined,
    action: created.action,
    targetType: created.targetType,
    targetId: created.targetId,
    metadata:
      created.metadataJson && typeof created.metadataJson === "object"
        ? (created.metadataJson as Record<string, unknown>)
        : undefined,
    createdAt: created.createdAt.toISOString(),
  } satisfies AdminAuditLog;
}

export async function prismaSaveSellerProfile(profile: SellerProfileDraft) {
  const user = await ensureUser({
    email: profile.email,
    name: profile.displayName,
    role: UserRole.USER,
  });

  await prisma.sellerProfile.upsert({
    where: { userId: user.id },
    update: {
      storeName: profile.storeName,
      storeHandle: profile.storeHandle || slugify(profile.displayName),
      bio: profile.tagline || null,
      onboardingCompletedAt: profile.onboardingCompleted ? new Date() : null,
      stripeAccountId: profile.stripeAccountId ?? null,
      stripeOnboardingStatus: profile.stripeOnboardingStatus ?? null,
      stripeChargesEnabled: profile.stripeChargesEnabled ?? false,
      stripePayoutsEnabled: profile.stripePayoutsEnabled ?? false,
    },
    create: {
      userId: user.id,
      storeName: profile.storeName,
      storeHandle: profile.storeHandle || slugify(profile.displayName),
      bio: profile.tagline || null,
      onboardingCompletedAt: profile.onboardingCompleted ? new Date() : null,
      stripeAccountId: profile.stripeAccountId ?? null,
      stripeOnboardingStatus: profile.stripeOnboardingStatus ?? null,
      stripeChargesEnabled: profile.stripeChargesEnabled ?? false,
      stripePayoutsEnabled: profile.stripePayoutsEnabled ?? false,
    },
  });

  return profile;
}

export async function prismaListSellerProfiles() {
  const profiles = await prisma.sellerProfile.findMany({
    include: {
      user: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  return profiles.map(toSellerProfileDraft);
}

export async function prismaSaveProduct(product: ProductRecord) {
  const sellerEmail =
    product.sellerId && product.sellerId.includes("@")
      ? product.sellerId
      : `${slugify(product.sellerName ?? "seller")}@lessonforge.local`;

  const sellerUser = await ensureUser({
    email: sellerEmail,
    name: product.sellerName ?? "LessonForge Seller",
    role: UserRole.USER,
  });
  const sellerProfile = await ensureSellerProfileForUser(sellerUser, {
    storeName: product.sellerName ?? "LessonForge Seller",
    storeHandle: product.sellerHandle?.replace(/^@/, "") ?? slugify(product.sellerName ?? "seller"),
    tagline: "",
    onboardingCompleted: true,
  });

  const slug = await resolveUniqueProductSlug({
    id: product.id,
    title: product.title,
  });
  const assetPaths = buildStoredAssetPaths({
    productId: product.id,
    title: product.title,
    format: product.format,
  });

  await prisma.product.upsert({
    where: { id: product.id },
    update: {
      sellerId: sellerUser.id,
      sellerProfileId: sellerProfile.id,
      slug,
      title: product.title,
      shortDescription: product.summary,
      fullDescription: product.fullDescription ?? product.summary,
      whatIsIncluded: (product.includedItems ?? []).join("\n"),
      moderationNotes: product.moderationFeedback ?? null,
      resourceType: mapResourceType(product.format),
      status: mapProductStatus(product.productStatus),
      basePriceCents: product.priceCents ?? 0,
      thumbnailUrl: product.imageGallery?.[0]?.coverUrl ?? product.thumbnailUrl ?? assetPaths.thumbnailUrl,
      previewImageUrls: serializeProductGallery(product.imageGallery ?? []),
      previewIncluded: product.previewIncluded ?? false,
      thumbnailIncluded: product.thumbnailIncluded ?? false,
      rightsConfirmed: product.rightsConfirmed ?? false,
      fileTypesSummary: product.fileTypes?.length ? product.fileTypes : [product.format],
      subject: product.subject,
      gradeBand: product.gradeBand,
      standardsSummary: product.standardsTag,
      isAiAssisted: product.createdPath === "AI assisted",
      freshnessScore: product.freshnessScore ?? 4,
      boostScore: product.freshnessScore ?? 4,
      publishedAt: product.productStatus === "Published" ? new Date() : null,
    },
    create: {
      id: product.id,
      sellerId: sellerUser.id,
      sellerProfileId: sellerProfile.id,
      slug,
      title: product.title,
      shortDescription: product.summary,
      fullDescription: product.fullDescription ?? product.summary,
      whatIsIncluded: (product.includedItems ?? []).join("\n"),
      moderationNotes: product.moderationFeedback ?? null,
      resourceType: mapResourceType(product.format),
      status: mapProductStatus(product.productStatus),
      basePriceCents: product.priceCents ?? 0,
      thumbnailUrl: product.imageGallery?.[0]?.coverUrl ?? product.thumbnailUrl ?? assetPaths.thumbnailUrl,
      previewImageUrls: serializeProductGallery(product.imageGallery ?? []),
      previewIncluded: product.previewIncluded ?? false,
      thumbnailIncluded: product.thumbnailIncluded ?? false,
      rightsConfirmed: product.rightsConfirmed ?? false,
      fileTypesSummary: product.fileTypes?.length ? product.fileTypes : [product.format],
      subject: product.subject,
      gradeBand: product.gradeBand,
      standardsSummary: product.standardsTag,
      isAiAssisted: product.createdPath === "AI assisted",
      freshnessScore: product.freshnessScore ?? 4,
      boostScore: product.freshnessScore ?? 4,
      publishedAt: product.productStatus === "Published" ? new Date() : null,
    },
  });

  await prisma.productAsset.deleteMany({
    where: {
      productId: product.id,
      OR: [
        { storageKey: { contains: "/gallery/" } },
        { isPreview: true },
        { isPreview: false, storageKey: { endsWith: "/original" } },
      ],
    },
  });

  await prisma.productAsset.createMany({
    data: [
      ...(product.imageGallery?.map((image) => ({
        productId: product.id,
        assetType: "IMAGE" as ProductAssetType,
        storageKey: image.storagePath,
        fileName: image.fileName,
        originalUrl: image.storagePath,
        previewUrl: image.role === "cover" ? image.coverUrl : image.previewUrl,
        isPreview: image.role === "preview",
        mimeType: image.mimeType,
        fileSizeBytes: image.fileSizeBytes,
        versionNumber: product.assetVersionNumber ?? assetPaths.assetVersionNumber,
      })) ??
        assetPaths.previewUrls.map((previewUrl, index) => ({
          productId: product.id,
          assetType: inferProductAssetType(product.format) as ProductAssetType,
          storageKey: `${product.id}/preview-${index + 1}`,
          fileName: `${slugify(product.title)}-preview-${index + 1}.svg`,
          originalUrl: null,
          previewUrl,
          isPreview: true,
          mimeType: "image/svg+xml",
          fileSizeBytes: 0,
          versionNumber: product.assetVersionNumber ?? assetPaths.assetVersionNumber,
        }))),
      {
        productId: product.id,
        assetType: inferProductAssetType(product.format) as ProductAssetType,
        storageKey: `${product.id}/original`,
        fileName: `${slugify(product.title)}-original`,
        originalUrl: product.originalAssetUrl ?? assetPaths.originalUrl,
        previewUrl: null,
        isPreview: false,
        mimeType: "application/octet-stream",
        fileSizeBytes: 0,
        versionNumber: product.assetVersionNumber ?? assetPaths.assetVersionNumber,
      },
    ],
  });

  return product;
}

export async function prismaUpdateProductStatus(
  productId: string,
  nextStatus: NonNullable<ProductRecord["productStatus"]>,
  moderationFeedback?: string,
  _actor?: { email?: string; role?: ViewerRole },
) {
  const product = await prisma.product.update({
    where: { id: productId },
    data: {
      status: mapProductStatus(nextStatus),
      moderationNotes: moderationFeedback?.trim() || null,
      publishedAt: nextStatus === "Published" ? new Date() : null,
    },
    include: {
      seller: true,
      sellerProfile: true,
      assets: true,
    },
  });

  return toProductRecord(product);
}

export async function prismaListOrders(): Promise<OrderRecord[]> {
  const orders = await prisma.order.findMany({
    include: {
      buyer: true,
      items: {
        include: {
          product: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return orders.flatMap((order) =>
    order.items.map((item) => ({
      id: order.id,
      productId: item.productId,
      productTitle: item.product.title,
      buyerName: order.buyer.name ?? order.buyer.email,
      buyerEmail: order.buyer.email,
      sellerName: "",
      sellerId: item.sellerId,
      amountCents: item.unitPriceCents,
      sellerShareCents: item.sellerShareCents,
      platformShareCents: item.platformShareCents,
      paymentStatus:
        order.status === "FAILED"
          ? "failed"
          : order.status === "REFUNDED" || order.status === "PARTIALLY_REFUNDED"
            ? "refunded"
            : order.status === "PENDING" || order.status === "CANCELED"
              ? "pending"
              : "paid",
      stripeCheckoutSessionId: order.stripeCheckoutSessionId ?? undefined,
      stripePaymentIntentId: order.stripePaymentIntentId ?? undefined,
      versionLabel: `Version ${item.latestEligibleVersion ?? 1}`,
      accessType: "Download + linked asset",
      updatedLabel: "Current version",
      instructions:
        "Download the included files from your library. Linked Google assets can be opened from the same screen.",
      purchasedAt: order.createdAt.toISOString(),
    })),
  );
}

export async function prismaListFavorites() {
  const favorites = await prisma.favorite.findMany({
    include: {
      user: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return favorites.map((favorite) => ({
    id: favorite.id,
    userEmail: favorite.user.email,
    productId: favorite.productId,
    createdAt: favorite.createdAt.toISOString(),
  })) satisfies FavoriteRecord[];
}

export async function prismaToggleFavorite(userEmail: string, productId: string) {
  const user = await ensureUser({
    email: userEmail,
    name: userEmail.split("@")[0] ?? userEmail,
    role: UserRole.USER,
  });

  const existing = await prisma.favorite.findUnique({
    where: {
      userId_productId: {
        userId: user.id,
        productId,
      },
    },
    include: {
      user: true,
    },
  });

  if (existing) {
    await prisma.favorite.delete({
      where: { id: existing.id },
    });

    return {
      favorite: {
        id: existing.id,
        userEmail: existing.user.email,
        productId: existing.productId,
        createdAt: existing.createdAt.toISOString(),
      } satisfies FavoriteRecord,
      favorited: false,
    };
  }

  const created = await prisma.favorite.create({
    data: {
      userId: user.id,
      productId,
    },
    include: {
      user: true,
    },
  });

  return {
    favorite: {
      id: created.id,
      userEmail: created.user.email,
      productId: created.productId,
      createdAt: created.createdAt.toISOString(),
    } satisfies FavoriteRecord,
    favorited: true,
  };
}

export async function prismaSaveOrder(order: OrderRecord) {
  const buyer = await ensureUser({
    email: order.buyerEmail ?? "buyer@lessonforge.demo",
    name: order.buyerName ?? "Demo Buyer",
    role: UserRole.USER,
  });
  const sellerUser = await ensureUser({
    email:
      order.sellerId.includes("@") ? order.sellerId : `${slugify(order.sellerName)}@lessonforge.local`,
    name: order.sellerName,
    role: UserRole.USER,
  });
  const sellerProfile = await ensureSellerProfileForUser(sellerUser, {
    storeName: order.sellerName,
    onboardingCompleted: true,
  });
  const product = await ensureProductShadowRecord({
    productId: order.productId,
    productTitle: order.productTitle,
    sellerUser,
    sellerProfile,
  });

  await prisma.order.create({
    data: {
      id: order.id,
      buyerId: buyer.id,
      status: "PAID",
      subtotalCents: order.amountCents,
      totalCents: order.amountCents,
      totalAmount: order.amountCents,
      platformFee: order.platformShareCents,
      sellerEarnings: order.sellerShareCents,
      salesTaxAmount: 0,
      taxState: null,
      sellerShareCents: order.sellerShareCents,
      platformShareCents: order.platformShareCents,
      paidAt: new Date(order.purchasedAt),
      items: {
        create: {
          productId: product.id,
          sellerId: sellerUser.id,
          licenseType: "SINGLE_CLASSROOM",
          licenseSeatCount: 1,
          unitPriceCents: order.amountCents,
          sellerShareCents: order.sellerShareCents,
          platformShareCents: order.platformShareCents,
          latestEligibleVersion: 1,
        },
      },
    },
  });

  return order;
}

export async function prismaListReviews() {
  const reviews = await prisma.review.findMany({
    include: {
      product: true,
      buyer: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return reviews.map((review) => ({
    id: review.id,
    productId: review.productId,
    productTitle: review.product.title,
    rating: review.rating,
    title: review.title ?? "Verified purchase review",
    body: review.body ?? "",
    buyerName: review.buyer.name ?? review.buyer.email,
    buyerEmail: review.buyer.email,
    verifiedPurchase: review.verifiedPurchase,
    createdAt: review.createdAt.toISOString(),
  }));
}

export async function prismaSaveReview(review: ReviewRecord) {
  const buyer = await ensureUser({
    email: review.buyerEmail ?? normalizeBuyerEmail(review.buyerName),
    name: review.buyerName,
    role: UserRole.USER,
  });

  const orderItem = await prisma.orderItem.findFirst({
    where: {
      productId: review.productId,
      order: {
        buyerId: buyer.id,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!orderItem) {
    throw new Error("Only verified purchasers can leave a review.");
  }

  const created = await prisma.review.create({
    data: {
      id: review.id,
      productId: review.productId,
      buyerId: buyer.id,
      orderItemId: orderItem.id,
      rating: review.rating,
      title: review.title,
      body: review.body,
      status: ReviewStatus.VISIBLE,
      verifiedPurchase: true,
    },
    include: {
      product: true,
      buyer: true,
    },
  });

  return {
    id: created.id,
    productId: created.productId,
    productTitle: created.product.title,
    rating: created.rating,
    title: created.title ?? "Verified purchase review",
    body: created.body ?? "",
    buyerName: created.buyer.name ?? created.buyer.email,
    buyerEmail: created.buyer.email,
    verifiedPurchase: created.verifiedPurchase,
    createdAt: created.createdAt.toISOString(),
  };
}

export async function prismaListRefundRequests() {
  const refundRequests = await prisma.refundRequest.findMany({
    include: {
      order: {
        include: {
          buyer: true,
          items: {
            include: {
              product: true,
            },
          },
        },
      },
      sellerProfile: true,
    },
    orderBy: {
      submittedAt: "desc",
    },
  });

  return refundRequests.map((refund) => ({
    id: refund.id,
    orderId: refund.orderId,
    productId: refund.order.items[0]?.productId ?? "",
    productTitle: refund.order.items[0]?.product.title ?? "Product",
    buyerName: refund.order.buyer.name ?? refund.order.buyer.email,
    buyerEmail: refund.order.buyer.email,
    sellerName: refund.sellerProfile?.storeName ?? "Seller",
    reason: refund.reason,
    status:
      refund.status === "APPROVED"
        ? "Approved"
        : refund.status === "DENIED"
          ? "Denied"
          : "Submitted",
    adminResolutionNote: refund.adminResolutionNotes ?? undefined,
    requestedAt: refund.submittedAt.toISOString(),
  })) as RefundRequestRecord[];
}

export async function prismaListReports() {
  const reports = await prisma.report.findMany({
    include: {
      product: true,
      reporter: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return reports.map((report) => {
    const parsed = splitReportDetails(report.details);

    return {
      id: report.id,
      productId: report.productId,
      productTitle: report.product.title,
      reporterName: report.reporter.name ?? report.reporter.email,
      reporterEmail: report.reporter.email,
      category: unmapReportCategory(report.category),
      status: unmapModerationStatus(report.status),
      details: parsed.details,
      adminResolutionNote: parsed.adminResolutionNote,
      createdAt: report.createdAt.toISOString(),
    };
  }) as ReportRecord[];
}

export async function prismaSaveRefundRequest(refundRequest: RefundRequestRecord) {
  const buyer = await ensureUser({
    email: refundRequest.buyerEmail ?? "buyer@lessonforge.demo",
    name: refundRequest.buyerName ?? "Demo Buyer",
    role: UserRole.USER,
  });
  const order = await prisma.order.findUnique({
    where: { id: refundRequest.orderId },
    include: {
      items: true,
    },
  });

  if (!order) {
    throw new Error("Order not found for refund request.");
  }

  if (order.buyerId !== buyer.id) {
    throw new Error("This order does not belong to the current buyer.");
  }

  const created = await prisma.refundRequest.create({
    data: {
      id: refundRequest.id,
      orderId: refundRequest.orderId,
      orderItemId: order.items[0]?.id ?? null,
      buyerId: buyer.id,
      status: "SUBMITTED",
      reason: refundRequest.reason,
    },
  });

  return {
    ...refundRequest,
    id: created.id,
  };
}

export async function prismaUpdateRefundRequestStatus(
  refundRequestId: string,
  nextStatus: NonNullable<RefundRequestRecord["status"]>,
  adminResolutionNote?: string,
  _actor?: { email?: string; role?: ViewerRole },
) {
  const refundRequest = await prisma.refundRequest.update({
    where: { id: refundRequestId },
    data: {
      status:
        nextStatus === "Approved"
          ? "APPROVED"
          : nextStatus === "Denied"
            ? "DENIED"
            : "SUBMITTED",
      adminResolutionNotes: adminResolutionNote?.trim() || null,
      resolvedAt: nextStatus === "Submitted" ? null : new Date(),
    },
    include: {
      order: {
        include: {
          buyer: true,
          items: {
            include: {
              product: true,
            },
          },
        },
      },
      sellerProfile: true,
    },
  });

  return {
    id: refundRequest.id,
    orderId: refundRequest.orderId,
    productId: refundRequest.order.items[0]?.productId ?? "",
    productTitle: refundRequest.order.items[0]?.product.title ?? "Product",
    buyerName: refundRequest.order.buyer.name ?? refundRequest.order.buyer.email,
    buyerEmail: refundRequest.order.buyer.email,
    sellerName: refundRequest.sellerProfile?.storeName ?? "Seller",
    reason: refundRequest.reason,
    status: nextStatus,
    adminResolutionNote: refundRequest.adminResolutionNotes ?? undefined,
    requestedAt: refundRequest.submittedAt.toISOString(),
  } satisfies RefundRequestRecord;
}

export async function prismaSaveReport(report: ReportRecord) {
  const reporter = await ensureUser({
    email: report.reporterEmail ?? "buyer@lessonforge.demo",
    name: report.reporterName ?? "Demo Buyer",
    role: UserRole.USER,
  });

  const created = await prisma.report.create({
    data: {
      id: report.id,
      productId: report.productId,
      reporterId: reporter.id,
      category: mapReportCategory(report.category),
      status: mapModerationStatus(report.status),
      details: report.details,
    },
    include: {
      product: true,
      reporter: true,
    },
  });

  const parsed = splitReportDetails(created.details);

  return {
    id: created.id,
    productId: created.productId,
    productTitle: created.product.title,
    reporterName: created.reporter.name ?? created.reporter.email,
    reporterEmail: created.reporter.email,
    category: unmapReportCategory(created.category),
    status: unmapModerationStatus(created.status),
    details: parsed.details,
    adminResolutionNote: parsed.adminResolutionNote,
    createdAt: created.createdAt.toISOString(),
  } satisfies ReportRecord;
}

export async function prismaUpdateReportStatus(
  reportId: string,
  nextStatus: NonNullable<ReportRecord["status"]>,
  adminResolutionNote?: string,
  _actor?: { email?: string; role?: ViewerRole },
) {
  const current = await prisma.report.findUnique({
    where: { id: reportId },
  });

  if (!current) {
    throw new Error("Report not found.");
  }

  const currentParsed = splitReportDetails(current.details);
  const nextDetails = adminResolutionNote?.trim()
    ? `${adminResolutionNote.trim()}\n\n--- Original report ---\n${currentParsed.details}`
    : current.details;

  const report = await prisma.report.update({
    where: { id: reportId },
    data: {
      status: mapModerationStatus(nextStatus),
      details: nextDetails,
      resolvedAt: nextStatus === "Open" || nextStatus === "Under review" ? null : new Date(),
    },
    include: {
      product: true,
      reporter: true,
    },
  });

  const parsed = splitReportDetails(report.details);

  return {
    id: report.id,
    productId: report.productId,
    productTitle: report.product.title,
    reporterName: report.reporter.name ?? report.reporter.email,
    reporterEmail: report.reporter.email,
    category: unmapReportCategory(report.category),
    status: unmapModerationStatus(report.status),
    details: parsed.details,
    adminResolutionNote: parsed.adminResolutionNote,
    createdAt: report.createdAt.toISOString(),
  } satisfies ReportRecord;
}

export async function prismaListSubscriptions() {
  const subscriptions = await prisma.subscription.findMany({
    include: {
      user: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  let creditBalances: CreditBalance[] = [];

  try {
    creditBalances = await prisma.creditBalance.findMany();
  } catch (error) {
    if (!isMissingTableError(error, ["credit_balance", "creditbalance"])) {
      throw error;
    }
  }

  return subscriptions.map((subscription) =>
    toSubscriptionRecord(
      subscription.user,
      subscription,
      creditBalances.find((entry) => entry.userId === subscription.userId) ?? null,
    ),
  );
}

export async function prismaListUsageLedger() {
  const ledger = await prisma.usageLedger.findMany({
    include: {
      user: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return ledger.map(toUsageLedgerEntryRecord);
}

export async function prismaGetOrCreateSubscription(
  sellerId: string,
  sellerEmail: string,
  planKey: SubscriptionRecord["planKey"],
  monthlyCredits: number,
) {
  const cycle = getCurrentCreditCycle();
  const user = await ensureUser({
    email: sellerEmail,
    name: sellerId,
    role: UserRole.USER,
  });

  const existingSubscription = await prisma.subscription.findUnique({
    where: { userId: user.id },
  });
  let existingCreditBalance: CreditBalance | null = null;
  let useCreditBalanceTable = true;

  try {
    existingCreditBalance = await prisma.creditBalance.findUnique({
      where: { userId: user.id },
    });
  } catch (error) {
    if (!isMissingTableError(error, ["credit_balance", "creditbalance"])) {
      throw error;
    }

    useCreditBalanceTable = false;
    console.warn("[lessonforge.ai] credit balance table missing during subscription lookup", {
      sellerEmail,
    });
  }

  const planChanged =
    !existingSubscription ||
    mapPlanKey(planKey) !== existingSubscription.planKey ||
    existingSubscription.monthlyCreditAllowance !== monthlyCredits;
  const cycleChanged =
    !existingCreditBalance?.cycleStartedAt ||
    existingCreditBalance.cycleStartedAt.getTime() !== cycle.startsAt.getTime();

  const subscription = await prisma.subscription.upsert({
    where: { userId: user.id },
    update: {
      planKey: mapPlanKey(planKey),
      monthlyCreditAllowance: monthlyCredits,
      hardMonthlyCreditCap: monthlyCredits,
      rolloverPolicy: RolloverPolicy.NONE,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: cycle.startsAt,
      currentPeriodEnd: cycle.endsAt,
    },
    create: {
      userId: user.id,
      planKey: mapPlanKey(planKey),
      status: SubscriptionStatus.ACTIVE,
      rolloverPolicy: RolloverPolicy.NONE,
      monthlyCreditAllowance: monthlyCredits,
      hardMonthlyCreditCap: monthlyCredits,
      currentPeriodStart: cycle.startsAt,
      currentPeriodEnd: cycle.endsAt,
    },
  });

  if (!useCreditBalanceTable) {
    const fallbackAvailableCredits = await getAvailableCreditsWithoutBalanceTable({
      userId: user.id,
      monthlyCredits,
      startsAt: cycle.startsAt,
      endsAt: cycle.endsAt,
    });

    return toSubscriptionRecord(user, subscription, null, fallbackAvailableCredits);
  }

  const creditBalance = await prisma.creditBalance.upsert({
    where: { userId: user.id },
    update: planChanged || cycleChanged
      ? {
          availableCredits: monthlyCredits,
          cycleStartedAt: cycle.startsAt,
          cycleEndsAt: cycle.endsAt,
        }
      : {},
    create: {
      userId: user.id,
      availableCredits: existingCreditBalance?.availableCredits ?? monthlyCredits,
      cycleStartedAt: cycle.startsAt,
      cycleEndsAt: cycle.endsAt,
    },
  });

  return toSubscriptionRecord(user, subscription, creditBalance);
}

export async function prismaConsumeCredits(input: {
  sellerId: string;
  sellerEmail: string;
  planKey: SubscriptionRecord["planKey"];
  monthlyCredits: number;
  action: UsageLedgerEntry["action"];
  creditsUsed: number;
  provider: UsageLedgerEntry["provider"];
  idempotencyKey: string;
}) {
  const cycle = getCurrentCreditCycle();
  const user = await ensureUser({
    email: input.sellerEmail,
    name: input.sellerId,
    role: UserRole.USER,
  });

  const subscription = await prisma.subscription.upsert({
    where: { userId: user.id },
    update: {
      planKey: mapPlanKey(input.planKey),
      status: SubscriptionStatus.ACTIVE,
      monthlyCreditAllowance: input.monthlyCredits,
      hardMonthlyCreditCap: input.monthlyCredits,
      rolloverPolicy: RolloverPolicy.NONE,
      currentPeriodStart: cycle.startsAt,
      currentPeriodEnd: cycle.endsAt,
    },
    create: {
      userId: user.id,
      planKey: mapPlanKey(input.planKey),
      status: SubscriptionStatus.ACTIVE,
      rolloverPolicy: RolloverPolicy.NONE,
      monthlyCreditAllowance: input.monthlyCredits,
      hardMonthlyCreditCap: input.monthlyCredits,
      currentPeriodStart: cycle.startsAt,
      currentPeriodEnd: cycle.endsAt,
    },
  });

  let existingCreditBalance: CreditBalance | null = null;
  let useCreditBalanceTable = true;

  try {
    existingCreditBalance = await prisma.creditBalance.findUnique({
      where: { userId: user.id },
    });
  } catch (error) {
    if (!isMissingTableError(error, ["credit_balance", "creditbalance"])) {
      throw error;
    }

    useCreditBalanceTable = false;
    console.warn("[lessonforge.ai] credit balance table missing during credit consume", {
      sellerEmail: input.sellerEmail,
      action: input.action,
    });
  }

  const shouldResetCycle =
    !existingCreditBalance?.cycleStartedAt ||
    existingCreditBalance.cycleStartedAt.getTime() !== cycle.startsAt.getTime() ||
    subscription.monthlyCreditAllowance !== input.monthlyCredits;

  if (!useCreditBalanceTable) {
    const { availableCreditsAfterConsume, ledgerEntry, reservationState } = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`lessonforge-ai:${user.id}`})::bigint)`;

      const existing = await tx.usageLedger.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
        include: { user: true },
      });

      if (existing) {
        const aggregateExisting = await tx.usageLedger.aggregate({
          where: {
            userId: user.id,
            createdAt: {
              gte: cycle.startsAt,
              lt: cycle.endsAt,
            },
          },
          _sum: {
            creditsUsed: true,
            refundedCredits: true,
          },
        });

        const usedCredits = Math.max(
          0,
          (aggregateExisting._sum.creditsUsed ?? 0) - (aggregateExisting._sum.refundedCredits ?? 0),
        );
        const availableCredits = Math.max(0, input.monthlyCredits - usedCredits);

        if (existing.refundedCredits >= existing.creditsUsed) {
          if (availableCredits < input.creditsUsed) {
            console.info("[lessonforge.ai] insufficient credits rejected", {
              sellerEmail: input.sellerEmail,
              action: input.action,
              provider: input.provider,
              availableCredits,
              requestedCredits: input.creditsUsed,
            });
            throw new Error("Not enough AI credits remaining for this action.");
          }

          const retriedLedgerEntry = await tx.usageLedger.update({
            where: { id: existing.id },
            data: {
              refundedCredits: 0,
              entryType: UsageEntryType.DEBIT,
              providerName: input.provider,
            },
            include: { user: true },
          });

          return {
            availableCreditsAfterConsume: availableCredits - input.creditsUsed,
            ledgerEntry: retriedLedgerEntry,
            reservationState: "reserved" as const,
          };
        }

        console.info("[lessonforge.ai] duplicate request reused", {
          sellerEmail: input.sellerEmail,
          action: input.action,
          provider: input.provider,
        });

        return {
          availableCreditsAfterConsume: availableCredits,
          ledgerEntry: existing,
          reservationState: "reused" as const,
        };
      }

      const aggregate = await tx.usageLedger.aggregate({
        where: {
          userId: user.id,
          createdAt: {
            gte: cycle.startsAt,
            lt: cycle.endsAt,
          },
        },
        _sum: {
          creditsUsed: true,
          refundedCredits: true,
        },
      });

      const usedCredits = Math.max(
        0,
        (aggregate._sum.creditsUsed ?? 0) - (aggregate._sum.refundedCredits ?? 0),
      );
      const availableCredits = Math.max(0, input.monthlyCredits - usedCredits);

      if (availableCredits < input.creditsUsed) {
        console.info("[lessonforge.ai] insufficient credits rejected", {
          sellerEmail: input.sellerEmail,
          action: input.action,
          provider: input.provider,
          availableCredits,
          requestedCredits: input.creditsUsed,
        });
        throw new Error("Not enough AI credits remaining for this action.");
      }

      const createdLedgerEntry = await tx.usageLedger.create({
        data: {
          userId: user.id,
          subscriptionId: subscription.id,
          entryType: UsageEntryType.DEBIT,
          action: mapAiAction(input.action),
          creditsUsed: input.creditsUsed,
          refundedCredits: 0,
          idempotencyKey: input.idempotencyKey,
          providerName: input.provider,
        },
        include: {
          user: true,
        },
      });

      return {
        availableCreditsAfterConsume: availableCredits - input.creditsUsed,
        ledgerEntry: createdLedgerEntry,
        reservationState: "reserved" as const,
      };
    });

    if (reservationState === "reserved") {
      console.info("[lessonforge.ai] credit reserved", {
        sellerEmail: input.sellerEmail,
        action: input.action,
        provider: input.provider,
        creditsUsed: input.creditsUsed,
      });
    }

    return {
      subscription: toSubscriptionRecord(
        user,
        subscription,
        null,
        availableCreditsAfterConsume,
      ),
      ledgerEntry: toUsageLedgerEntryRecord(ledgerEntry),
      reservationState,
    };
  }

  const creditBalance = await prisma.creditBalance.upsert({
    where: { userId: user.id },
    update: shouldResetCycle
      ? {
          availableCredits: input.monthlyCredits,
          cycleStartedAt: cycle.startsAt,
          cycleEndsAt: cycle.endsAt,
        }
      : {},
    create: {
      userId: user.id,
      availableCredits: input.monthlyCredits,
      cycleStartedAt: cycle.startsAt,
      cycleEndsAt: cycle.endsAt,
    },
  });

  const { updatedCreditBalance, ledgerEntry, reservationState } = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`lessonforge-ai:${user.id}`})::bigint)`;

    const existing = await tx.usageLedger.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
      include: { user: true },
    });

    if (existing) {
      if (existing.refundedCredits >= existing.creditsUsed) {
        const retriedUpdate = await tx.creditBalance.updateMany({
          where: {
            userId: user.id,
            availableCredits: {
              gte: input.creditsUsed,
            },
          },
          data: {
            availableCredits: {
              decrement: input.creditsUsed,
            },
          },
        });

        if (retriedUpdate.count !== 1) {
          const currentBalance = await tx.creditBalance.findUniqueOrThrow({
            where: { userId: user.id },
          });
          console.info("[lessonforge.ai] parallel request blocked", {
            sellerEmail: input.sellerEmail,
            action: input.action,
            provider: input.provider,
            availableCredits: currentBalance.availableCredits,
            requestedCredits: input.creditsUsed,
          });
          throw new Error("Not enough AI credits remaining for this action.");
        }

        const retriedLedgerEntry = await tx.usageLedger.update({
          where: { id: existing.id },
          data: {
            refundedCredits: 0,
            entryType: UsageEntryType.DEBIT,
            providerName: input.provider,
          },
          include: { user: true },
        });

        const refreshedCreditBalance = await tx.creditBalance.findUniqueOrThrow({
          where: { userId: user.id },
        });

        return {
          updatedCreditBalance: refreshedCreditBalance,
          ledgerEntry: retriedLedgerEntry,
          reservationState: "reserved" as const,
        };
      }

      const existingBalance = await tx.creditBalance.findUniqueOrThrow({
        where: { userId: user.id },
      });

      console.info("[lessonforge.ai] duplicate request reused", {
        sellerEmail: input.sellerEmail,
        action: input.action,
        provider: input.provider,
      });

      return {
        updatedCreditBalance: existingBalance,
        ledgerEntry: existing,
        reservationState: "reused" as const,
      };
    }

    const updated = await tx.creditBalance.updateMany({
      where: {
        userId: user.id,
        availableCredits: {
          gte: input.creditsUsed,
        },
      },
      data: {
        availableCredits: {
          decrement: input.creditsUsed,
        },
      },
    });

    if (updated.count !== 1) {
      const currentBalance = await tx.creditBalance.findUniqueOrThrow({
        where: { userId: user.id },
      });
      console.info("[lessonforge.ai] parallel request blocked", {
        sellerEmail: input.sellerEmail,
        action: input.action,
        provider: input.provider,
        availableCredits: currentBalance.availableCredits,
        requestedCredits: input.creditsUsed,
      });
      throw new Error("Not enough AI credits remaining for this action.");
    }

    const createdLedgerEntry = await tx.usageLedger.create({
      data: {
        userId: user.id,
        subscriptionId: subscription.id,
        entryType: UsageEntryType.DEBIT,
        action: mapAiAction(input.action),
        creditsUsed: input.creditsUsed,
        refundedCredits: 0,
        idempotencyKey: input.idempotencyKey,
        providerName: input.provider,
      },
      include: {
        user: true,
      },
    });

    const refreshedCreditBalance = await tx.creditBalance.findUniqueOrThrow({
      where: { userId: user.id },
    });

    return {
      updatedCreditBalance: refreshedCreditBalance,
      ledgerEntry: createdLedgerEntry,
      reservationState: "reserved" as const,
    };
  });

  if (reservationState === "reserved") {
    console.info("[lessonforge.ai] credit reserved", {
      sellerEmail: input.sellerEmail,
      action: input.action,
      provider: input.provider,
      creditsUsed: input.creditsUsed,
    });
  }

  return {
    subscription: toSubscriptionRecord(user, subscription, updatedCreditBalance),
    ledgerEntry: toUsageLedgerEntryRecord(ledgerEntry),
    reservationState,
  };
}

export async function prismaRefundCredits(idempotencyKey: string) {
  const entry = await prisma.usageLedger.findUnique({
    where: { idempotencyKey },
  });

  if (!entry || entry.refundedCredits > 0) {
    return entry;
  }

  try {
    await prisma.$transaction([
      prisma.creditBalance.update({
        where: { userId: entry.userId },
        data: {
          availableCredits: {
            increment: entry.creditsUsed,
          },
        },
      }),
      prisma.usageLedger.update({
        where: { id: entry.id },
        data: {
          refundedCredits: entry.creditsUsed,
          entryType: UsageEntryType.REFUND,
        },
      }),
    ]);
  } catch (error) {
    if (!isMissingTableError(error, ["credit_balance", "creditbalance"])) {
      throw error;
    }

    console.warn("[lessonforge.ai] credit balance table missing during refund", {
      idempotencyKey,
    });

    await prisma.usageLedger.update({
      where: { id: entry.id },
      data: {
        refundedCredits: entry.creditsUsed,
        entryType: UsageEntryType.REFUND,
      },
    });
  }

  return prisma.usageLedger.findUnique({
    where: { id: entry.id },
  });
}
