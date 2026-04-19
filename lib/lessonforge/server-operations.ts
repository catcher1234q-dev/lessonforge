import { hasAppSessionForEmail } from "@/lib/auth/app-session";
import { getCurrentViewer } from "@/lib/auth/viewer";
import {
  normalizePlanKey,
  planConfig,
  starterUpgradePromptSalesThresholdCents,
  type PlanKey,
} from "@/lib/config/plans";
import {
  getAiCreditStatus,
  getListingLimitStatus,
  getLockedFeatureMessage,
  getPremiumFeatureStatus,
} from "@/lib/lessonforge/plan-enforcement";
import {
  getProductAssetHealthStatus,
  getProductPublishBlockers,
} from "@/lib/lessonforge/product-validation";
import { mergeProductRecord } from "@/lib/lessonforge/product-record-merge";
import { filterMarketplaceListings } from "@/lib/lessonforge/server-catalog";
import { buildMarketplaceListingHref } from "@/lib/lessonforge/marketplace-navigation";
import {
  getAdminAiSettings,
  getOrCreateSubscription,
  listAdminAuditLogs,
  listFavorites,
  listMonetizationEvents,
  listSellerProfiles,
  listOrders,
  listPersistedProducts,
  listReports,
  listRefundRequests,
  listReviews,
  listSubscriptions,
  listUsageLedger,
} from "@/lib/lessonforge/data-access";
import {
  getSupabaseSubscriptionRecord,
  listSupabaseLibraryAccessProductIdsForBuyer,
  listSupabaseOrderRecordsForBuyer,
  listSupabaseOrderRecordsForSeller,
  listSupabaseProductRecords,
} from "@/lib/supabase/admin-sync";
import type {
  OrderRecord,
  ProductRecord,
  SubscriptionRecord,
  UsageLedgerEntry,
  Viewer,
} from "@/types";

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

async function getSignedInBuyerViewer(): Promise<Viewer | null> {
  const viewer = await getCurrentViewer();

  if (viewer.role !== "buyer") {
    return null;
  }

  if (!(await hasAppSessionForEmail(viewer.email))) {
    return null;
  }

  return viewer;
}

function parseVersionLabel(value?: string) {
  if (!value) {
    return 1;
  }

  const match = value.match(/(\d+)/);
  return match ? Number(match[1]) : 1;
}

function slugifyProductTitle(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isWithinLastDays(value: string, days: number) {
  const timestamp = new Date(value).getTime();

  if (Number.isNaN(timestamp)) {
    return false;
  }

  return Date.now() - timestamp <= days * 24 * 60 * 60 * 1000;
}

function getStorefrontTrustLabel(values: {
  listingCount: number;
  averageRating: number;
  totalReviewCount: number;
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

export async function listLibraryItems() {
  const viewer = await getSignedInBuyerViewer();

  if (!viewer) {
    return [];
  }

  const [orders, syncedOrders, grantedProductIds, refundRequests, products] = await Promise.all([
    listOrders(),
    listSupabaseOrderRecordsForBuyer(viewer.email).catch(() => [] as OrderRecord[]),
    listSupabaseLibraryAccessProductIdsForBuyer(viewer.email).catch(() => [] as string[]),
    listRefundRequests(),
    listPersistedProducts(),
  ]);

  const buyerOrders = (syncedOrders.length
    ? syncedOrders
    : orders.filter((order) => order.buyerEmail === viewer.email))
    .filter((order) => {
      const hasGrantedAccess = grantedProductIds.includes(order.productId);
      const isRecentPaidFallback =
        order.paymentStatus === "paid" &&
        Date.now() - new Date(order.purchasedAt).getTime() < 5 * 60 * 1000;

      return (
        order.paymentStatus !== "failed" &&
        order.paymentStatus !== "refunded" &&
        (hasGrantedAccess || isRecentPaidFallback)
      );
    })
    .sort((left, right) => new Date(right.purchasedAt).getTime() - new Date(left.purchasedAt).getTime());

  return buyerOrders
    .map((order) => {
      const refund = refundRequests.find((entry) => entry.orderId === order.id);
      const currentProduct = products.find((product) => product.id === order.productId);
      const purchasedVersion = parseVersionLabel(order.versionLabel);
      const currentVersion = currentProduct?.assetVersionNumber ?? purchasedVersion;
      const hasNewerEligibleVersion = currentVersion > purchasedVersion;

      return {
        ...order,
        refundStatus: refund?.status ?? null,
        currentAssetVersion: currentVersion,
        hasNewerEligibleVersion,
        assetHealthStatus: currentProduct
          ? getProductAssetHealthStatus(currentProduct)
          : "Ready to publish",
      };
    });
}

export async function getReviewsForProduct(productId: string) {
  const reviews = await listReviews();
  return reviews.filter((review) => review.productId === productId);
}

export async function getViewerFavoriteProductIds() {
  const viewer = await getSignedInBuyerViewer();

  if (!viewer) {
    return [];
  }

  const favorites = await listFavorites();

  return favorites
    .filter((favorite) => favorite.userEmail === viewer.email)
    .map((favorite) => favorite.productId);
}

export async function getFavoriteListingsForViewer() {
  const favoriteProductIds = await getViewerFavoriteProductIds();

  if (favoriteProductIds.length === 0) {
    return [];
  }

  const listings = await filterMarketplaceListings("", "All");

  return listings.filter((listing) => favoriteProductIds.includes(listing.id));
}

export async function getAdminOverview() {
  const [products, syncedProducts, orders, reports, refundRequests, reviews, subscriptions, usageLedger, aiSettings, auditLogs, monetizationEvents] = await Promise.all([
    listPersistedProducts(),
    listSupabaseProductRecords().catch(() => []),
    listOrders(),
    listReports(),
    listRefundRequests(),
    listReviews(),
    listSubscriptions(),
    listUsageLedger(),
    getAdminAiSettings(),
    listAdminAuditLogs(),
    listMonetizationEvents(),
  ]);
  const effectiveProducts = mergeProductSources(products, syncedProducts);

  const flaggedProducts = effectiveProducts.filter(
    (product: ProductRecord) =>
      product.productStatus === "Pending review" || product.productStatus === "Flagged",
  ).length;

  const publishedProducts = effectiveProducts.filter(
    (product: ProductRecord) => product.productStatus === "Published",
  ).length;

  const planMix = {
    starter: subscriptions.filter((entry: SubscriptionRecord) => normalizePlanKey(entry.planKey) === "starter").length,
    basic: subscriptions.filter((entry: SubscriptionRecord) => normalizePlanKey(entry.planKey) === "basic").length,
    pro: subscriptions.filter((entry: SubscriptionRecord) => normalizePlanKey(entry.planKey) === "pro").length,
  };

  const aiPressureBySeller = subscriptions
    .map((subscription: SubscriptionRecord) => {
      const sellerLedger = usageLedger.filter(
        (entry: UsageLedgerEntry) => entry.sellerId === subscription.sellerId,
      );
      const creditsSpent = sellerLedger.reduce(
        (sum: number, entry: UsageLedgerEntry) => sum + entry.creditsUsed - entry.refundedCredits,
        0,
      );
      const monthlyAllowance = subscription.monthlyCredits || 0;
      const pressureRatio =
        monthlyAllowance > 0 ? creditsSpent / monthlyAllowance : 0;

      return {
        sellerId: subscription.sellerId,
        sellerEmail: subscription.sellerEmail,
        planKey: normalizePlanKey(subscription.planKey),
        monthlyCredits: monthlyAllowance,
        availableCredits: subscription.availableCredits,
        creditsSpent,
        pressureRatio,
      };
    })
    .sort((left, right) => right.pressureRatio - left.pressureRatio);

  const highestAiPressureSellers = aiPressureBySeller.slice(0, 5);
  const highestFreePressure = Math.max(
    0,
    ...aiPressureBySeller
      .filter((entry) => entry.planKey === "starter")
      .map((entry) => entry.pressureRatio * 100),
  );
  const highestCreatorPressure = Math.max(
    0,
    ...aiPressureBySeller
      .filter((entry) => entry.planKey === "basic")
      .map((entry) => entry.pressureRatio * 100),
  );
  const highestProSellerPressure = Math.max(
    0,
    ...aiPressureBySeller
      .filter((entry) => entry.planKey === "pro")
      .map((entry) => entry.pressureRatio * 100),
  );

  const thresholdHit =
    highestFreePressure >= aiSettings.warningThresholds.starter ||
    highestCreatorPressure >= aiSettings.warningThresholds.basic ||
    highestProSellerPressure >= aiSettings.warningThresholds.pro;

  const aiCostRiskSummary = thresholdHit
    ? highestAiPressureSellers[0]
      ? `${highestAiPressureSellers[0].sellerEmail} is nearing or exceeding the current warning threshold on the ${highestAiPressureSellers[0].planKey} tier.`
      : "AI usage is approaching the configured warning thresholds."
    : "AI usage is still below the current warning thresholds across all plans.";

  const salesBySeller = orders.reduce<Record<string, number>>((accumulator, order) => {
    if (!order.sellerId || ("paymentStatus" in order && order.paymentStatus === "failed")) {
      return accumulator;
    }

    accumulator[order.sellerId] = (accumulator[order.sellerId] ?? 0) + order.amountCents;
    return accumulator;
  }, {});

  const starterSellersReadyToUpgrade = subscriptions.filter((subscription) => {
    if (normalizePlanKey(subscription.planKey) !== "starter") {
      return false;
    }

      return (
      (salesBySeller[subscription.sellerId] ?? 0) >= starterUpgradePromptSalesThresholdCents
    );
  }).length;
  const sellerWatchlist = subscriptions
    .filter((subscription) => normalizePlanKey(subscription.planKey) === "starter")
    .map((subscription) => {
      const sellerProducts = effectiveProducts.filter((product) => product.sellerId === subscription.sellerId);
      const publishedListingCount = sellerProducts.filter(
        (product) => product.productStatus === "Published",
      ).length;
      const sellerReviews = reviews.filter(
        (review) => review.buyerEmail && sellerProducts.some((product) => product.id === review.productId),
      );
      const sellerMonetizationEvents = monetizationEvents.filter(
        (event) => event.sellerId === subscription.sellerId,
      );
      const totalReviewCount = sellerReviews.length;
      const averageRating = totalReviewCount
        ? Number(
            (
              sellerReviews.reduce((sum, review) => sum + review.rating, 0) / totalReviewCount
            ).toFixed(1),
          )
        : 0;
      const grossSalesCents = salesBySeller[subscription.sellerId] ?? 0;
      const extraKeepOnBasicCents = Math.round(
        grossSalesCents *
          ((planConfig.basic.sellerSharePercent - planConfig.starter.sellerSharePercent) / 100),
      );
      const recommendedNextPlan =
        grossSalesCents >= 25_000 || publishedListingCount >= 5 ? "pro" : "basic";
      const recommendationReason =
        recommendedNextPlan === "pro"
          ? "This seller already looks like a higher-volume store, so the stronger payout and larger monthly AI allowance may fit better."
          : "This seller has enough traction that Basic looks like the clearest next step for better payout and monthly AI support.";
      const latestMonetizationEvent = sellerMonetizationEvents[0] ?? null;
      const latestTriggerLabel =
        latestMonetizationEvent?.eventType === "listing_limit_hit"
          ? "Most recent trigger: historical listing prompt."
          : latestMonetizationEvent?.eventType === "ai_credit_limit_hit"
            ? "Most recent trigger: ran out of AI room."
            : latestMonetizationEvent?.eventType === "locked_feature_clicked"
              ? "Most recent trigger: tried to open a paid feature."
              : latestMonetizationEvent?.eventType === "upgrade_click"
                ? "Most recent trigger: already clicked upgrade."
                : grossSalesCents >= starterUpgradePromptSalesThresholdCents
                  ? "Most recent trigger: crossed the Starter sales threshold."
                  : "Most recent trigger: building traction, but not yet at the threshold.";

      return {
        sellerId: subscription.sellerId,
        sellerEmail: subscription.sellerEmail,
        sellerName: sellerProducts[0]?.sellerName ?? subscription.sellerEmail,
        grossSalesCents,
        extraKeepOnBasicCents,
        publishedListingCount,
        totalReviewCount,
        averageRating,
        storefrontTrustLabel: getStorefrontTrustLabel({
          listingCount: publishedListingCount,
          averageRating,
          totalReviewCount,
        }),
        recommendedNextPlan,
        recommendationReason,
        latestTriggerLabel,
        latestTriggerSource: latestMonetizationEvent?.source ?? null,
        reachedUpgradeThreshold:
          grossSalesCents >= starterUpgradePromptSalesThresholdCents,
      };
    })
    .filter((seller) => seller.grossSalesCents > 0)
    .sort((left, right) => right.grossSalesCents - left.grossSalesCents)
    .slice(0, 5);

  const monetizationSummary = {
    upgradeClicks: monetizationEvents.filter((event) => event.eventType === "upgrade_click").length,
    listingLimitHits: monetizationEvents.filter((event) => event.eventType === "listing_limit_hit")
      .length,
    aiCreditLimitHits: monetizationEvents.filter(
      (event) => event.eventType === "ai_credit_limit_hit",
    ).length,
    lockedFeatureClicks: monetizationEvents.filter(
      (event) => event.eventType === "locked_feature_clicked",
    ).length,
    starterSellersReadyToUpgrade,
    sellerWatchlist,
  };
  const recentMonetizationEvents = monetizationEvents.filter((event) =>
    isWithinLastDays(event.createdAt, 14),
  );
  const recentPressureSummary = {
    days: 14,
    upgradeClicks: recentMonetizationEvents.filter((event) => event.eventType === "upgrade_click")
      .length,
    listingLimitHits: recentMonetizationEvents.filter(
      (event) => event.eventType === "listing_limit_hit",
    ).length,
    aiCreditLimitHits: recentMonetizationEvents.filter(
      (event) => event.eventType === "ai_credit_limit_hit",
    ).length,
    lockedFeatureClicks: recentMonetizationEvents.filter(
      (event) => event.eventType === "locked_feature_clicked",
    ).length,
  };
  const paidSellerCount = subscriptions.filter(
    (subscription) => normalizePlanKey(subscription.planKey) !== "starter",
  ).length;
  const conversionGapSummary = {
    paidSellerCount,
    starterSellersReadyToUpgrade,
    upgradeClicks: monetizationSummary.upgradeClicks,
    conversionScorePercent:
      starterSellersReadyToUpgrade > 0
        ? Math.round((paidSellerCount / starterSellersReadyToUpgrade) * 100)
        : paidSellerCount > 0
          ? 100
          : 0,
  };
  const conversionScoreLabel =
    conversionGapSummary.conversionScorePercent >= 70
      ? "Healthy"
      : conversionGapSummary.conversionScorePercent >= 35
        ? "Improving"
        : conversionGapSummary.conversionScorePercent > 0
          ? "Early"
          : "Not converting yet";
  const conversionGapRead =
    starterSellersReadyToUpgrade > paidSellerCount
      ? `There are ${starterSellersReadyToUpgrade} Starter sellers who already look upgrade-ready, but only ${paidSellerCount} paid seller subscription${paidSellerCount === 1 ? "" : "s"} active right now. The gap is likely between seller readiness and paid-plan conversion.`
      : monetizationSummary.upgradeClicks > paidSellerCount
        ? `Sellers have opened ${monetizationSummary.upgradeClicks} upgrade action${monetizationSummary.upgradeClicks === 1 ? "" : "s"}, but only ${paidSellerCount} paid seller subscription${paidSellerCount === 1 ? "" : "s"} are active. Interest is showing up before conversion.`
        : paidSellerCount > 0
          ? `There are ${paidSellerCount} active paid seller subscription${paidSellerCount === 1 ? "" : "s"}, so monetization is moving beyond interest into actual plan conversion.`
          : "No paid seller subscriptions are active yet, so monetization is still mostly in the pressure and interest stage.";
  const triggerMix = [
    {
      key: "listing_limit_hit",
      label: "Legacy listing prompts",
      count: monetizationSummary.listingLimitHits,
      detail: "Historical listing prompts before uploads were opened up.",
    },
    {
      key: "ai_credit_limit_hit",
      label: "AI limits",
      count: monetizationSummary.aiCreditLimitHits,
      detail: "Sellers are mostly feeling pressure from running out of AI support.",
    },
    {
      key: "locked_feature_clicked",
      label: "Locked premium tools",
      count: monetizationSummary.lockedFeatureClicks,
      detail: "Sellers are mostly feeling pressure from trying to open paid-only features.",
    },
    {
      key: "upgrade_click",
      label: "Active upgrade interest",
      count: monetizationSummary.upgradeClicks,
      detail: "Sellers are already opening upgrade actions, so interest is showing up directly.",
    },
  ].sort((left, right) => right.count - left.count);
  const primaryUpgradeTrigger = triggerMix[0] && triggerMix[0].count > 0
    ? triggerMix[0]
    : {
        key: "light-pressure",
        label: "Light upgrade pressure",
        count: 0,
        detail: "No single upgrade trigger is dominating yet, so seller pressure still looks early.",
      };
  const recentTriggerMix = [
    {
      label: "Listing limits",
      count: recentPressureSummary.listingLimitHits,
      detail: "Recent seller pressure is mostly coming from running out of listing room.",
    },
    {
      label: "AI limits",
      count: recentPressureSummary.aiCreditLimitHits,
      detail: "Recent seller pressure is mostly coming from running out of AI support.",
    },
    {
      label: "Locked premium tools",
      count: recentPressureSummary.lockedFeatureClicks,
      detail: "Recent seller pressure is mostly coming from paid-only tools being clicked.",
    },
    {
      label: "Active upgrade interest",
      count: recentPressureSummary.upgradeClicks,
      detail: "Recent seller pressure is mostly showing up as direct upgrade interest.",
    },
  ].sort((left, right) => right.count - left.count);
  const recentUpgradePressureRead =
    recentTriggerMix[0] && recentTriggerMix[0].count > 0
      ? `In the last ${recentPressureSummary.days} days, the strongest upgrade pressure has come from ${recentTriggerMix[0].label.toLowerCase()}. ${recentTriggerMix[0].detail}`
      : `In the last ${recentPressureSummary.days} days, seller upgrade pressure has been fairly quiet, so the current signals look more historical than urgent.`;

  const monetizationRead =
    starterSellersReadyToUpgrade > 0
      ? `${starterSellersReadyToUpgrade} Starter seller${starterSellersReadyToUpgrade === 1 ? "" : "s"} have already crossed the upgrade-sales threshold.`
      : monetizationSummary.upgradeClicks > 0
        ? `${monetizationSummary.upgradeClicks} seller upgrade click${monetizationSummary.upgradeClicks === 1 ? "" : "s"} have already happened, so plan interest is showing up before conversion.`
        : "Upgrade pressure is still light, so sellers are not yet hitting strong monetization friction in meaningful volume.";

  return {
    flaggedProducts,
    openReports: reports.filter((entry) => entry.status === "Open" || entry.status === "Under review").length,
    openRefundRequests: refundRequests.filter((entry) => entry.status === "Submitted")
      .length,
    activeSubscriptions: products.length ? Math.max(1, products.length * 2) : 0,
    aiCreditsUsedThisCycle: usageLedger.reduce(
      (sum: number, entry: UsageLedgerEntry) => sum + entry.creditsUsed - entry.refundedCredits,
      0,
    ),
    aiKillSwitchEnabled: aiSettings.aiKillSwitchEnabled,
    aiSettings,
    aiCostRiskSummary,
    monetizationSummary,
    primaryUpgradeTrigger,
    recentPressureSummary,
    recentUpgradePressureRead,
    conversionGapSummary,
    conversionScoreLabel,
    conversionGapRead,
    monetizationRead,
    persistedProducts: effectiveProducts,
    orders,
    planMix,
    publishedProducts,
    reports,
    reviews,
    refundRequests,
    subscriptions,
    auditLogs,
    highestAiPressureSellers,
    usageLedger,
  };
}

export async function getSellerAiOverview(
  sellerId: string,
  sellerEmail: string,
  sellerPlanKey?: PlanKey,
) {
  const [subscriptions, usageLedger, profiles, aiSettings, products, syncedSubscription] =
    await Promise.all([
    listSubscriptions(),
    listUsageLedger(),
    listSellerProfiles(),
    getAdminAiSettings(),
    listPersistedProducts(),
    getSupabaseSubscriptionRecord(sellerEmail).catch(() => null),
  ]);

  const existingSubscription = subscriptions.find((entry) => entry.sellerId === sellerId);
  const ledger = usageLedger.filter((entry) => entry.sellerId === sellerId).slice(0, 8);
  const profile = profiles.find((entry) => entry.email === sellerEmail);
  const requestedPlanKey = normalizePlanKey(
    syncedSubscription?.plan_name ?? sellerPlanKey ?? profile?.sellerPlanKey ?? "starter",
  );
  const resolvedPlanKey =
    existingSubscription?.planKey ?? requestedPlanKey;
  const subscription =
    resolvedPlanKey
      ? await getOrCreateSubscription(
          sellerId,
          sellerEmail,
          resolvedPlanKey,
          planConfig[resolvedPlanKey].availableCredits,
        )
      : existingSubscription ?? null;
  const listingUsage = getListingLimitStatus({
    sellerPlanKey: resolvedPlanKey,
    products,
    sellerId,
  });
  const standardsScanAccess = getAiCreditStatus({
    sellerPlanKey: resolvedPlanKey,
    subscription,
    action: "standardsScan",
  });
  const optimizationAccess = getPremiumFeatureStatus(
    resolvedPlanKey,
    "fullListingOptimization",
  );
  const revenueInsightsAccess = getPremiumFeatureStatus(
    resolvedPlanKey,
    "revenueInsights",
  );

  return {
    aiSettings,
    subscription,
    ledger,
    profile,
    listingUsage,
    standardsScanAccess,
    premiumAccess: {
      fullListingOptimization: optimizationAccess,
      revenueInsights: revenueInsightsAccess,
    },
    upgradeCopy: {
      lockedFeature: getLockedFeatureMessage(),
    },
  };
}

export async function getSellerSalesSummary(sellerId: string, sellerEmail?: string) {
  const [orders, syncedOrders, products] = await Promise.all([
    listOrders(),
    sellerEmail ? listSupabaseOrderRecordsForSeller(sellerEmail).catch(() => []) : Promise.resolve([]),
    listPersistedProducts(),
  ]);

  const sellerOrders = (syncedOrders.length
    ? syncedOrders
    : orders.filter(
        (order) =>
          order.sellerId === sellerId || (sellerEmail ? order.sellerId === sellerEmail : false),
      ));
  const sellerProducts = products.filter(
    (product) =>
      product.sellerId === sellerId || (sellerEmail ? product.sellerId === sellerEmail : false),
  );

  const grossSalesCents = sellerOrders.reduce(
    (sum, order) => sum + order.amountCents,
    0,
  );
  const sellerEarningsCents = sellerOrders.reduce(
    (sum, order) => sum + order.sellerShareCents,
    0,
  );
  const platformFeesCents = sellerOrders.reduce(
    (sum, order) => sum + order.platformShareCents,
    0,
  );
  const lastSaleAt =
    sellerOrders
      .map((order) => order.purchasedAt)
      .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0] ?? null;
  const recentSales = [...sellerOrders]
    .sort((left, right) => new Date(right.purchasedAt).getTime() - new Date(left.purchasedAt).getTime())
    .slice(0, 5)
    .map((order) => ({
      id: order.id,
      productId: order.productId,
      productTitle: order.productTitle,
      amountCents: order.amountCents,
      sellerShareCents: order.sellerShareCents,
      purchasedAt: order.purchasedAt,
      buyerName: order.buyerName ?? "Buyer",
      versionLabel: order.versionLabel,
      actionHref: "/sell/dashboard",
      actionLabel: "Open dashboard",
      secondaryHref: `/sell/products/${encodeURIComponent(order.productId)}/edit`,
      secondaryActionLabel: "Open listing",
    }));

  return {
    completedSales: sellerOrders.length,
    grossSalesCents,
    sellerEarningsCents,
    platformFeesCents,
    liveListings: sellerProducts.filter((product) => product.productStatus === "Published").length,
    buyerReadyListings: sellerProducts.filter((product) => product.isPurchasable).length,
    lastSaleAt,
    recentSales,
  };
}

export async function getAccountOverview() {
  const viewer = await getCurrentViewer();

  if (!(await hasAppSessionForEmail(viewer.email))) {
    return {
      viewer,
      buyer: {
        purchaseCount: 0,
        favoriteCount: 0,
        openRefundRequestCount: 0,
        openReportCount: 0,
        lastPurchaseAt: null,
        recentPurchases: [],
        activityTimeline: [],
      },
      seller: {
        onboardingCompleted: false,
        storeName: null,
        listingCount: 0,
        liveListingCount: 0,
        buyerReadyListingCount: 0,
        completedSales: 0,
        grossSalesCents: 0,
        sellerEarningsCents: 0,
        lastSaleAt: null,
        recentSales: [],
        recentListings: [],
      },
    };
  }

  const [orders, syncedBuyerOrders, favorites, products, syncedProducts, sellerProfiles, sellerSalesSummary, refundRequests, reports] = await Promise.all([
    listOrders(),
    listSupabaseOrderRecordsForBuyer(viewer.email).catch(() => []),
    listFavorites(),
    listPersistedProducts(),
    listSupabaseProductRecords().catch(() => []),
    listSellerProfiles(),
    getSellerSalesSummary(viewer.email, viewer.email),
    listRefundRequests(),
    listReports(),
  ]);
  const effectiveProducts = mergeProductSources(products, syncedProducts);
  const effectiveBuyerOrders = syncedBuyerOrders.length
    ? syncedBuyerOrders
    : orders
        .filter((order) => order.buyerEmail === viewer.email)
        .sort((left, right) => new Date(right.purchasedAt).getTime() - new Date(left.purchasedAt).getTime());

  const buyerFavorites = favorites.filter((favorite) => favorite.userEmail === viewer.email);
  const buyerRefundRequests = refundRequests
    .filter((request) => request.buyerEmail === viewer.email)
    .sort(
      (left, right) =>
        new Date(right.requestedAt).getTime() - new Date(left.requestedAt).getTime(),
    );
  const buyerReports = reports
    .filter((report) => report.reporterEmail === viewer.email)
    .sort(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    );
  const sellerProfile = sellerProfiles.find((profile) => profile.email === viewer.email) ?? null;
  const sellerProducts = effectiveProducts
    .filter((product) => product.sellerId === viewer.email)
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());
  const buyerRecentPurchases = effectiveBuyerOrders.slice(0, 5).map((order) => ({
    id: order.id,
    productId: order.productId,
    productTitle: order.productTitle,
    purchasedAt: order.purchasedAt,
    amountCents: order.amountCents,
    sellerName: order.sellerName,
  }));
  const buyerActivityTimeline = [
    ...effectiveBuyerOrders.map((order) => ({
      id: `purchase-${order.id}`,
      kind: "purchase" as const,
      title: `Purchased ${order.productTitle}`,
      detail: `Sold by ${order.sellerName} for $${(order.amountCents / 100).toFixed(2)}.`,
      createdAt: order.purchasedAt,
      statusLabel: "In your library",
      href: `/api/lessonforge/library-delivery?orderId=${encodeURIComponent(order.id)}`,
      actionLabel: "Open files",
      secondaryHref: buildMarketplaceListingHref({
        slug: slugifyProductTitle(order.productTitle),
        returnTo: "/library",
      }),
      secondaryActionLabel: "View listing",
    })),
    ...buyerFavorites.map((favorite) => {
      const product = effectiveProducts.find((entry) => entry.id === favorite.productId);

      return {
        id: `favorite-${favorite.id}`,
        kind: "saved" as const,
        title: `Saved ${product?.title ?? "a listing"}`,
        detail: product
          ? `${product.subject} · ${product.gradeBand} · ${product.sellerName ?? "Seller listing"}`
          : "Saved in your shortlist for later comparison.",
        createdAt: favorite.createdAt,
        statusLabel: "Waiting in saved items",
        href: product
          ? buildMarketplaceListingHref({
              slug: slugifyProductTitle(product.title),
              returnTo: "/favorites",
            })
          : "/favorites",
        actionLabel: product ? "Open listing" : "Open saved items",
        secondaryHref: "/favorites",
        secondaryActionLabel: "Open shortlist",
      };
    }),
    ...buyerRefundRequests.map((request) => ({
      id: `refund-${request.id}`,
      kind: "refund" as const,
      title: `Refund request for ${request.productTitle}`,
      detail: request.reason,
      createdAt: request.requestedAt,
      statusLabel: request.status,
      href: "/library?view=support",
      actionLabel: "Open support view",
      secondaryHref: buildMarketplaceListingHref({
        slug: slugifyProductTitle(request.productTitle),
        returnTo: "/library?view=support",
      }),
      secondaryActionLabel: "View listing",
    })),
    ...buyerReports.map((report) => ({
      id: `report-${report.id}`,
      kind: "report" as const,
      title: `Issue report for ${report.productTitle}`,
      detail: `${report.category} reported${report.details ? `: ${report.details}` : "."}`,
      createdAt: report.createdAt,
      statusLabel: report.status,
      href: "/library?view=support",
      actionLabel: "Open support view",
      secondaryHref: buildMarketplaceListingHref({
        slug: slugifyProductTitle(report.productTitle),
        returnTo: "/library?view=support",
      }),
      secondaryActionLabel: "View listing",
    })),
  ]
    .sort(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    )
    .slice(0, 8);
  const sellerRecentListings = sellerProducts.slice(0, 5).map((product) => ({
    id: product.id,
    title: product.title,
    updatedAt: product.updatedAt,
    productStatus: product.productStatus ?? "Draft",
    isPurchasable: Boolean(product.isPurchasable),
    actionHref: `/sell/products/${encodeURIComponent(product.id)}/edit`,
    actionLabel:
      product.productStatus === "Flagged" || product.productStatus === "Rejected"
        ? "Fix listing"
        : "Edit listing",
    secondaryHref: "/sell/dashboard",
    secondaryActionLabel: "Open dashboard",
  }));

  return {
    viewer,
    buyer: {
      purchaseCount: effectiveBuyerOrders.length,
      favoriteCount: buyerFavorites.length,
      openRefundRequestCount: buyerRefundRequests.filter((request) => request.status === "Submitted")
        .length,
      openReportCount: buyerReports.filter(
        (report) => report.status === "Open" || report.status === "Under review",
      ).length,
      lastPurchaseAt: effectiveBuyerOrders[0]?.purchasedAt ?? null,
      recentPurchases: buyerRecentPurchases,
      activityTimeline: buyerActivityTimeline,
    },
    seller: {
      onboardingCompleted: sellerProfile?.onboardingCompleted ?? false,
      storeName: sellerProfile?.storeName ?? null,
      listingCount: sellerProducts.length,
      liveListingCount: sellerSalesSummary.liveListings,
      buyerReadyListingCount: sellerSalesSummary.buyerReadyListings,
      completedSales: sellerSalesSummary.completedSales,
      grossSalesCents: sellerSalesSummary.grossSalesCents,
      sellerEarningsCents: sellerSalesSummary.sellerEarningsCents,
      lastSaleAt: sellerSalesSummary.lastSaleAt,
      recentSales: sellerSalesSummary.recentSales,
      recentListings: sellerRecentListings,
    },
  };
}

export async function getViewerContext() {
  return getCurrentViewer();
}

export async function getSellerRankingInsights(sellerId: string) {
  const [listings, products] = await Promise.all([
    filterMarketplaceListings("", "All"),
    listPersistedProducts(),
  ]);
  const sellerListings = listings
    .map((listing, index) => ({
      product: products.find((product) => product.id === listing.id),
      id: listing.id,
      title: listing.title,
      sellerId: listing.sellerId,
      rank: index + 1,
      conversionLabel: listing.conversionLabel,
      salesVelocityLabel: listing.salesVelocityLabel,
      issueCountLabel: listing.issueCountLabel,
      reviewCount: listing.reviewSummary.reviewCount,
      averageRating: listing.reviewSummary.averageRating,
      freshnessScore: listing.freshnessScore,
      recommendations: [
        ...(() => {
          const product = products.find((entry) => entry.id === listing.id);
          const blockers = product ? getProductPublishBlockers(product) : [];

          if (!blockers.length) {
            return [];
          }

          return [`Asset readiness: ${blockers.slice(0, 2).join(" and ")}.`];
        })(),
        ...(listing.reviewSummary.reviewCount === 0
          ? [
              "This listing has no verified reviews yet. Focus on clear previews and buyer trust details to earn early reviews.",
            ]
          : []),
        ...(listing.rankingSignals.reportPenalty > 0
          ? [
              "Open buyer issues are suppressing discovery. Fix reported problems first so the listing can recover.",
            ]
          : []),
        ...(listing.rankingSignals.conversionRate < 5
          ? [
              "Conversion is still light. Tighten the title and first description lines so buyers understand the value faster.",
            ]
          : []),
        ...(listing.freshnessScore <= 4
          ? [
              "Freshness support is limited now. A meaningful update and resubmission can help discovery again.",
            ]
          : []),
      ].slice(0, 2),
      assetHealthStatus: (() => {
        const product = products.find((entry) => entry.id === listing.id);
        return product ? getProductAssetHealthStatus(product) : "Ready to publish";
      })(),
    }))
    .filter((listing) => listing.sellerId === sellerId);

  return sellerListings;
}

export async function getAdminRankingOverview() {
  const listings = await filterMarketplaceListings("", "All");

  const topBoostedListings = [...listings]
    .sort((left, right) => right.rankingSignals.freshnessBoost - left.rankingSignals.freshnessBoost)
    .slice(0, 3)
    .map((listing) => ({
      id: listing.id,
      title: listing.title,
      sellerName: listing.sellerName,
      freshnessScore: listing.freshnessScore,
      reviewCount: listing.reviewSummary.reviewCount,
      conversionLabel: listing.conversionLabel,
    }));

  const mostSuppressedListings = [...listings]
    .sort(
      (left, right) =>
        right.rankingSignals.reportPenalty +
        right.rankingSignals.refundPenalty -
        (left.rankingSignals.reportPenalty + left.rankingSignals.refundPenalty),
    )
    .slice(0, 3)
    .map((listing) => ({
      id: listing.id,
      title: listing.title,
      sellerName: listing.sellerName,
      issueCountLabel: listing.issueCountLabel,
      reportPenalty: listing.rankingSignals.reportPenalty,
      refundPenalty: listing.rankingSignals.refundPenalty,
    }));

  return {
    topBoostedListings,
    mostSuppressedListings,
  };
}
