import type { ProductRecord } from "@/types";

export function getProductPublishBlockers(product: ProductRecord) {
  const blockers: string[] = [];

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

  if (!product.previewIncluded) {
    blockers.push("Generate or attach preview pages");
  }

  if (!product.thumbnailIncluded) {
    blockers.push("Generate or attach a thumbnail");
  }

  if (!product.rightsConfirmed) {
    blockers.push("Confirm rights to sell");
  }

  return blockers;
}

export function getProductAssetHealthStatus(product: ProductRecord) {
  const blockers = getProductPublishBlockers(product);

  if (blockers.length === 0) {
    return "Ready to publish";
  }

  if (!product.previewIncluded) {
    return "Needs preview";
  }

  if (!product.thumbnailIncluded) {
    return "Needs thumbnail";
  }

  if (!product.rightsConfirmed) {
    return "Needs rights confirmation";
  }

  return "Needs listing details";
}

export function validateProductForSave(product: ProductRecord) {
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

  if (!product.previewIncluded) {
    return "Published listings need a preview before they can go live.";
  }

  if (!product.thumbnailIncluded) {
    return "Published listings need a thumbnail before they can go live.";
  }

  if (!product.rightsConfirmed) {
    return "Confirm that you own or have rights to sell this content before publishing.";
  }

  return null;
}
