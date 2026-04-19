import "server-only";

import {
  marketplaceListings as demoMarketplaceListings,
  toMarketplaceListing,
  type MarketplaceListing,
} from "@/lib/demo/catalog";
import { getMarketplaceSellerById } from "@/lib/demo/sellers";
import { isPublicProductStatus } from "@/lib/lessonforge/marketplace-rules";
import { searchWeights } from "@/lib/services/marketplace/search";
import { mergeProductRecord } from "@/lib/lessonforge/product-record-merge";
import {
  listOrders,
  listPersistedProducts,
  listReports,
  listReviews,
} from "@/lib/lessonforge/data-access";
import {
  listSupabaseOrderRecords,
  listSupabaseProductRecords,
} from "@/lib/supabase/admin-sync";
import type { ProductRecord } from "@/types";

function mergeProductSources(
  persistedProducts: ProductRecord[],
  syncedProducts: ProductRecord[],
) {
  const merged = new Map<string, ProductRecord>();

  for (const product of persistedProducts) {
    merged.set(product.id, product);
  }

  for (const product of syncedProducts) {
    const existing = merged.get(product.id);
    merged.set(product.id, existing ? mergeProductRecord(existing, product) : product);
  }

  return Array.from(merged.values());
}

function formatUpdatedAtLabel(value?: string) {
  if (!value) {
    return "Updated recently";
  }

  if (value.includes("Published") || value.includes("Saved") || value.includes("Updated")) {
    return value;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return `Updated ${date.toLocaleDateString()}`;
}

function enrichPersistedListing(
  listing: MarketplaceListing,
  productId: string,
  reviews: Awaited<ReturnType<typeof listReviews>>,
  reports: Awaited<ReturnType<typeof listReports>>,
  orders: Awaited<ReturnType<typeof listOrders>>,
) {
  const productReviews = reviews.filter((entry) => entry.productId === productId);
  const productReports = reports.filter((entry) => entry.productId === productId);
  const productOrders = orders.filter((entry) => entry.productId === productId);
  const refundedOrders = productOrders.filter((entry) =>
    productReports.some(
      (report) =>
        report.reporterEmail &&
        entry.buyerEmail &&
        report.reporterEmail === entry.buyerEmail &&
        report.category === "Access issue",
    ),
  ).length;
  const resolvedReports = productReports.filter(
    (entry) => entry.status === "Resolved" || entry.status === "Dismissed",
  ).length;
  const openReports = productReports.length - resolvedReports;
  const averageRating = productReviews.length
    ? Number(
        (
          productReviews.reduce((sum, entry) => sum + entry.rating, 0) /
          productReviews.length
        ).toFixed(1),
      )
    : 0;
  const assetReadiness =
    listing.assetHealthStatus === "Preview and thumbnail ready"
      ? 3
      : listing.assetHealthStatus === "Thumbnail still needed" ||
          listing.assetHealthStatus === "Preview still needed"
        ? 1
        : 2;

  return {
    ...listing,
    updatedAtLabel: formatUpdatedAtLabel(listing.updatedAtLabel),
    reviewSummary: {
      averageRating,
      reviewCount: productReviews.length,
      verifiedPurchaseOnly: true,
    },
    conversionLabel: productOrders.length
      ? `${Math.min(99, Math.max(1, productOrders.length * 3)).toFixed(0)}% buyer conversion`
      : "No completed purchases yet",
    salesVelocityLabel: productOrders.length
      ? `${productOrders.length} completed purchases`
      : "New listing momentum",
    issueCountLabel: openReports
      ? `${openReports} open issue${openReports === 1 ? "" : "s"}`
      : productReports.length
        ? `${productReports.length} resolved report${productReports.length === 1 ? "" : "s"}`
        : "No buyer issues reported",
    buyerTrustLabel:
      listing.assetVersionNumber > 1
        ? `Updated asset version ${listing.assetVersionNumber} available`
        : listing.buyerTrustLabel,
    rankingSignals: {
      conversionRate: productOrders.length ? Math.min(99, Math.max(1, productOrders.length * 3)) : 0,
      salesVelocity: productOrders.length,
      reviewQuality: averageRating,
      sellerTrust: 1,
      assetReadiness,
      refundPenalty: refundedOrders,
      reportPenalty: openReports,
      freshnessBoost: listing.freshnessScore,
    },
  };
}

function buildSellerTrustLabel(values: {
  listingCount: number;
  totalReviewCount: number;
  averageRating: number;
}) {
  if (values.totalReviewCount >= 25 && values.averageRating >= 4.8) {
    return "Trusted seller";
  }

  if (values.totalReviewCount >= 10 && values.averageRating >= 4.6) {
    return "Review-backed store";
  }

  if (values.listingCount >= 3) {
    return "Established storefront";
  }

  return "Growing storefront";
}

function computeSellerTrustScore(values: {
  listingCount: number;
  totalReviewCount: number;
  averageRating: number;
}) {
  const listingScore = Math.min(values.listingCount / 5, 1);
  const reviewScore = Math.min(values.totalReviewCount / 25, 1);
  const ratingScore = Math.min(values.averageRating / 5, 1);

  return Number(((listingScore + reviewScore + ratingScore) / 3).toFixed(2));
}

function attachSellerTrustSignals(listings: MarketplaceListing[]) {
  const sellerMetrics = listings.reduce<
    Record<
      string,
      { listingCount: number; totalReviewCount: number; ratingTotal: number }
    >
  >((accumulator, listing) => {
    const existing = accumulator[listing.sellerId] ?? {
      listingCount: 0,
      totalReviewCount: 0,
      ratingTotal: 0,
    };

    existing.listingCount += 1;
    existing.totalReviewCount += listing.reviewSummary.reviewCount;
    existing.ratingTotal += listing.reviewSummary.averageRating;
    accumulator[listing.sellerId] = existing;
    return accumulator;
  }, {});

  return listings.map((listing) => {
    const metrics = sellerMetrics[listing.sellerId] ?? {
      listingCount: 1,
      totalReviewCount: listing.reviewSummary.reviewCount,
      ratingTotal: listing.reviewSummary.averageRating,
    };
    const averageRating = Number(
      (metrics.ratingTotal / Math.max(1, metrics.listingCount)).toFixed(1),
    );

    return {
      ...listing,
      sellerListingCount: metrics.listingCount,
      sellerAverageRating: averageRating,
      sellerTotalReviewCount: metrics.totalReviewCount,
      sellerTrustLabel: buildSellerTrustLabel({
        listingCount: metrics.listingCount,
        totalReviewCount: metrics.totalReviewCount,
        averageRating,
      }),
      rankingSignals: {
        ...listing.rankingSignals,
        sellerTrust: computeSellerTrustScore({
          listingCount: metrics.listingCount,
          totalReviewCount: metrics.totalReviewCount,
          averageRating,
        }),
      },
    };
  });
}

function normalizeMetric(value: number, max: number) {
  if (max <= 0) {
    return 0;
  }

  return value / max;
}

function computeMarketplaceScore(
  listing: MarketplaceListing,
  normalizedQuery: string,
  maxima: {
    conversionRate: number;
    salesVelocity: number;
    reviewQuality: number;
    sellerTrust: number;
    assetReadiness: number;
    refundPenalty: number;
    reportPenalty: number;
    freshnessBoost: number;
  },
) {
  const titleScore = normalizedQuery
    ? listing.title.toLowerCase().includes(normalizedQuery)
      ? 1
      : 0
    : 0;
  const metadataScore = normalizedQuery
    ? listing.subject.toLowerCase().includes(normalizedQuery) ||
      listing.standardsTag.toLowerCase().includes(normalizedQuery)
      ? 1
      : 0
    : 0;
  const descriptionScore = normalizedQuery
    ? listing.summary.toLowerCase().includes(normalizedQuery) ||
      listing.shortDescription.toLowerCase().includes(normalizedQuery)
      ? 1
      : 0
    : 0;

  return (
    titleScore * searchWeights.title +
    metadataScore * (searchWeights.tags + searchWeights.metadata) +
    descriptionScore * searchWeights.description +
    normalizeMetric(listing.rankingSignals.conversionRate, maxima.conversionRate) *
      searchWeights.conversionRate +
    normalizeMetric(listing.rankingSignals.salesVelocity, maxima.salesVelocity) *
      searchWeights.salesVelocity +
    normalizeMetric(listing.rankingSignals.reviewQuality, maxima.reviewQuality) *
      searchWeights.reviewQuality +
    normalizeMetric(listing.rankingSignals.sellerTrust, maxima.sellerTrust) *
      searchWeights.sellerTrust +
    normalizeMetric(listing.rankingSignals.assetReadiness, maxima.assetReadiness) *
      searchWeights.assetReadiness +
    normalizeMetric(listing.rankingSignals.refundPenalty, maxima.refundPenalty) *
      searchWeights.refundPenalty +
    normalizeMetric(listing.rankingSignals.reportPenalty, maxima.reportPenalty) *
      searchWeights.reportPenalty +
    normalizeMetric(listing.rankingSignals.freshnessBoost, maxima.freshnessBoost) *
      searchWeights.freshnessBoost
  );
}

export async function listMarketplaceListings() {
  const [persistedProducts, syncedProducts, reviews, reports, orders, syncedOrders] = await Promise.all([
    listPersistedProducts(),
    listSupabaseProductRecords().catch(() => []),
    listReviews(),
    listReports(),
    listOrders(),
    listSupabaseOrderRecords().catch(() => []),
  ]);
  const effectiveProducts = mergeProductSources(persistedProducts, syncedProducts);
  const effectiveOrders = syncedOrders.length ? syncedOrders : orders;
  const persistedListings = effectiveProducts
    .filter((product) => isPublicProductStatus(product.productStatus))
    .map((product, index) =>
      enrichPersistedListing(
        toMarketplaceListing(product, index, {
          updatedAtLabel: formatUpdatedAtLabel(product.updatedAt),
        }),
        product.id,
        reviews,
        reports,
        effectiveOrders,
      ),
    );

  if (persistedListings.length === 0) {
    return attachSellerTrustSignals(demoMarketplaceListings);
  }

  return attachSellerTrustSignals(persistedListings);
}

export async function listPublicMarketplacePreviewListings() {
  const demoListings = attachSellerTrustSignals(
    demoMarketplaceListings.filter((listing) => listing.demoOnly),
  );

  return demoListings.slice(0, 12);
}

export async function getPublicMarketplaceListingBySlug(slug: string) {
  const listings = await listPublicMarketplacePreviewListings();
  return listings.find((listing) => listing.slug === slug);
}

export async function getPublicRelatedListings(subject: string, currentId: string) {
  const listings = await listPublicMarketplacePreviewListings();
  return listings
    .filter((listing) => listing.subject === subject && listing.id !== currentId)
    .slice(0, 3);
}

export async function filterPublicMarketplaceListings(
  query: string,
  subject?: string,
  _trustFilter?: string,
  _gradeFilter?: string,
  _resourceTypeFilter?: string,
  _priceFilter?: string,
  sort?: string,
) {
  const listings = await listPublicMarketplacePreviewListings();
  const normalizedQuery = query.trim().toLowerCase();

  const filtered = listings.filter((listing) => {
    const matchesSubject = !subject || subject === "All" || listing.subject === subject;

    if (!normalizedQuery) {
      return matchesSubject;
    }

    const titleScore = listing.title.toLowerCase().includes(normalizedQuery) ? 3 : 0;
    const metadataScore =
      listing.subject.toLowerCase().includes(normalizedQuery) ||
      listing.standardsTag.toLowerCase().includes(normalizedQuery)
        ? 2
        : 0;
    const descriptionScore = listing.summary.toLowerCase().includes(normalizedQuery)
      ? 1
      : 0;

    return matchesSubject && titleScore + metadataScore + descriptionScore > 0;
  });

  if (sort === "newest") {
    return [...filtered].sort((left, right) => right.assetVersionNumber - left.assetVersionNumber);
  }

  if (sort === "title") {
    return [...filtered].sort((left, right) => left.title.localeCompare(right.title));
  }

  return filtered;
}

export async function getMarketplaceListingBySlug(slug: string) {
  const listings = await listMarketplaceListings();
  return listings.find((listing) => listing.slug === slug);
}

export async function getRelatedListings(subject: string, currentId: string) {
  const listings = await listMarketplaceListings();
  return listings
    .filter((listing) => listing.subject === subject && listing.id !== currentId)
    .slice(0, 3);
}

export async function filterMarketplaceListings(
  query: string,
  subject?: string,
  trustFilter?: string,
  gradeFilter?: string,
  resourceTypeFilter?: string,
  priceFilter?: string,
  sort?: string,
) {
  const listings = await listMarketplaceListings();
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = listings.filter((listing) => {
    const matchesSubject = !subject || subject === "All" || listing.subject === subject;
    const matchesGrade = !gradeFilter || gradeFilter === "All" || listing.gradeBand === gradeFilter;
    const matchesResourceType =
      !resourceTypeFilter || resourceTypeFilter === "All" || listing.resourceType === resourceTypeFilter;
    const matchesPrice =
      !priceFilter ||
      priceFilter === "all" ||
      (priceFilter === "under-10" && listing.priceCents < 1000) ||
      (priceFilter === "10-15" && listing.priceCents >= 1000 && listing.priceCents <= 1500) ||
      (priceFilter === "15-plus" && listing.priceCents > 1500);
    const matchesTrust =
      !trustFilter ||
      trustFilter === "all" ||
      (trustFilter === "asset-ready" && listing.assetHealthStatus === "Preview and thumbnail ready") ||
      (trustFilter === "updated" && listing.assetVersionNumber > 1) ||
      (trustFilter === "review-backed" && listing.reviewSummary.reviewCount > 0) ||
      (trustFilter === "trusted-seller" &&
        (listing.sellerTrustLabel === "Trusted seller" ||
          listing.sellerTrustLabel === "Review-backed store"));

    if (!normalizedQuery) {
      return matchesSubject && matchesGrade && matchesResourceType && matchesPrice && matchesTrust;
    }

    const titleScore = listing.title.toLowerCase().includes(normalizedQuery) ? 3 : 0;
    const metadataScore =
      listing.subject.toLowerCase().includes(normalizedQuery) ||
      listing.standardsTag.toLowerCase().includes(normalizedQuery)
        ? 2
        : 0;
    const descriptionScore = listing.summary.toLowerCase().includes(normalizedQuery)
      ? 1
      : 0;

    return (
      matchesSubject &&
      matchesGrade &&
      matchesResourceType &&
      matchesPrice &&
      matchesTrust &&
      titleScore + metadataScore + descriptionScore > 0
    );
  });

  const maxima = filtered.reduce(
    (accumulator, listing) => ({
      conversionRate: Math.max(
        accumulator.conversionRate,
        listing.rankingSignals.conversionRate,
      ),
      salesVelocity: Math.max(
        accumulator.salesVelocity,
        listing.rankingSignals.salesVelocity,
      ),
      reviewQuality: Math.max(
        accumulator.reviewQuality,
        listing.rankingSignals.reviewQuality,
      ),
      sellerTrust: Math.max(
        accumulator.sellerTrust,
        listing.rankingSignals.sellerTrust,
      ),
      assetReadiness: Math.max(
        accumulator.assetReadiness,
        listing.rankingSignals.assetReadiness,
      ),
      refundPenalty: Math.max(
        accumulator.refundPenalty,
        listing.rankingSignals.refundPenalty,
      ),
      reportPenalty: Math.max(
        accumulator.reportPenalty,
        listing.rankingSignals.reportPenalty,
      ),
      freshnessBoost: Math.max(
        accumulator.freshnessBoost,
        listing.rankingSignals.freshnessBoost,
      ),
    }),
    {
      conversionRate: 0,
      salesVelocity: 0,
      reviewQuality: 0,
      sellerTrust: 0,
      assetReadiness: 0,
      refundPenalty: 0,
      reportPenalty: 0,
      freshnessBoost: 0,
    },
  );

  const ranked = filtered.sort((left, right) => {
    const rightScore = computeMarketplaceScore(right, normalizedQuery, maxima);
    const leftScore = computeMarketplaceScore(left, normalizedQuery, maxima);

    return rightScore - leftScore;
  });

  if (sort === "newest") {
    return [...ranked].sort((left, right) => right.assetVersionNumber - left.assetVersionNumber);
  }

  if (sort === "best-reviewed") {
    return [...ranked].sort(
      (left, right) =>
        right.reviewSummary.averageRating - left.reviewSummary.averageRating ||
        right.reviewSummary.reviewCount - left.reviewSummary.reviewCount,
    );
  }

  if (sort === "recently-updated") {
    return [...ranked].sort((left, right) => right.assetVersionNumber - left.assetVersionNumber);
  }

  return ranked;
}

export async function getMarketplaceSellerWithPersistedListings(sellerId: string) {
  const listings = await listMarketplaceListings();
  const persistedSellerListings = listings.filter((listing) => listing.sellerId === sellerId);
  const demoSeller = getMarketplaceSellerById(sellerId);

  if (!persistedSellerListings.length) {
    return demoSeller;
  }

  if (!demoSeller) {
    return {
      id: sellerId,
      name: persistedSellerListings[0]?.sellerName ?? "Seller",
      handle: persistedSellerListings[0]?.sellerHandle ?? "@lessonforge-seller",
      listingCount: persistedSellerListings.length,
      averageRating: Number(
        (
          persistedSellerListings.reduce(
            (sum, listing) => sum + listing.reviewSummary.averageRating,
            0,
          ) / persistedSellerListings.length
        ).toFixed(1),
      ),
      totalReviewCount: persistedSellerListings.reduce(
        (sum, listing) => sum + listing.reviewSummary.reviewCount,
        0,
      ),
      featuredSubjects: Array.from(
        new Set(persistedSellerListings.map((listing) => listing.subject)),
      ),
      listings: persistedSellerListings,
    };
  }

  return {
    ...demoSeller,
    listingCount: persistedSellerListings.length,
    totalReviewCount: persistedSellerListings.reduce(
      (sum, listing) => sum + listing.reviewSummary.reviewCount,
      0,
    ),
    averageRating: Number(
      (
        persistedSellerListings.reduce(
          (sum, listing) => sum + listing.reviewSummary.averageRating,
          0,
        ) / persistedSellerListings.length
      ).toFixed(1),
    ),
    featuredSubjects: Array.from(
      new Set(persistedSellerListings.map((listing) => listing.subject)),
    ),
    listings: persistedSellerListings,
  };
}
