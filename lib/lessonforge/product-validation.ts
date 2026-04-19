import type { ProductRecord } from "@/types";
import { hasRequiredProductGallery } from "@/lib/lessonforge/product-gallery";

export function getProductPublishBlockers(product: ProductRecord) {
  const blockers: string[] = [];
  const galleryStatus = hasRequiredProductGallery(product);

  if (!product.fullDescription?.trim()) {
    blockers.push("Add a full description");
  }

  if (!product.gradeBand?.trim()) {
    blockers.push("Add a grade band");
  }

  if (!product.resourceType?.trim()) {
    blockers.push("Choose a resource type");
  }

  if (!product.licenseType?.trim()) {
    blockers.push("Choose a license");
  }

  if (!galleryStatus.hasPreviewImage && !product.previewIncluded) {
    blockers.push("Add at least two real interior preview images");
  }

  if (!galleryStatus.hasCoverImage && !product.thumbnailIncluded) {
    blockers.push("Add a cover image");
  }

  if (!product.rightsConfirmed) {
    blockers.push("Confirm rights to sell");
  }

  return blockers;
}

export function getProductAssetHealthStatus(product: ProductRecord) {
  const blockers = getProductPublishBlockers(product);
  const galleryStatus = hasRequiredProductGallery(product);

  if (blockers.length === 0) {
    return "Ready to publish";
  }

  if (!galleryStatus.hasPreviewImage && !product.previewIncluded) {
    return "Needs preview";
  }

  if (!galleryStatus.hasCoverImage && !product.thumbnailIncluded) {
    return "Needs thumbnail";
  }

  if (!product.rightsConfirmed) {
    return "Needs rights confirmation";
  }

  return "Needs listing details";
}

export function validateProductForSave(product: ProductRecord) {
  const galleryStatus = hasRequiredProductGallery(product);

  if (!product.title?.trim() || !product.subject?.trim()) {
    return "Product title and subject are required.";
  }

  if (product.productStatus !== "Published") {
    return null;
  }

  const blockers = getProductPublishBlockers(product);

  if (!blockers.length) {
    return null;
  }

  if (!product.fullDescription?.trim()) {
    return "Published listings need a full description before they can go live.";
  }

  if (!product.gradeBand?.trim()) {
    return "Published listings need a grade band before they can go live.";
  }

  if (!product.resourceType?.trim()) {
    return "Published listings need a resource type before they can go live.";
  }

  if (!product.licenseType?.trim()) {
    return "Published listings need a license before they can go live.";
  }

  if (!galleryStatus.hasPreviewImage && !product.previewIncluded) {
    return "Published listings need at least two real interior preview images before they can go live.";
  }

  if (!galleryStatus.hasCoverImage && !product.thumbnailIncluded) {
    return "Published listings need a cover image before they can go live.";
  }

  if (!product.rightsConfirmed) {
    return "Confirm that you own or have rights to sell this content before publishing.";
  }

  return null;
}
