import type { ProductRecord } from "@/types";

export function mergeProductRecord(
  persistedProduct: ProductRecord,
  syncedProduct: ProductRecord,
) {
  return {
    ...persistedProduct,
    ...syncedProduct,
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
