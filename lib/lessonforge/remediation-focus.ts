import { getProductPublishBlockers } from "@/lib/lessonforge/product-validation";
import type { ProductRecord } from "@/types";

export type SellerRemediationFocus =
  | "preview"
  | "thumbnail"
  | "rights"
  | "details";

export function getSellerRemediationFocus(
  product: ProductRecord,
): SellerRemediationFocus | null {
  const blockers = getProductPublishBlockers(product);

  if (blockers.includes("Generate or attach preview pages")) {
    return "preview";
  }

  if (blockers.includes("Generate or attach a thumbnail")) {
    return "thumbnail";
  }

  if (blockers.includes("Confirm rights to sell")) {
    return "rights";
  }

  if (
    blockers.includes("Add a full description") ||
    blockers.includes("Add a grade band") ||
    blockers.includes("Choose a resource type") ||
    blockers.includes("Choose a license")
  ) {
    return "details";
  }

  if (product.productStatus === "Flagged" || product.productStatus === "Rejected") {
    return "details";
  }

  return null;
}

export function getSellerRemediationFocusLabel(
  focus: SellerRemediationFocus | null,
) {
  switch (focus) {
    case "preview":
      return "Preview pages ready";
    case "thumbnail":
      return "Thumbnail ready";
    case "rights":
      return "Rights confirmed";
    case "details":
      return "Listing details";
    default:
      return null;
  }
}
