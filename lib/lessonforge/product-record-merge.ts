import type { ProductRecord } from "@/types";

const PLACEHOLDER_COPY = new Set([
  "",
  "not set",
  "general",
  "digital resource",
  "saved seller listing",
  "teacher seller",
  "@lessonforge-seller",
]);

function hasMeaningfulCopy(value?: string | null) {
  if (!value) {
    return false;
  }

  return !PLACEHOLDER_COPY.has(value.trim().toLowerCase());
}

function preferRequiredCopy(persistedValue: string, syncedValue: string) {
  if (hasMeaningfulCopy(syncedValue)) {
    return syncedValue;
  }

  if (hasMeaningfulCopy(persistedValue)) {
    return persistedValue;
  }

  return syncedValue || persistedValue;
}

function preferOptionalCopy(
  persistedValue: string | undefined,
  syncedValue: string | undefined,
) {
  if (hasMeaningfulCopy(syncedValue)) {
    return syncedValue;
  }

  if (hasMeaningfulCopy(persistedValue)) {
    return persistedValue;
  }

  return syncedValue ?? persistedValue;
}

export function mergeProductRecord(
  persistedProduct: ProductRecord,
  syncedProduct: ProductRecord,
) {
  return {
    ...persistedProduct,
    ...syncedProduct,
    subject: preferRequiredCopy(persistedProduct.subject, syncedProduct.subject),
    gradeBand: preferRequiredCopy(persistedProduct.gradeBand, syncedProduct.gradeBand),
    standardsTag: preferRequiredCopy(persistedProduct.standardsTag, syncedProduct.standardsTag),
    format: preferRequiredCopy(persistedProduct.format, syncedProduct.format),
    summary: preferRequiredCopy(persistedProduct.summary, syncedProduct.summary),
    shortDescription: preferOptionalCopy(
      persistedProduct.shortDescription,
      syncedProduct.shortDescription,
    ),
    fullDescription: preferOptionalCopy(
      persistedProduct.fullDescription,
      syncedProduct.fullDescription,
    ),
    resourceType: preferOptionalCopy(persistedProduct.resourceType, syncedProduct.resourceType),
    tags: syncedProduct.tags?.length ? syncedProduct.tags : persistedProduct.tags,
    thumbnailUrl: syncedProduct.thumbnailUrl ?? persistedProduct.thumbnailUrl,
    previewAssetUrls:
      syncedProduct.previewAssetUrls?.length
        ? syncedProduct.previewAssetUrls
        : persistedProduct.previewAssetUrls,
    originalAssetUrl: syncedProduct.originalAssetUrl ?? persistedProduct.originalAssetUrl,
    imageGallery:
      syncedProduct.imageGallery?.length
        ? syncedProduct.imageGallery
        : persistedProduct.imageGallery,
    previewIncluded: syncedProduct.previewIncluded ?? persistedProduct.previewIncluded,
    thumbnailIncluded: syncedProduct.thumbnailIncluded ?? persistedProduct.thumbnailIncluded,
    rightsConfirmed: syncedProduct.rightsConfirmed ?? persistedProduct.rightsConfirmed,
  } satisfies ProductRecord;
}
