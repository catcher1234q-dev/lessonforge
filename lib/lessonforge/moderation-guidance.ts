import { getProductPublishBlockers } from "@/lib/lessonforge/product-validation";
import type { ProductRecord } from "@/types";

type ModerationGuidance = {
  headline: string;
  summary: string;
  priorityActions: string[];
};

export function getSellerModerationGuidance(
  product: ProductRecord,
): ModerationGuidance | null {
  if (
    product.productStatus !== "Flagged" &&
    product.productStatus !== "Rejected"
  ) {
    return null;
  }

  const blockers = getProductPublishBlockers(product);
  const note = product.moderationFeedback?.trim();

  if (product.productStatus === "Rejected") {
    return {
      headline: "Rejected listings need a stronger revision before they can return to review.",
      summary:
        note ||
        "Use the seller note and the checklist below to tighten the listing before resubmitting it.",
      priorityActions: blockers.length
        ? blockers
        : [
            "Refresh the listing copy so the buyer-facing explanation is clearer.",
            "Review the moderation note before sending the listing back for review.",
          ],
    };
  }

  return {
    headline: "Flagged listings can go back into review as soon as the blocking issues are fixed.",
    summary:
      note ||
      "Clear the blocking issues below, then use Fix and resubmit to send the listing back through review.",
    priorityActions: blockers.length
      ? blockers
      : [
          "Review the moderation note and make the requested listing update.",
          "Resubmit once the seller-facing fixes are complete.",
        ],
  };
}
