export const searchWeights = {
  title: 1,
  tags: 0.65,
  metadata: 0.55,
  description: 0.25,
  conversionRate: 0.4,
  salesVelocity: 0.35,
  reviewQuality: 0.3,
  sellerTrust: 0.12,
  assetReadiness: 0.2,
  refundPenalty: -0.25,
  reportPenalty: -0.25,
  freshnessBoost: 0.2,
} as const;

export type SearchWeights = typeof searchWeights;
