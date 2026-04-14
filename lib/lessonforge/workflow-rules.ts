import type {
  ProductRecord,
  SubscriptionRecord,
  UsageLedgerEntry,
} from "@/types";

type SellerProductRevisionInput = {
  title: string;
  subject: string;
  gradeBand: string;
  priceCents: number;
  notes: string;
  licenseType: string;
  createdPath: ProductRecord["createdPath"];
  previewIncluded: boolean;
  thumbnailIncluded: boolean;
  rightsConfirmed: boolean;
  nextStatus: NonNullable<ProductRecord["productStatus"]>;
};

type ConsumeCreditInput = {
  sellerId: string;
  action: UsageLedgerEntry["action"];
  creditsUsed: number;
  provider: UsageLedgerEntry["provider"];
  idempotencyKey: string;
  createdAt?: string;
};

export function applyAdminProductModeration(
  product: ProductRecord,
  nextStatus: NonNullable<ProductRecord["productStatus"]>,
  moderationFeedback?: string,
) {
  return {
    ...product,
    productStatus: nextStatus,
    isPurchasable:
      Boolean(product.sellerStripeAccountId) && nextStatus === "Published",
    moderationFeedback: moderationFeedback?.trim() || undefined,
    updatedAt: "Status updated just now",
  };
}

export function buildSellerProductRevision(
  product: ProductRecord,
  input: SellerProductRevisionInput,
) {
  return {
    ...product,
    title: input.title.trim(),
    subject: input.subject,
    gradeBand: input.gradeBand,
    priceCents: input.priceCents,
    summary: input.notes.trim() || product.summary,
    shortDescription:
      input.notes.trim() || product.shortDescription || product.summary,
    fullDescription:
      input.notes.trim() || product.fullDescription || product.summary,
    licenseType: input.licenseType,
    createdPath: input.createdPath,
    previewIncluded: input.previewIncluded,
    thumbnailIncluded: input.thumbnailIncluded,
    rightsConfirmed: input.rightsConfirmed,
    productStatus: input.nextStatus,
    isPurchasable:
      Boolean(product.sellerStripeAccountId) && input.nextStatus === "Published",
    updatedAt:
      input.nextStatus === "Pending review"
        ? "Resubmitted for review just now"
        : "Updated just now",
    // Once a seller saves changes or resubmits, the old moderation note should
    // not continue to appear as if it still applies to the latest draft.
    moderationFeedback: undefined,
    assetVersionNumber: (product.assetVersionNumber ?? 1) + 1,
  };
}

export function debitAiCredits(
  subscription: SubscriptionRecord,
  input: ConsumeCreditInput,
) {
  if (subscription.availableCredits < input.creditsUsed) {
    throw new Error("Not enough AI credits remaining for this action.");
  }

  return {
    subscription: {
      ...subscription,
      availableCredits: subscription.availableCredits - input.creditsUsed,
    },
    ledgerEntry: {
      id: `usage-${Date.now()}`,
      sellerId: input.sellerId,
      action: input.action,
      creditsUsed: input.creditsUsed,
      refundedCredits: 0,
      status: "applied" as const,
      provider: input.provider,
      idempotencyKey: input.idempotencyKey,
      createdAt: input.createdAt ?? new Date().toISOString(),
    },
  };
}

export function refundAiCredits(
  subscription: SubscriptionRecord | undefined,
  ledgerEntry: UsageLedgerEntry | null | undefined,
) {
  if (!ledgerEntry || ledgerEntry.status === "refunded") {
    return {
      subscription,
      ledgerEntry: ledgerEntry ?? null,
    };
  }

  return {
    subscription: subscription
      ? {
          ...subscription,
          availableCredits: subscription.availableCredits + ledgerEntry.creditsUsed,
        }
      : subscription,
    ledgerEntry: {
      ...ledgerEntry,
      refundedCredits: ledgerEntry.creditsUsed,
      status: "refunded" as const,
    },
  };
}
