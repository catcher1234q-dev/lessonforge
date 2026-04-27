import { demoResources } from "@/lib/demo/example-resources";
import { marketplaceConfig } from "@/lib/config/marketplace";
import {
  buildManagedPreviewAssets,
  type ManagedPreviewAsset,
} from "@/lib/lessonforge/preview-assets";
import type { DemoResource } from "@/types";

export type MarketplaceReviewSummary = {
  averageRating: number;
  reviewCount: number;
  verifiedPurchaseOnly: boolean;
};

export const PLATFORM_MARKETPLACE_NAME = "LessonForge Marketplace";
export const PLATFORM_MARKETPLACE_SUBLABEL = "Platform starter resource";

export type MarketplaceListing = {
  id: string;
  slug: string;
  title: string;
  subject: string;
  gradeBand: string;
  standardsTag: string;
  tags: string[];
  pageCount: number;
  updatedAtLabel: string;
  format: string;
  summary: string;
  shortDescription: string;
  fullDescription: string;
  resourceType: string;
  sellerName: string;
  sellerHandle: string;
  sellerId: string;
  sellerListingCount: number;
  sellerAverageRating: number;
  sellerTotalReviewCount: number;
  sellerTrustLabel: string;
  priceCents: number;
  demoOnly: boolean;
  freshnessScore: number;
  licenseType: "Single classroom" | "Multiple classroom";
  fileTypes: string[];
  includedItems: string[];
  howToUse: string[];
  fileList: string[];
  previewSlides: string[];
  previewAssets: ManagedPreviewAsset[];
  thumbnailUrl?: string;
  assetVersionNumber: number;
  assetHealthStatus: string;
  buyerTrustLabel: string;
  reviewSummary: MarketplaceReviewSummary;
  supportLabel: string;
  conversionLabel: string;
  salesVelocityLabel: string;
  issueCountLabel: string;
  productStatus?: DemoResource["productStatus"];
    rankingSignals: {
      conversionRate: number;
      salesVelocity: number;
      reviewQuality: number;
      sellerTrust: number;
      assetReadiness: number;
      refundPenalty: number;
      reportPenalty: number;
      freshnessBoost: number;
  };
};

export function isPlatformMarketplaceLabel(value?: string | null) {
  return (value ?? "").trim() === PLATFORM_MARKETPLACE_NAME;
}

type MarketplaceListingOverrides = Partial<
  Pick<
    MarketplaceListing,
    | "updatedAtLabel"
    | "reviewSummary"
    | "conversionLabel"
    | "salesVelocityLabel"
    | "issueCountLabel"
    | "supportLabel"
    | "freshnessScore"
  >
>;

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function inferFileTypes(format: string) {
  const lower = format.toLowerCase();

  if (lower.includes("slide")) {
    return ["PPTX", "PDF"];
  }

  if (lower.includes("bundle") || lower.includes("toolkit")) {
    return ["PDF", "DOCX", "ZIP"];
  }

  if (lower.includes("lab")) {
    return ["PDF", "PPTX"];
  }

  return ["PDF", "DOCX"];
}

function inferIncludedItems(title: string, format: string) {
  return [
    `${format} cover and student pages`,
    `${title} teacher guide with answer support`,
    "Editable planning notes",
    "Print-ready preview pages",
  ];
}

function inferHowToUse(title: string, subject: string) {
  return [
    `Introduce ${title.toLowerCase()} during whole-group ${subject.toLowerCase()} instruction.`,
    "Model one sample together, then move students into independent or partner practice.",
    "Use the answer support or teacher notes to review errors and reteach the next day.",
  ];
}

function inferFileList(format: string, pageCount: number) {
  return [
    `${pageCount > 0 ? `${pageCount}-page ` : ""}printable ${format.toLowerCase()} PDF`,
    "Teacher notes and answer support",
  ];
}

function buildPreviewSlides(title: string, subject: string, format: string) {
  const lower = format.toLowerCase();

  if (lower.includes("slide") || lower.includes("deck")) {
    return [
      `${title} cover slide`,
      `${subject} lesson slide`,
      "Guided practice slide",
      "Teacher notes and answer support",
    ];
  }

  if (lower.includes("center") || lower.includes("task")) {
    return [
      `${title} cover page`,
      "Center directions and setup",
      "Task cards and recording sheet",
      "Answer key and teacher notes",
    ];
  }

  if (lower.includes("lab") || lower.includes("inquiry")) {
    return [
      `${title} cover page`,
      "Observation sheet",
      "Student data and reflection page",
      "Teacher guide and discussion notes",
    ];
  }

  return [
    `${title} cover page`,
    "Student practice page",
    "Independent application page",
    "Teacher notes and answer key",
  ];
}

function buildReviewSummary(index: number): MarketplaceReviewSummary {
  return {
    averageRating: 0,
    reviewCount: 0,
    verifiedPurchaseOnly: true,
  };
}

export const marketplaceListings: MarketplaceListing[] = demoResources.map(
  (resource, index) => toMarketplaceListing(resource, index),
);

export function toMarketplaceListing(
  resource: DemoResource,
  index: number,
  overrides?: MarketplaceListingOverrides,
): MarketplaceListing {
  const priceCents = resource.priceCents ?? 0;
  const fileTypes = resource.fileTypes?.length ? resource.fileTypes : inferFileTypes(resource.format);
  const previewSlides = buildPreviewSlides(resource.title, resource.subject, resource.format);
  const slug = resource.slug ?? slugify(resource.title);

  return {
    id: resource.id,
    slug,
    title: resource.title,
    subject: resource.subject,
    gradeBand: resource.gradeBand,
    standardsTag: resource.standardsTag,
    tags: resource.tags?.length ? resource.tags : [resource.subject, resource.gradeBand],
    pageCount: resource.pageCount ?? 0,
    updatedAtLabel: overrides?.updatedAtLabel ?? resource.updatedAt,
    format: resource.format,
    summary: resource.summary,
    shortDescription: resource.shortDescription || resource.summary,
    fullDescription:
      resource.fullDescription ||
      `${resource.summary} This listing is designed for teachers who want a polished ready-to-use resource without sacrificing flexibility. Sellers can keep improving the asset over time, and buyers get clearer trust signals before purchasing.`,
    resourceType: resource.resourceType || resource.format,
    sellerName: resource.sellerName ?? PLATFORM_MARKETPLACE_NAME,
    sellerHandle: resource.sellerHandle ?? PLATFORM_MARKETPLACE_SUBLABEL,
    sellerId: resource.sellerId ?? resource.id,
    sellerListingCount: 1,
    sellerAverageRating: buildReviewSummary(index).averageRating,
    sellerTotalReviewCount: buildReviewSummary(index).reviewCount,
    sellerTrustLabel: isPlatformMarketplaceLabel(resource.sellerName)
      ? "Marketplace starter resource"
      : "Original teacher-created listing",
    priceCents,
    demoOnly: resource.demoOnly,
    freshnessScore:
      overrides?.freshnessScore ??
      resource.freshnessScore ??
      (resource.demoOnly ? marketplaceConfig.freshnessWindowDays / 2 : 4),
    licenseType:
      resource.licenseType === "Single classroom" ||
      resource.licenseType === "Multiple classroom"
        ? resource.licenseType
        : resource.demoOnly
          ? "Multiple classroom"
          : "Single classroom",
    fileTypes,
    includedItems:
      resource.includedItems?.length
        ? resource.includedItems
        : inferIncludedItems(resource.title, resource.format),
    howToUse:
      resource.howToUse?.length
        ? resource.howToUse
        : inferHowToUse(resource.title, resource.subject),
    fileList:
      resource.fileList?.length
        ? resource.fileList
        : inferFileList(resource.format, resource.pageCount ?? 0),
    previewSlides: resource.previewLabels?.length ? resource.previewLabels : previewSlides,
    previewAssets: buildManagedPreviewAssets({
      productId: resource.id,
      title: resource.title,
      subject: resource.subject,
      format: resource.format,
      previewLabels: resource.previewLabels?.length ? resource.previewLabels : previewSlides,
      previewUrls: resource.previewAssetUrls,
    }),
    thumbnailUrl:
      resource.thumbnailUrl ?? `/api/lessonforge/thumbnail-assets/${slug}`,
    assetVersionNumber: resource.assetVersionNumber ?? 1,
    assetHealthStatus:
      resource.previewIncluded === false
        ? "Preview still needed"
        : resource.thumbnailIncluded === false
          ? "Thumbnail still needed"
          : resource.rightsConfirmed === false
            ? "Rights check still needed"
            : "Preview and thumbnail ready",
    buyerTrustLabel:
      resource.previewIncluded === false
        ? "Preview still being prepared"
        : resource.thumbnailIncluded === false
          ? "Thumbnail still being prepared"
          : `Protected preview ready · Version ${resource.assetVersionNumber ?? 1}`,
    reviewSummary: overrides?.reviewSummary ?? buildReviewSummary(index),
    supportLabel: overrides?.supportLabel ?? "Protected download after purchase",
    conversionLabel: overrides?.conversionLabel ?? `${(3.1 + index * 0.2).toFixed(1)}% conversion`,
    salesVelocityLabel: overrides?.salesVelocityLabel ?? `${12 + index * 2} sales this month`,
    issueCountLabel: overrides?.issueCountLabel ?? `${index % 2} active issues`,
    productStatus: resource.productStatus ?? "Published",
    rankingSignals: {
      conversionRate: 3.1 + index * 0.2,
      salesVelocity: 12 + index * 2,
      reviewQuality: buildReviewSummary(index).averageRating,
      sellerTrust: 1,
      assetReadiness:
        (resource.previewIncluded ? 1 : 0) +
        (resource.thumbnailIncluded ? 1 : 0) +
        (resource.rightsConfirmed ? 1 : 0),
      refundPenalty: 0,
      reportPenalty: index % 2,
      freshnessBoost:
        overrides?.freshnessScore ??
        resource.freshnessScore ??
        (resource.demoOnly ? marketplaceConfig.freshnessWindowDays / 2 : 4),
    },
  };
}

export function getMarketplaceListingBySlug(slug: string) {
  return marketplaceListings.find((listing) => listing.slug === slug);
}

export function getRelatedListings(subject: string, currentId: string) {
  return marketplaceListings
    .filter((listing) => listing.subject === subject && listing.id !== currentId)
    .slice(0, 3);
}

export function filterMarketplaceListings(query: string, subject?: string) {
  const normalizedQuery = query.trim().toLowerCase();

  return marketplaceListings.filter((listing) => {
    const matchesSubject = !subject || subject === "All" || listing.subject === subject;

    if (!normalizedQuery) {
      return matchesSubject;
    }

    const titleScore = listing.title.toLowerCase().includes(normalizedQuery) ? 3 : 0;
    const metadataScore =
      listing.subject.toLowerCase().includes(normalizedQuery) ||
      listing.standardsTag.toLowerCase().includes(normalizedQuery) ||
      listing.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery))
        ? 2
        : 0;
    const descriptionScore = listing.summary.toLowerCase().includes(normalizedQuery)
      ? 1
      : 0;

    return matchesSubject && titleScore + metadataScore + descriptionScore > 0;
  });
}
