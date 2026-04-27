import seedMarketplaceProducts from "@/data/seed-marketplace-products.json";

export type LaunchProductAssetSeed = {
  id: string;
  slug?: string;
  title: string;
  subject: string;
  gradeBand: string;
  standardsTag: string;
  updatedAt: string;
  format: string;
  summary: string;
  shortDescription: string;
  fullDescription: string;
  demoOnly: boolean;
  resourceType: string;
  licenseType: string;
  fileTypes: string[];
  includedItems: string[];
  howToUse?: string[];
  fileList?: string[];
  previewLabels: string[];
  previewPages: number[];
  thumbnailUrl: string;
  previewAssetUrls: string[];
  originalAssetUrl: string;
  assetVersionNumber: number;
  previewIncluded: boolean;
  thumbnailIncluded: boolean;
  rightsConfirmed: boolean;
  freshnessScore: number;
  sellerName: string;
  sellerHandle: string;
  sellerId: string;
  sellerStripeAccountEnvKey: string;
  priceCents: number;
  isPurchasable: boolean;
  productStatus: "Published";
  createdPath: "Manual upload";
  tags: string[];
  fileName: string;
  pageCount: number;
};

export const launchProductAssetSeeds =
  seedMarketplaceProducts as LaunchProductAssetSeed[];

export function getLaunchProductAssetSeed(productId: string) {
  return launchProductAssetSeeds.find((asset) => asset.id === productId) ?? null;
}
