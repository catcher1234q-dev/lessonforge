import {
  marketplaceListings,
  type MarketplaceListing,
} from "@/lib/demo/catalog";

export type MarketplaceSeller = {
  id: string;
  name: string;
  handle: string;
  listingCount: number;
  averageRating: number;
  totalReviewCount: number;
  featuredSubjects: string[];
  listings: MarketplaceListing[];
};

export const marketplaceSellers: MarketplaceSeller[] = Object.values(
  marketplaceListings.reduce<Record<string, MarketplaceSeller>>((acc, listing) => {
    const existing = acc[listing.sellerId];

    if (existing) {
      existing.listings.push(listing);
      existing.listingCount += 1;
      existing.totalReviewCount += listing.reviewSummary.reviewCount;
      existing.averageRating = Number(
        (
          existing.listings.reduce(
            (sum, current) => sum + current.reviewSummary.averageRating,
            0,
          ) / existing.listings.length
        ).toFixed(1),
      );

      if (!existing.featuredSubjects.includes(listing.subject)) {
        existing.featuredSubjects.push(listing.subject);
      }

      return acc;
    }

    acc[listing.sellerId] = {
      id: listing.sellerId,
      name: listing.sellerName,
      handle: listing.sellerHandle,
      listingCount: 1,
      averageRating: listing.reviewSummary.averageRating,
      totalReviewCount: listing.reviewSummary.reviewCount,
      featuredSubjects: [listing.subject],
      listings: [listing],
    };

    return acc;
  }, {}),
);

export function getMarketplaceSellerById(sellerId: string) {
  return marketplaceSellers.find((seller) => seller.id === sellerId);
}
