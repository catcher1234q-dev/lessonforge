import { marketplaceConfig, getMarketplaceSplitForPlan } from "@/lib/config/marketplace";
import type { PlanKey as ConfigPlanKey } from "@/lib/config/plans";

export const userRoles = ["owner", "admin", "user"] as const;
export type UserRole = (typeof userRoles)[number];

export const planKeys = ["starter", "basic", "pro"] as const;
export type PlanKey = (typeof planKeys)[number];

export const productStatuses = [
  "draft",
  "pendingReview",
  "published",
  "flagged",
  "rejected",
  "removed",
] as const;
export type ProductStatus = (typeof productStatuses)[number];

export const resourceTypes = [
  "lessonPlan",
  "worksheet",
  "assessment",
  "quiz",
  "project",
  "slideDeck",
  "center",
  "warmUp",
  "exitTicket",
  "studyGuide",
  "unitPlan",
  "lab",
  "graphicOrganizer",
  "interventionResource",
  "spedResource",
  "ellResource",
  "homeschoolResource",
  "supplementalTool",
] as const;
export type ResourceType = (typeof resourceTypes)[number];

export const licenseTypes = [
  "singleClassroom",
  "multipleClassroom",
  "schoolwide",
  "districtwide",
] as const;
export type LicenseType = (typeof licenseTypes)[number];

export const productAssetTypes = [
  "pdf",
  "docx",
  "pptx",
  "xlsx",
  "image",
  "zip",
] as const;
export type ProductAssetType = (typeof productAssetTypes)[number];

export const productLinkTypes = [
  "googleDocs",
  "googleSlides",
  "googleForms",
  "video",
] as const;
export type ProductLinkType = (typeof productLinkTypes)[number];

export const subscriptionStatuses = [
  "trialing",
  "active",
  "pastDue",
  "canceled",
  "paused",
  "incomplete",
] as const;
export type SubscriptionStatus = (typeof subscriptionStatuses)[number];

export const usageEntryTypes = [
  "debit",
  "credit",
  "refund",
  "adjustment",
] as const;
export type UsageEntryType = (typeof usageEntryTypes)[number];

export const aiActions = [
  "titleSuggestion",
  "descriptionRewrite",
  "standardsScan",
  "thumbnailGeneration",
  "previewGeneration",
] as const;
export type AiAction = (typeof aiActions)[number];

export const aiJobStatuses = [
  "queued",
  "processing",
  "completed",
  "failed",
] as const;
export type AiJobStatus = (typeof aiJobStatuses)[number];

export const refundStatuses = [
  "submitted",
  "sellerResponded",
  "approved",
  "denied",
  "partiallyResolved",
] as const;
export type RefundStatus = (typeof refundStatuses)[number];

export const reportCategories = [
  "brokenFile",
  "copyright",
  "misleadingListing",
  "lowQuality",
  "spam",
  "accessIssue",
] as const;
export type ReportCategory = (typeof reportCategories)[number];

export const moderationStatuses = [
  "open",
  "underReview",
  "resolved",
  "dismissed",
] as const;
export type ModerationStatus = (typeof moderationStatuses)[number];

export type MoneySplit = {
  grossCents: number;
  sellerCents: number;
  platformCents: number;
};

export function calculateMarketplaceSplit(
  grossCents: number,
  planKey: ConfigPlanKey = marketplaceConfig.defaultPlanKey,
): MoneySplit {
  const split = getMarketplaceSplitForPlan(planKey);
  const platformCents = Math.round((grossCents * split.platformShareBps) / 10000);
  const sellerCents = grossCents - platformCents;

  return {
    grossCents,
    sellerCents,
    platformCents,
  };
}
