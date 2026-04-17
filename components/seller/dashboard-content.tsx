"use client";

import { useEffect, useState } from "react";
import { FolderOpen, Lock, Sparkles, UploadCloud } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import {
  secondaryActionLinkClassName,
  secondaryActionSurfaceClassName,
} from "@/components/shared/secondary-action-link";
import { DisclosureSummary } from "@/components/shared/disclosure-summary";
import {
  aiActionCosts,
  normalizePlanKey,
  planConfig,
  starterUpgradePromptSalesThresholdCents,
  type PlanKey,
} from "@/lib/config/plans";
import {
  getAiUpgradeMessage,
  getListingLimitUpgradeMessage,
  getLockedFeatureMessage,
} from "@/lib/lessonforge/plan-enforcement";
import {
  buildSellerPlanCheckoutHref,
  buildSellerPlanManageHref,
} from "@/lib/stripe/seller-plan-billing";
import {
  getProductAssetHealthStatus,
  getProductPublishBlockers,
} from "@/lib/lessonforge/product-validation";
import { getSellerModerationGuidance } from "@/lib/lessonforge/moderation-guidance";
import { getSellerRemediationFocus } from "@/lib/lessonforge/remediation-focus";
import type {
  AdminAiSettings,
  ConnectedSeller,
  ProductRecord,
  SubscriptionRecord,
  UsageLedgerEntry,
  SellerProfileDraft,
} from "@/types";

function formatPlanLabel(planKey: PlanKey) {
  return planConfig[normalizePlanKey(planKey)].label;
}

const actionLabels = {
  titleSuggestion: "Title suggestions",
  descriptionRewrite: "Description rewrite",
  standardsScan: "Standards scan",
  thumbnailGeneration: "Thumbnail generation",
  previewGeneration: "Preview generation",
} as const;

function formatTimelineTime(value?: string) {
  if (!value) {
    return "Just now";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function buildConnectedSeller(profile: SellerProfileDraft): ConnectedSeller | null {
  if (!profile.stripeAccountId) {
    return null;
  }

  return {
    accountId: profile.stripeAccountId,
    chargesEnabled: profile.stripeChargesEnabled,
    email: profile.email,
    displayName: profile.displayName || profile.storeName || "Seller",
    payoutsEnabled: profile.stripePayoutsEnabled,
    status:
      profile.stripeChargesEnabled && profile.stripePayoutsEnabled
        ? "connected"
        : "setup_incomplete",
  };
}

function buildFallbackProfile(viewer?: {
  name?: string;
  email?: string;
}): SellerProfileDraft {
  const email = viewer?.email || "";
  const displayName = viewer?.name || "";

  return {
    displayName,
    email,
    storeName: displayName || "Seller",
    storeHandle: email.split("@")[0]?.replace(/[^a-z0-9-]+/gi, "-") || "seller",
    primarySubject: "Math",
    tagline: "",
    sellerPlanKey: "starter",
    onboardingCompleted: false,
  };
}

async function trackMonetizationEvent(input: {
  eventType: "listing_limit_hit" | "ai_credit_limit_hit" | "locked_feature_clicked" | "upgrade_click";
  source: "seller_dashboard";
  planKey: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    await fetch("/api/lessonforge/monetization-events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
      keepalive: true,
    });
  } catch {
    // Tracking should never block dashboard actions.
  }
}

function getPlanActionCopy(currentPlanKey: PlanKey, nextPlanKey: PlanKey) {
  if (currentPlanKey === "starter" && nextPlanKey !== "starter") {
    return {
      kind: "checkout" as const,
      href: buildSellerPlanCheckoutHref({
        planKey: nextPlanKey,
        returnTo: "/sell/dashboard?focus=plan",
      }),
      message: `Continue to ${formatPlanLabel(nextPlanKey)} checkout.`,
    };
  }

  if (currentPlanKey !== "starter" && nextPlanKey === "starter") {
    return {
      kind: "manage" as const,
      href: buildSellerPlanManageHref({
        returnTo: "/sell/dashboard?focus=plan",
      }),
      message: "Use Stripe billing management to cancel your paid plan safely.",
    };
  }

  if (currentPlanKey !== "starter" && nextPlanKey !== currentPlanKey) {
    return {
      kind: "manage" as const,
      href: buildSellerPlanManageHref({
        returnTo: "/sell/dashboard?focus=plan",
      }),
      message: `Use Stripe billing management to switch from ${formatPlanLabel(currentPlanKey)} to ${formatPlanLabel(nextPlanKey)} safely.`,
    };
  }

  return {
    kind: "current" as const,
    href: null,
    message: `${formatPlanLabel(currentPlanKey)} is already active for this seller profile.`,
  };
}

function getListingPerformanceSummary(
  resource: ProductRecord,
  insight?: {
    rank: number;
    reviewCount: number;
    freshnessScore: number;
    recommendations: string[];
  },
): {
  label: string;
  tone: "emerald" | "amber" | "rose" | "slate";
  detail: string;
} {
  const blockers = getProductPublishBlockers(resource);

  if (blockers.length > 0) {
    return {
      label: "Needs listing fixes",
      tone: "amber",
      detail: "Preview, thumbnail, or rights confirmation is still blocking full readiness.",
    };
  }

  if (resource.productStatus === "Flagged" || resource.productStatus === "Rejected") {
    return {
      label: "Needs seller action",
      tone: "amber",
      detail: "Moderation feedback is holding this listing back until it is updated and resubmitted.",
    };
  }

  if (insight && insight.rank <= 3 && insight.reviewCount > 0) {
    return {
      label: "Strong listing",
      tone: "emerald",
      detail: "This listing is ranking well and already has proof from verified buyers.",
    };
  }

  if (insight && insight.recommendations.length > 0) {
    return {
      label: "Needs more buyer traction",
      tone: "rose",
      detail: "Marketplace signals suggest this listing needs stronger trust, conversion, or freshness work.",
    };
  }

  if (insight && insight.freshnessScore <= 4) {
    return {
      label: "Needs refresh",
      tone: "amber",
      detail: "A meaningful update could help this listing regain freshness support.",
    };
  }

  return {
    label: "In good shape",
    tone: "slate",
    detail: "This listing is publish-ready and does not have an urgent marketplace warning right now.",
  };
}

function performanceBadgeClasses(tone: "emerald" | "amber" | "rose" | "slate") {
  if (tone === "emerald") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (tone === "amber") {
    return "bg-amber-50 text-amber-800";
  }

  if (tone === "rose") {
    return "bg-rose-50 text-rose-700";
  }

  return "bg-slate-100 text-ink-soft";
}

type SellerListingFilter = "all" | "needs-action" | "top-performers" | "asset-blocked";

function parseSellerListingFilter(value: string | null): SellerListingFilter {
  if (value === "needs-action" || value === "top-performers" || value === "asset-blocked") {
    return value;
  }

  return "all";
}

function buildSellerDashboardFilterHref(filter: SellerListingFilter) {
  return filter === "all" ? "/sell/dashboard" : `/sell/dashboard?view=${filter}`;
}

function getSellerFilterSummary(
  filter: SellerListingFilter,
  filteredCount: number,
  totalCount: number,
) {
  if (filter === "needs-action") {
    return {
      title: `${filteredCount} listing${filteredCount === 1 ? "" : "s"} needing seller attention`,
      body: "Use this mode to tackle flagged, rejected, or underperforming listings before you spend time on routine catalog work.",
    };
  }

  if (filter === "top-performers") {
    return {
      title: `${filteredCount} top performer${filteredCount === 1 ? "" : "s"} worth protecting`,
      body: "Stay here when you want to refresh strong listings, protect discovery momentum, and update what is already converting well.",
    };
  }

  if (filter === "asset-blocked") {
    return {
      title: `${filteredCount} listing${filteredCount === 1 ? "" : "s"} blocked by missing assets`,
      body: "This mode isolates preview, thumbnail, and rights blockers so you can get launch-readiness issues fixed in one pass.",
    };
  }

  return {
    title: `${totalCount} listing${totalCount === 1 ? "" : "s"} across your full catalog`,
    body: "Browse the whole dashboard when you want the broadest picture of readiness, trust signals, and next listing moves.",
  };
}

function getSellerListingFilterReason(
  filter: SellerListingFilter,
  resource: ProductRecord,
  insight?: {
    rank: number;
    reviewCount: number;
    freshnessScore: number;
    recommendations: string[];
  },
) {
  const assetHealthStatus = getProductAssetHealthStatus(resource);

  if (filter === "needs-action") {
    if (resource.productStatus === "Flagged" || resource.productStatus === "Rejected") {
      return {
        label: "Why you are seeing this listing",
        body: "This listing is in a recovery state and needs seller changes before it can safely move forward again.",
      };
    }

    return {
      label: "Why you are seeing this listing",
      body: "Marketplace performance or buyer-readiness signals suggest this listing should be improved before routine catalog work.",
    };
  }

  if (filter === "top-performers") {
    return {
      label: "Why you are seeing this listing",
      body:
        insight && insight.rank <= 3
          ? `This listing is ranking at #${insight.rank} and is worth protecting with fresh updates and strong buyer-facing assets.`
          : "This listing is currently one of your strongest performers and is worth protecting with careful refresh work.",
    };
  }

  if (filter === "asset-blocked") {
    return {
      label: "Why you are seeing this listing",
      body: `This listing is blocked by asset readiness issues, currently showing ${assetHealthStatus.toLowerCase()}.`,
    };
  }

  return null;
}

function getSellerFilterEmptyState(filter: SellerListingFilter, hasResources: boolean) {
  if (!hasResources) {
    return {
      title: "No uploaded resources yet",
      body: "Create your first listing from the seller flow to populate this dashboard and start tracking readiness, trust, and payout progress.",
      actionLabel: "Create product",
      actionHref: "/sell/products/new",
    };
  }

  if (filter === "needs-action") {
    return {
      title: "No listings need attention right now",
      body: "Your recovery queue is clear. Switch back to all listings or focus on top performers and asset polish next.",
      actionLabel: "View all listings",
      actionHref: "/sell/dashboard",
    };
  }

  if (filter === "top-performers") {
    return {
      title: "No top performers in this view yet",
      body: "Keep improving titles, previews, and trust details until more listings start earning stronger marketplace proof.",
      actionLabel: "View all listings",
      actionHref: "/sell/dashboard",
    };
  }

  if (filter === "asset-blocked") {
    return {
      title: "No asset-blocked listings right now",
      body: "Previews, thumbnails, and rights checks look healthy in this catalog slice. Move back to all listings to plan your next refresh.",
      actionLabel: "View all listings",
      actionHref: "/sell/dashboard",
    };
  }

  return {
    title: "No listings match this filter right now",
    body: "Try another seller dashboard mode or keep improving your current drafts.",
    actionLabel: "View all listings",
    actionHref: "/sell/dashboard",
  };
}

function getSellerFilterStatCards(
  filter: SellerListingFilter,
  filteredResources: ProductRecord[],
  filteredListingSummary: {
    needsPreview: number;
    needsThumbnail: number;
    needsRights: number;
    topPerformersReadyForRefresh: number;
    underperforming: number;
  },
  rankingInsights: Array<{
    id: string;
    title?: string;
    rank: number;
    conversionLabel: string;
    salesVelocityLabel: string;
    issueCountLabel: string;
    reviewCount: number;
    averageRating: number;
    freshnessScore: number;
    recommendations: string[];
    assetHealthStatus: string;
  }>,
) {
  if (filter === "needs-action") {
    const recoveryCount = filteredResources.filter(
      (resource) => resource.productStatus === "Flagged" || resource.productStatus === "Rejected",
    ).length;

    return [
      { key: "recovery", label: "Flagged or rejected", value: recoveryCount },
      {
        key: "underperforming",
        label: "Needs more buyer traction",
        value: filteredListingSummary.underperforming,
      },
      { key: "preview", label: "Missing preview", value: filteredListingSummary.needsPreview },
      { key: "rights", label: "Need rights check", value: filteredListingSummary.needsRights },
    ];
  }

  if (filter === "top-performers") {
    const reviewBackedCount = filteredResources.filter((resource) => {
      const insight = rankingInsights.find((entry) => entry.id === resource.id);
      return (insight?.reviewCount ?? 0) > 0;
    }).length;
    const previewReadyCount = filteredResources.filter(
      (resource) => getProductAssetHealthStatus(resource) === "Ready to publish",
    ).length;

    return [
      { key: "shown", label: "Strong listings shown", value: filteredResources.length },
      { key: "reviews", label: "Review-backed", value: reviewBackedCount },
      {
        key: "refresh",
        label: "Ready for refresh",
        value: filteredListingSummary.topPerformersReadyForRefresh,
      },
      { key: "preview-ready", label: "Preview-ready", value: previewReadyCount },
    ];
  }

  if (filter === "asset-blocked") {
    return [
      { key: "blocked", label: "Asset-blocked", value: filteredResources.length },
      { key: "preview", label: "Missing preview", value: filteredListingSummary.needsPreview },
      { key: "thumbnail", label: "Missing thumbnail", value: filteredListingSummary.needsThumbnail },
      { key: "rights", label: "Need rights check", value: filteredListingSummary.needsRights },
    ];
  }

  return [
    { key: "preview", label: "Missing preview", value: filteredListingSummary.needsPreview },
    { key: "thumbnail", label: "Missing thumbnail", value: filteredListingSummary.needsThumbnail },
    { key: "rights", label: "Need rights check", value: filteredListingSummary.needsRights },
    {
      key: "underperforming",
      label: "Needs more buyer traction",
      value: filteredListingSummary.underperforming,
    },
    {
      key: "refresh",
      label: "Strong listings ready for refresh",
      value: filteredListingSummary.topPerformersReadyForRefresh,
    },
  ];
}

function getSellerFilterBatchGuidance(
  filter: SellerListingFilter,
  filteredResources: ProductRecord[],
  filteredListingSummary: {
    needsPreview: number;
    needsThumbnail: number;
    needsRights: number;
    topPerformersReadyForRefresh: number;
    underperforming: number;
  },
) {
  if (filter === "needs-action") {
    const recoveryCount = filteredResources.filter(
      (resource) => resource.productStatus === "Flagged" || resource.productStatus === "Rejected",
    ).length;
    const guidance = [];

    if (recoveryCount > 0) {
      guidance.push(
        `${recoveryCount} listing${recoveryCount === 1 ? "" : "s"} are in seller recovery and should be revised before routine catalog work.`,
      );
    }
    if (filteredListingSummary.underperforming > 0) {
      guidance.push(
        `${filteredListingSummary.underperforming} listing${filteredListingSummary.underperforming === 1 ? "" : "s"} are underperforming and should get stronger titles, previews, or trust details next.`,
      );
    }
    if (filteredListingSummary.needsPreview > 0) {
      guidance.push(
        `${filteredListingSummary.needsPreview} listing${filteredListingSummary.needsPreview === 1 ? "" : "s"} still need preview pages before they can move cleanly through review or launch.`,
      );
    }
    if (guidance.length === 0) {
      guidance.push(
        "This attention-focused view is clear right now. Move back to all listings or protect your strongest performers next.",
      );
    }

    return guidance;
  }

  if (filter === "top-performers") {
    const guidance = [];

    if (filteredListingSummary.topPerformersReadyForRefresh > 0) {
      guidance.push(
        `${filteredListingSummary.topPerformersReadyForRefresh} top-performing listing${filteredListingSummary.topPerformersReadyForRefresh === 1 ? "" : "s"} could benefit from a fresh update to hold discovery momentum.`,
      );
    }
    if (filteredListingSummary.needsPreview > 0 || filteredListingSummary.needsThumbnail > 0) {
      guidance.push(
        "Even strong listings should keep previews and covers sharp so marketplace trust stays high.",
      );
    }
    if (guidance.length === 0) {
      guidance.push(
        "These top performers look healthy right now. Focus on incremental refreshes, stronger proof, and protecting conversion momentum.",
      );
    }

    return guidance;
  }

  if (filter === "asset-blocked") {
    const guidance = [];

    if (filteredListingSummary.needsPreview > 0) {
      guidance.push(
        `${filteredListingSummary.needsPreview} listing${filteredListingSummary.needsPreview === 1 ? "" : "s"} still need preview pages before they are fully launch-ready.`,
      );
    }
    if (filteredListingSummary.needsThumbnail > 0) {
      guidance.push(
        `${filteredListingSummary.needsThumbnail} listing${filteredListingSummary.needsThumbnail === 1 ? "" : "s"} still need a stronger buyer-facing thumbnail.`,
      );
    }
    if (filteredListingSummary.needsRights > 0) {
      guidance.push(
        `${filteredListingSummary.needsRights} listing${filteredListingSummary.needsRights === 1 ? "" : "s"} still need rights confirmation before safe publishing.`,
      );
    }
    if (guidance.length === 0) {
      guidance.push(
        "This asset-blocked view is clear right now. Move back to all listings to plan refreshes or conversion improvements next.",
      );
    }

    return guidance;
  }

  const guidance = [];

  if (filteredListingSummary.needsPreview > 0) {
    guidance.push(
      `${filteredListingSummary.needsPreview} listing${filteredListingSummary.needsPreview === 1 ? "" : "s"} still need preview pages before they are fully launch-ready.`,
    );
  }
  if (filteredListingSummary.needsThumbnail > 0) {
    guidance.push(
      `${filteredListingSummary.needsThumbnail} listing${filteredListingSummary.needsThumbnail === 1 ? "" : "s"} still need a stronger buyer-facing thumbnail.`,
    );
  }
  if (filteredListingSummary.needsRights > 0) {
    guidance.push(
      `${filteredListingSummary.needsRights} listing${filteredListingSummary.needsRights === 1 ? "" : "s"} still need rights confirmation before safe publishing.`,
    );
  }
  if (filteredListingSummary.underperforming > 0) {
    guidance.push(
      `${filteredListingSummary.underperforming} listing${filteredListingSummary.underperforming === 1 ? "" : "s"} are underperforming and should get stronger titles, previews, or trust details next.`,
    );
  }
  if (filteredListingSummary.topPerformersReadyForRefresh > 0) {
    guidance.push(
      `${filteredListingSummary.topPerformersReadyForRefresh} top-performing listing${filteredListingSummary.topPerformersReadyForRefresh === 1 ? "" : "s"} could benefit from a fresh update to hold discovery momentum.`,
    );
  }
  if (guidance.length === 0) {
    guidance.push(
      "This filtered view looks healthy right now. Focus on incremental polish or expanding the catalog.",
    );
  }

  return guidance;
}

export function SellerDashboardContent() {
  const searchParams = useSearchParams();
  const listingFilter = parseSellerListingFilter(searchParams.get("view"));
  const setupState = searchParams.get("setup");
  const listingUpdateState = searchParams.get("listingUpdate");
  const listingUpdateTitle = searchParams.get("listingTitle");
  const planBillingState = searchParams.get("planBilling");
  const targetPlan = normalizePlanKey(searchParams.get("targetPlan"));
  const [resources, setResources] = useState<ProductRecord[]>([]);
  const [seller, setSeller] = useState<ConnectedSeller | null>(null);
  const [profile, setProfile] = useState<SellerProfileDraft | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionRecord | null>(null);
  const [usageLedger, setUsageLedger] = useState<UsageLedgerEntry[]>([]);
  const [aiSettings, setAiSettings] = useState<AdminAiSettings | null>(null);
  const [listingUsage, setListingUsage] = useState<{
    planKey: "starter" | "basic" | "pro";
    limit: number;
    current: number;
    remaining: number;
    reached: boolean;
  } | null>(null);
  const [premiumAccess, setPremiumAccess] = useState<{
    fullListingOptimization: { unlocked: boolean; upgradePlanKey: "starter" | "basic" | "pro" };
    revenueInsights: { unlocked: boolean; upgradePlanKey: "starter" | "basic" | "pro" };
  } | null>(null);
  const [salesSummary, setSalesSummary] = useState<{
    completedSales: number;
    grossSalesCents: number;
    sellerEarningsCents: number;
    platformFeesCents: number;
    liveListings: number;
    buyerReadyListings: number;
    lastSaleAt: string | null;
    recentSales: Array<{
      id: string;
      productId: string;
      productTitle: string;
      amountCents: number;
      sellerShareCents: number;
      purchasedAt: string;
      buyerName: string;
      versionLabel: string;
    }>;
  } | null>(null);
  const [rankingInsights, setRankingInsights] = useState<
    Array<{
      id: string;
      title?: string;
      rank: number;
      conversionLabel: string;
      salesVelocityLabel: string;
      issueCountLabel: string;
      reviewCount: number;
      averageRating: number;
          freshnessScore: number;
          recommendations: string[];
          assetHealthStatus: string;
        }>
  >([]);
  const [planMessage, setPlanMessage] = useState<string | null>(null);
  const [isUpdatingPlan, setIsUpdatingPlan] = useState(false);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [isDashboardDataLoading, setIsDashboardDataLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const response = await fetch("/api/session/viewer");
      const payload = (await response.json()) as {
        viewer?: { role?: string; name?: string; email?: string };
      };

      if (!response.ok) {
        setIsProfileLoading(false);
        return;
      }

      const profilesResponse = await fetch("/api/lessonforge/seller-profile");
      const profilesPayload = (await profilesResponse.json()) as {
        profiles?: SellerProfileDraft[];
      };
      const matchedProfile = profilesPayload.profiles?.find(
        (entry) => entry.email === payload.viewer?.email,
      );
      const normalizedProfile = matchedProfile
        ? {
            ...matchedProfile,
            sellerPlanKey: normalizePlanKey(matchedProfile.sellerPlanKey),
          }
        : null;
      const fallbackProfile = buildFallbackProfile(
        payload.viewer?.role === "seller" ? payload.viewer : undefined,
      );
      let nextProfile = normalizedProfile ?? fallbackProfile;

      if (nextProfile.stripeAccountId) {
        const connectResponse = await fetch("/api/stripe/connect");
        const connectPayload = (await connectResponse.json()) as {
          profile?: SellerProfileDraft;
        };

        if (connectResponse.ok && connectPayload.profile) {
          nextProfile = {
            ...connectPayload.profile,
            sellerPlanKey: normalizePlanKey(connectPayload.profile.sellerPlanKey),
          };
        }
      }

      setProfile(nextProfile);
      setSeller(buildConnectedSeller(nextProfile));
      setIsProfileLoading(false);
    })();
  }, []);

  useEffect(() => {
    const sellerId = profile?.email || seller?.email;
    const sellerEmail = profile?.email || seller?.email;
    const sellerPlanKey = normalizePlanKey(profile?.sellerPlanKey);

    if (!sellerId || !sellerEmail) {
      setIsDashboardDataLoading(false);
      return;
    }

    setIsDashboardDataLoading(true);
    void (async () => {
      try {
        const productsResponse = await fetch("/api/lessonforge/products");
        const insightsResponse = await fetch(
          `/api/lessonforge/ranking-insights?sellerId=${encodeURIComponent(sellerId)}`,
        );
        const salesSummaryResponse = await fetch(
          `/api/lessonforge/seller-sales-summary?sellerId=${encodeURIComponent(sellerId)}&sellerEmail=${encodeURIComponent(sellerEmail)}`,
        );
        const response = await fetch(
          `/api/lessonforge/seller-ai?sellerId=${encodeURIComponent(sellerId)}&sellerEmail=${encodeURIComponent(sellerEmail)}&sellerPlanKey=${encodeURIComponent(sellerPlanKey)}`,
        );
        const productsPayload = (await productsResponse.json()) as {
          products?: ProductRecord[];
        };
        const payload = (await response.json()) as {
          aiSettings?: AdminAiSettings;
          subscription?: SubscriptionRecord | null;
          ledger?: UsageLedgerEntry[];
          listingUsage?: {
            planKey: "starter" | "basic" | "pro";
            limit: number;
            current: number;
            remaining: number;
            reached: boolean;
          };
          premiumAccess?: {
            fullListingOptimization: {
              unlocked: boolean;
              upgradePlanKey: "starter" | "basic" | "pro";
            };
            revenueInsights: {
              unlocked: boolean;
              upgradePlanKey: "starter" | "basic" | "pro";
            };
          };
        };
        const insightsPayload = (await insightsResponse.json()) as {
          insights?: Array<{
            id: string;
            title?: string;
            rank: number;
            conversionLabel: string;
            salesVelocityLabel: string;
            issueCountLabel: string;
            reviewCount: number;
            averageRating: number;
            freshnessScore: number;
            recommendations: string[];
            assetHealthStatus: string;
          }>;
        };
        const salesSummaryPayload = (await salesSummaryResponse.json()) as {
          completedSales?: number;
          grossSalesCents?: number;
          sellerEarningsCents?: number;
          platformFeesCents?: number;
          liveListings?: number;
          buyerReadyListings?: number;
          lastSaleAt?: string | null;
          recentSales?: Array<{
            id: string;
            productId: string;
            productTitle: string;
            amountCents: number;
            sellerShareCents: number;
            purchasedAt: string;
            buyerName: string;
            versionLabel: string;
          }>;
        };

        if (productsResponse.ok) {
          const matchingProducts = (productsPayload.products ?? []).filter(
            (product) => product.sellerId === sellerEmail || product.sellerId === sellerId,
          );
          setResources(matchingProducts);
        }

        if (insightsResponse.ok) {
          setRankingInsights(insightsPayload.insights ?? []);
        }

        if (salesSummaryResponse.ok) {
          setSalesSummary({
            completedSales: salesSummaryPayload.completedSales ?? 0,
            grossSalesCents: salesSummaryPayload.grossSalesCents ?? 0,
            sellerEarningsCents: salesSummaryPayload.sellerEarningsCents ?? 0,
            platformFeesCents: salesSummaryPayload.platformFeesCents ?? 0,
            liveListings: salesSummaryPayload.liveListings ?? 0,
            buyerReadyListings: salesSummaryPayload.buyerReadyListings ?? 0,
            lastSaleAt: salesSummaryPayload.lastSaleAt ?? null,
            recentSales: salesSummaryPayload.recentSales ?? [],
          });
        }

        if (response.ok) {
          setAiSettings(payload.aiSettings ?? null);
          setSubscription(payload.subscription ?? null);
          setUsageLedger(payload.ledger ?? []);
          setListingUsage(payload.listingUsage ?? null);
          setPremiumAccess(payload.premiumAccess ?? null);
        }
      } finally {
        setIsDashboardDataLoading(false);
      }
    })();
  }, [profile?.email, profile?.sellerPlanKey, seller?.email]);

  async function handlePlanChange(nextPlanKey: PlanKey) {
    if (!profile || isUpdatingPlan) {
      return;
    }
    const currentPlanKey = normalizePlanKey(profile.sellerPlanKey);
    const action = getPlanActionCopy(currentPlanKey, nextPlanKey);

    setIsUpdatingPlan(true);
    setPlanMessage(null);

    try {
      if (action.kind === "current") {
        setPlanMessage(action.message);
        return;
      }

      if (action.kind === "checkout") {
        void trackMonetizationEvent({
          eventType: "upgrade_click",
          source: "seller_dashboard",
          planKey: currentPlanKey,
          metadata: {
            reason: "plan_selector",
            targetPlan: nextPlanKey,
          },
        });
      }

      setPlanMessage(action.message);
      window.location.assign(action.href);
    } catch (error) {
      setPlanMessage(
        error instanceof Error ? error.message : "Unable to open seller billing.",
      );
    } finally {
      setIsUpdatingPlan(false);
    }
  }

  const aiTimeline = [
    ...(subscription
      ? [
          {
            id: `subscription-${subscription.planKey}`,
            title: `Current plan: ${formatPlanLabel(subscription.planKey)}`,
            detail: `${subscription.availableCredits} credits currently available from your ${planConfig[subscription.planKey].creditGrantLabel.toLowerCase()}.`,
            timestamp: subscription.cycleLabel,
          },
        ]
      : []),
    ...(aiSettings?.aiKillSwitchEnabled
      ? [
          {
            id: "ai-paused",
            title: "AI paused by admin",
            detail:
              "New AI actions are temporarily blocked across the seller experience.",
            timestamp: formatTimelineTime(aiSettings.updatedAt),
          },
        ]
      : aiSettings
        ? [
            {
              id: "ai-live",
              title: "AI available",
              detail:
                "Admin controls currently allow new AI-assisted seller actions.",
              timestamp: formatTimelineTime(aiSettings.updatedAt),
            },
          ]
        : []),
    ...usageLedger.slice(0, 5).map((entry) => ({
      id: entry.id,
      title:
        entry.status === "refunded"
          ? `${actionLabels[entry.action]} refunded`
          : `${actionLabels[entry.action]} used`,
      detail:
        entry.status === "refunded"
          ? `${entry.refundedCredits} credits were restored after the action failed or was reversed.`
          : `${entry.creditsUsed} credits were applied through ${entry.provider}.`,
      timestamp: formatTimelineTime(entry.createdAt),
    })),
    ...(planMessage
      ? [
          {
            id: "plan-change-message",
            title: "Plan updated",
            detail: planMessage,
            timestamp: "This session",
          },
        ]
      : []),
  ].slice(0, 7);
  const assetHealthSummary = {
    ready: resources.filter((resource) => getProductAssetHealthStatus(resource) === "Ready to publish").length,
    needsPreview: resources.filter((resource) => getProductAssetHealthStatus(resource) === "Needs preview").length,
    needsThumbnail: resources.filter((resource) => getProductAssetHealthStatus(resource) === "Needs thumbnail").length,
    needsRights: resources.filter((resource) => getProductAssetHealthStatus(resource) === "Needs rights confirmation").length,
  };
  const attentionFirstListings = resources
    .map((resource) => {
      const insight = rankingInsights.find((entry) => entry.id === resource.id);
      const summary = getListingPerformanceSummary(resource, insight);

      return {
        id: resource.id,
        title: resource.title,
        summary,
      };
    })
    .filter((entry) => entry.summary.tone === "amber" || entry.summary.tone === "rose")
    .slice(0, 3);
  const filteredResources = resources.filter((resource) => {
    const insight = rankingInsights.find((entry) => entry.id === resource.id);
    const performanceSummary = getListingPerformanceSummary(resource, insight);
    const blockers = getProductPublishBlockers(resource);

    if (listingFilter === "needs-action") {
      return performanceSummary.tone === "amber" || performanceSummary.tone === "rose";
    }

    if (listingFilter === "top-performers") {
      return performanceSummary.tone === "emerald";
    }

    if (listingFilter === "asset-blocked") {
      return blockers.length > 0;
    }

    return true;
  });
  const filteredListingSummary = {
    needsPreview: filteredResources.filter(
      (resource) => getProductAssetHealthStatus(resource) === "Needs preview",
    ).length,
    needsThumbnail: filteredResources.filter(
      (resource) => getProductAssetHealthStatus(resource) === "Needs thumbnail",
    ).length,
    needsRights: filteredResources.filter(
      (resource) =>
        getProductAssetHealthStatus(resource) === "Needs rights confirmation",
    ).length,
    topPerformersReadyForRefresh: filteredResources.filter((resource) => {
      const insight = rankingInsights.find((entry) => entry.id === resource.id);
      const performanceSummary = getListingPerformanceSummary(resource, insight);

      return performanceSummary.tone === "emerald" && (insight?.freshnessScore ?? 0) <= 4;
    }).length,
    underperforming: filteredResources.filter((resource) => {
      const insight = rankingInsights.find((entry) => entry.id === resource.id);
      const performanceSummary = getListingPerformanceSummary(resource, insight);

      return performanceSummary.tone === "rose";
    }).length,
  };
  const sellerFilterSummary = getSellerFilterSummary(
    listingFilter,
    filteredResources.length,
    resources.length,
  );
  const sellerFilterEmptyState = getSellerFilterEmptyState(
    listingFilter,
    resources.length > 0,
  );
  const sellerFilterStatCards = getSellerFilterStatCards(
    listingFilter,
    filteredResources,
    filteredListingSummary,
    rankingInsights,
  );
  const sellerFilterBatchGuidance = getSellerFilterBatchGuidance(
    listingFilter,
    filteredResources,
    filteredListingSummary,
  );
  const hasCompletedSales = (salesSummary?.completedSales ?? 0) > 0;
  const hasLiveListings = (salesSummary?.liveListings ?? 0) > 0;
  const hasBuyerReadyListings = (salesSummary?.buyerReadyListings ?? 0) > 0;
  const hasAnyListings = resources.length > 0;
  const listingLimitReached = listingUsage?.reached ?? false;
  const currentPlanKey = normalizePlanKey(profile?.sellerPlanKey);
  const lowAiCredits =
    Boolean(subscription) &&
    !aiSettings?.aiKillSwitchEnabled &&
    (subscription?.availableCredits ?? 0) <= aiActionCosts.standardsScan;
  const starterUpgradeThresholdReached =
    currentPlanKey === "starter" &&
    (salesSummary?.grossSalesCents ?? 0) >= starterUpgradePromptSalesThresholdCents;
  const starterExtraKeepOnBasicCents = Math.round(
    (salesSummary?.grossSalesCents ?? 0) *
      ((planConfig.basic.sellerSharePercent - planConfig.starter.sellerSharePercent) / 100),
  );
  const sellerSummaryCards = [
    {
      key: "earnings",
      label: "Estimated seller earnings",
      value: formatCurrency(salesSummary?.sellerEarningsCents ?? 0),
      detail: hasCompletedSales
        ? `${salesSummary?.completedSales} completed sale${salesSummary?.completedSales === 1 ? "" : "s"} so far`
        : hasBuyerReadyListings
          ? "Buyer-ready listings are live. Your first earnings will show here after the first sale."
          : hasLiveListings
            ? "Listings are live, but they still need buyer-ready details before earnings can start."
            : hasAnyListings
              ? "Finish the key buyer-ready checks so your first listing can start earning."
              : "Create your first listing so this dashboard can start tracking real earnings.",
      actionLabel: hasCompletedSales
        ? "View all listings"
        : hasAnyListings
          ? "Fix what needs attention"
          : "Create your first listing",
      href: hasCompletedSales
        ? "/sell/dashboard"
        : hasAnyListings
          ? buildSellerDashboardFilterHref("needs-action")
          : "/sell/products/new",
    },
    {
      key: "sales",
      label: "Gross sales",
      value: formatCurrency(salesSummary?.grossSalesCents ?? 0),
      detail: salesSummary?.lastSaleAt
        ? `Last sale ${formatTimelineTime(salesSummary.lastSaleAt)}`
        : hasBuyerReadyListings
          ? "Your first buyer-ready listing is in place."
          : hasLiveListings
            ? "You are close. Clear the last buyer-ready blockers."
            : "No completed sales yet.",
      actionLabel:
        hasCompletedSales
          ? "Review strong listings"
          : hasAnyListings
            ? "Get listing buyer-ready"
            : "Create your first listing",
      href:
        hasCompletedSales
          ? buildSellerDashboardFilterHref("top-performers")
          : hasAnyListings
            ? buildSellerDashboardFilterHref("needs-action")
            : "/sell/products/new",
    },
    {
      key: "live",
      label: "Listings live",
      value: String(salesSummary?.liveListings ?? 0),
      detail: `${salesSummary?.buyerReadyListings ?? 0} ready for buyers right now`,
      actionLabel:
        (salesSummary?.liveListings ?? 0) > 0 ? "Review strong listings" : "Fix what needs attention",
      href:
        (salesSummary?.liveListings ?? 0) > 0
          ? buildSellerDashboardFilterHref("top-performers")
          : buildSellerDashboardFilterHref("needs-action"),
    },
    {
      key: "payouts",
      label: "Payout setup",
      value:
        seller?.status === "connected"
          ? "Connected"
          : seller?.status === "setup_incomplete"
            ? "Setup incomplete"
            : "Needs setup",
      detail: seller
        ? seller.status === "connected"
          ? `${seller.displayName || profile?.displayName || seller.email || "Your seller account"} can move buyer-ready listings into checkout.`
          : `${seller.displayName || profile?.displayName || seller.email || "Your seller account"} still needs Stripe onboarding completed before payouts can go live.`
        : "Finish seller onboarding before published products can sell.",
      actionLabel: seller?.status === "connected" ? "Open onboarding" : "Finish setup",
      href: "/sell/onboarding",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="rounded-[2rem] border border-ink/5 bg-white p-8 shadow-soft-xl">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand">
          Seller Dashboard
        </p>
        {!isProfileLoading && !isDashboardDataLoading ? (
          <p className="sr-only" data-testid="seller-dashboard-ready">
            Dashboard ready
          </p>
        ) : null}
        <h1 className="mt-4 font-[family-name:var(--font-display)] text-5xl text-ink">
          Your listings, payouts, and launch progress live here.
        </h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-ink-soft">
          Start with setup, earnings, and the next listing move that gets you closer to buyers.
        </p>
        <div className="mt-6 rounded-[1.5rem] bg-surface-subtle px-4 py-4 text-sm leading-6 text-ink-soft">
          <p className="font-semibold text-ink">Start here</p>
          <p className="mt-1">
            Finish payouts first if needed, then use the summary cards below to see earnings, live listings, and the clearest next seller move.
          </p>
        </div>
        {(listingLimitReached || lowAiCredits || !premiumAccess?.revenueInsights.unlocked) ? (
          <div className="mt-5 rounded-[1.5rem] border border-brand/10 bg-brand-soft/35 px-5 py-4 text-sm leading-6 text-ink">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand">
                  Upgrade to grow faster
                </p>
                <p className="mt-2 font-semibold text-ink">
                  {listingLimitReached
                    ? getListingLimitUpgradeMessage(currentPlanKey)
                    : lowAiCredits
                      ? getAiUpgradeMessage()
                      : "Unlock more listings and better tools."}
                </p>
                <p className="mt-2 text-ink-soft">
                  {listingLimitReached
                    ? `You are using ${listingUsage?.current ?? 0} of ${listingUsage?.limit ?? planConfig.starter.activeListingLimit} included listings on ${formatPlanLabel(currentPlanKey)}.`
                    : lowAiCredits
                      ? `Only ${subscription?.availableCredits ?? 0} AI credits are left, which is tight for the next standards scan or optimization pass.`
                      : "Basic unlocks fuller listing optimization, revenue insight visibility, and more room to keep publishing every month."}
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  className="inline-flex items-center justify-center rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
                  href={buildSellerPlanCheckoutHref({
                    planKey: "basic",
                    returnTo: "/sell/dashboard?focus=plan",
                  })}
                  onClick={() =>
                    void trackMonetizationEvent({
                      eventType: "upgrade_click",
                      source: "seller_dashboard",
                      planKey: currentPlanKey,
                      metadata: {
                        reason: listingLimitReached
                          ? "listing_limit"
                          : lowAiCredits
                            ? "ai_credits"
                            : "premium_insights",
                        targetPlan: "basic",
                      },
                    })
                  }
                >
                  Upgrade Plan
                </Link>
                <Link
                  className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:border-slate-300"
                  href="/sell/products/new"
                >
                  Create product
                </Link>
              </div>
            </div>
          </div>
        ) : null}
        {starterUpgradeThresholdReached ? (
          <div className="mt-5 rounded-[1.25rem] border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm leading-6 text-emerald-950">
            <p className="font-semibold">You have already proven this can sell.</p>
            <p className="mt-1">
              Starter sellers keep 50% of each sale. At {formatCurrency(salesSummary?.grossSalesCents ?? 0)} in sales, you would have kept about {formatCurrency(starterExtraKeepOnBasicCents)} more on Basic, and Basic also adds 100 AI credits each billing cycle.
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <Link
                className="inline-flex items-center justify-center rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
                href={buildSellerPlanCheckoutHref({
                  planKey: "basic",
                  returnTo: "/sell/dashboard?focus=plan",
                })}
                onClick={() =>
                  void trackMonetizationEvent({
                    eventType: "upgrade_click",
                    source: "seller_dashboard",
                    planKey: currentPlanKey,
                    metadata: {
                      reason: "starter_sales_threshold",
                      grossSalesCents: salesSummary?.grossSalesCents ?? 0,
                      extraKeepOnBasicCents: starterExtraKeepOnBasicCents,
                      targetPlan: "basic",
                    },
                  })
                }
              >
                Upgrade to Basic
              </Link>
              <Link
                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:border-slate-300"
                href="/sell/dashboard?focus=plan"
              >
                Compare seller plans
              </Link>
            </div>
          </div>
        ) : null}
        {setupState === "payouts-connected" && seller ? (
          <div className="mt-5 rounded-[1.25rem] border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm leading-6 text-emerald-900">
            <p className="font-semibold">Payout setup is connected.</p>
            <p className="mt-1">
              {seller.displayName || profile?.displayName || "Your seller account"} can now move
              published listings toward real buyer checkout. The best next step is creating a
              listing or finishing one that is still blocked.
            </p>
          </div>
        ) : null}
        {planBillingState === "not-ready" ? (
          <div className="mt-5 rounded-[1.25rem] border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-900">
            <p className="font-semibold">Plan billing is not wired yet.</p>
            <p className="mt-1">
              Stripe is not fully set up for the {formatPlanLabel(targetPlan)} seller subscription yet. The upgrade button is ready, but the matching Stripe price ID still needs to be added before sellers can check out.
            </p>
          </div>
        ) : null}
        {planBillingState === "manage-not-ready" ? (
          <div className="mt-5 rounded-[1.25rem] border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-900">
            <p className="font-semibold">Billing management is not wired yet.</p>
            <p className="mt-1">
              Stripe billing management is not fully set up yet, so plan changes and cancellations still need final Stripe portal setup before sellers can manage them directly.
            </p>
          </div>
        ) : null}
        {planBillingState === "no-paid-plan" ? (
          <div className="mt-5 rounded-[1.25rem] border border-sky-200 bg-sky-50 px-4 py-4 text-sm leading-6 text-sky-950">
            <p className="font-semibold">No paid plan is active yet.</p>
            <p className="mt-1">
              This seller does not have an active paid Stripe subscription yet. Start with Basic or Pro when you want stronger payouts and more AI support.
            </p>
          </div>
        ) : null}
        {planBillingState === "cancelled" ? (
          <div className="mt-5 rounded-[1.25rem] border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-900">
            <p className="font-semibold">Plan upgrade cancelled.</p>
            <p className="mt-1">
              Nothing was charged. You can keep working here and reopen the {formatPlanLabel(targetPlan)} upgrade whenever you are ready.
            </p>
          </div>
        ) : null}
        {planBillingState === "success" ? (
          <div className="mt-5 rounded-[1.25rem] border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm leading-6 text-emerald-900">
            <p className="font-semibold">Plan checkout completed.</p>
            <p className="mt-1">
              {normalizePlanKey(profile?.sellerPlanKey) === targetPlan
                ? `${formatPlanLabel(targetPlan)} is now active in the seller workspace. Your payout split and AI allowance should now match the upgraded plan.`
                : `Stripe finished the checkout flow for ${formatPlanLabel(targetPlan)}. If the dashboard still shows the older plan for a moment, refresh after the webhook finishes syncing the billing update back into LessonForge.`}
            </p>
          </div>
        ) : null}
        {listingUpdateState === "saved" ? (
          <div className="mt-5 rounded-[1.25rem] border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm leading-6 text-emerald-900">
            <p className="font-semibold">Draft saved.</p>
            <p className="mt-1">
              {listingUpdateTitle || "Your listing"} is back in the seller dashboard. The next
              step is clearing the remaining preview, thumbnail, or rights blockers.
            </p>
          </div>
        ) : null}
        {listingUpdateState === "resubmitted" ? (
          <div className="mt-5 rounded-[1.25rem] border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm leading-6 text-emerald-900">
            <p className="font-semibold">Listing resubmitted.</p>
            <p className="mt-1">
              {listingUpdateTitle || "Your listing"} is back in review. Keep watching this
              dashboard for moderation updates while you improve the rest of the catalog.
            </p>
          </div>
        ) : null}
        {!hasCompletedSales ? (
          <div className="mt-5 rounded-[1.25rem] border border-sky-200 bg-sky-50 px-4 py-4 text-sm leading-6 text-sky-950">
            <p className="font-semibold">First sale path</p>
            <p className="mt-1">
              {!hasAnyListings
                ? "Create your first listing so this dashboard has something real to move toward buyers."
                : !hasBuyerReadyListings
                  ? "You already have listing work in progress. The next win is getting one listing fully buyer-ready."
                    : "You already have a buyer-ready listing live. The next step is watching for the first sale and first earnings update."}
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <Link
                className="inline-flex items-center justify-center rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
                href={
                  !hasAnyListings
                    ? "/sell/products/new"
                    : !hasBuyerReadyListings
                      ? buildSellerDashboardFilterHref("needs-action")
                      : buildSellerDashboardFilterHref("top-performers")
                }
              >
                {!hasAnyListings
                  ? "Create your first listing"
                  : !hasBuyerReadyListings
                    ? "Finish buyer-ready checks"
                    : "Watch live listings"}
              </Link>
              {!seller ? (
                <Link
                  className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:border-slate-300"
                  href="/sell/onboarding"
                >
                  Finish payout setup
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}
        {aiSettings?.aiKillSwitchEnabled ? (
          <div className="mt-5 rounded-[1.25rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
            AI is temporarily paused by admin controls. You can still manage listings and update product details, but new AI-assisted actions are disabled for now.
          </div>
        ) : null}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            className="inline-flex items-center justify-center rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
            data-testid="seller-dashboard-onboarding"
            href="/sell/onboarding"
          >
            Seller onboarding
          </Link>
          <Link
            className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:border-slate-300"
            data-testid="seller-dashboard-create-product"
            href="/sell/products/new"
          >
            {aiSettings?.aiKillSwitchEnabled ? "Create product without AI" : "Create product"}
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {sellerSummaryCards.map((card) => (
          <Link
            key={card.key}
            className="rounded-[1.5rem] border border-ink/5 bg-white p-5 shadow-soft-xl transition hover:-translate-y-0.5 hover:border-brand/20 hover:shadow-soft-2xl"
            href={card.href}
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-soft text-brand">
              {card.key === "earnings" ? (
                <Sparkles className="h-5 w-5" />
              ) : (
                <UploadCloud className="h-5 w-5" />
              )}
            </div>
            <h2 className="mt-5 text-sm font-semibold uppercase tracking-[0.14em] text-ink-muted">
              {card.label}
            </h2>
            <p className="mt-3 text-3xl font-semibold text-ink">{card.value}</p>
            <p className="mt-2 text-sm leading-7 text-ink-soft">{card.detail}</p>
            <p className="mt-4 text-sm font-semibold text-brand">{card.actionLabel}</p>
          </Link>
        ))}
      </div>

      {hasCompletedSales ? (
        <article className="rounded-[1.5rem] border border-ink/5 bg-white p-5 shadow-soft-xl">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-ink">Recent sales</h2>
              <p className="mt-1 text-sm leading-6 text-ink-soft">
                Your latest completed purchases and seller earnings.
              </p>
            </div>
            <p className="text-sm font-semibold text-ink-soft">
              Seller earnings: {formatCurrency(salesSummary?.sellerEarningsCents ?? 0)}
            </p>
          </div>
          <div className="mt-4 space-y-3">
            {salesSummary?.recentSales.length ? (
              salesSummary.recentSales.map((sale) => (
                <div
                  key={sale.id}
                  className="rounded-[1rem] border border-ink/5 bg-surface-subtle px-4 py-4"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="font-semibold text-ink">{sale.productTitle}</p>
                      <p className="mt-1 text-sm leading-6 text-ink-soft">
                        {sale.buyerName} · {sale.versionLabel} · {formatTimelineTime(sale.purchasedAt)}
                      </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:w-[20rem]">
                      <div className="rounded-[0.9rem] bg-white px-4 py-3 text-sm text-ink-soft">
                        Order total
                        <p className="mt-1 text-base font-semibold text-ink">
                          {formatCurrency(sale.amountCents)}
                        </p>
                      </div>
                      <div className="rounded-[0.9rem] bg-white px-4 py-3 text-sm text-ink-soft">
                        You earned
                        <p className="mt-1 text-base font-semibold text-ink">
                          {formatCurrency(sale.sellerShareCents)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[1rem] border border-ink/5 bg-surface-subtle px-4 py-4 text-sm leading-6 text-ink-soft">
                Recent completed purchases will appear here once a buyer checks out.
              </div>
            )}
          </div>
        </article>
      ) : null}

      <article className="rounded-[1.5rem] border border-ink/5 bg-white p-5 shadow-soft-xl">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-ink">Focus now</h2>
            <p className="mt-2 text-sm leading-6 text-ink-soft">
              Check earnings, confirm payout setup, then work the listings that need attention.
            </p>
          </div>
          <div className="rounded-[1rem] bg-surface-subtle px-4 py-3 text-sm leading-6 text-ink-soft">
            Buyer-ready now
            <p className="mt-1 text-2xl font-semibold text-ink">
              {salesSummary?.buyerReadyListings ?? resources.filter((resource) => resource.isPurchasable).length}
            </p>
          </div>
        </div>

        <details className="mt-4 rounded-[1rem] bg-surface-subtle px-4 py-4 text-sm leading-6 text-ink-soft">
          <summary className="cursor-pointer font-semibold text-ink">Open quick seller path</summary>
          <div className="mt-3 space-y-3">
            <div className="rounded-[1rem] bg-white px-4 py-4">
              <p className="font-semibold text-ink">1. Confirm payouts</p>
              <p className="mt-1">
                {seller
                  ? "Payouts are connected, so you can focus on creating or fixing listings now."
                  : "Complete seller onboarding first if you want products to become buyable."}
              </p>
            </div>
            <div className="rounded-[1rem] bg-white px-4 py-4">
              <p className="font-semibold text-ink">2. Create or improve a listing</p>
              <p className="mt-1">
                Use `Create product` for new work, or jump into the listing cards below to fix missing previews and thumbnails.
              </p>
            </div>
            <div className="rounded-[1rem] bg-white px-4 py-4">
              <p className="font-semibold text-ink">3. Watch what needs attention</p>
              <p className="mt-1">
                Use the filtered listing modes to focus on blocked items, stronger listings, or listings that need seller action.
              </p>
            </div>
            {rankingInsights.some((entry) => entry.recommendations.length) ? (
              rankingInsights
                .filter((entry) => entry.recommendations.length)
                .slice(0, 3)
                .map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded-[1rem] bg-white px-4 py-4 text-sm text-ink-soft"
                  >
                    <p className="font-semibold text-ink">{entry.title || "Listing insight"}</p>
                    <div className="mt-2 space-y-2">
                      {entry.recommendations.map((recommendation) => (
                        <p key={recommendation}>{recommendation}</p>
                      ))}
                    </div>
                  </div>
                ))
            ) : (
              <p>
                No urgent marketplace coaching signals right now. Keep improving previews,
                metadata, and buyer clarity as new data comes in.
              </p>
            )}
          </div>
        </details>
      </article>

      <details className="group rounded-[1.5rem] border border-ink/5 bg-white p-5 shadow-soft-xl">
        <DisclosureSummary
          actionLabel="Open"
          body="Open this when you want to review AI balance, plan differences, or recent AI activity."
          compact
          meta={profile?.sellerPlanKey ? `${formatPlanLabel(profile.sellerPlanKey)} plan` : "Plan details"}
          title="AI and plan details"
        />
        <div className="mt-5 space-y-4">
          <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
            <article className="rounded-[1.5rem] border border-ink/5 bg-surface-subtle p-5 shadow-soft-xl">
          {subscription ? (
            <div className="mb-4">
              <div className="flex items-center justify-between gap-3 text-sm text-ink-soft">
                <span>{subscription.cycleLabel}</span>
                <span>
                  {Math.max(0, subscription.monthlyCredits - subscription.availableCredits)} / {subscription.monthlyCredits} credits used
                </span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-white">
                <div
                  className="h-2 rounded-full bg-brand transition-all"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round(
                        ((subscription.monthlyCredits - subscription.availableCredits) /
                          Math.max(subscription.monthlyCredits, 1)) *
                          100,
                      ),
                    )}%`,
                  }}
                />
              </div>
            </div>
          ) : null}
          <h2 className="text-xl font-semibold text-ink">AI balance</h2>
          <p className="mt-3 text-3xl font-semibold text-ink">
            {subscription ? subscription.availableCredits : "Not started"}
          </p>
          <p className="mt-2 text-sm leading-7 text-ink-soft">
            {subscription
              ? `${formatPlanLabel(subscription.planKey)} · ${planConfig[subscription.planKey].creditGrantLabel.toLowerCase()} · no rollover`
              : "The first server-side AI action will create a local subscription balance for this seller."}
          </p>
          <p className="mt-2 text-sm leading-7 text-ink-soft">
            {listingUsage
              ? `${listingUsage.current}/${listingUsage.limit} active listings used on this plan.`
              : `This plan includes up to ${planConfig[normalizePlanKey(profile?.sellerPlanKey)].activeListingLimit} active listings.`}
          </p>
          <p className="mt-2 text-sm leading-7 text-ink-soft">
            {aiSettings?.aiKillSwitchEnabled
              ? "Admin has paused AI, so credits are preserved until AI is re-enabled."
              : subscription && subscription.availableCredits <= aiActionCosts.standardsScan
                ? "Your balance is low for another standards scan. Consider switching plans before your next AI-assisted listing."
                : "AI actions are available from the current plan and credit balance."}
          </p>
          <p className="mt-2 text-xs uppercase tracking-[0.16em] text-ink-muted">
            Selected seller plan: {profile?.sellerPlanKey ? formatPlanLabel(profile.sellerPlanKey) : isProfileLoading ? "Loading" : "Starter"}
          </p>
          <div className="mt-4 grid gap-2">
            {(Object.keys(planConfig) as PlanKey[]).map((planKey) => (
              <button
                key={planKey}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  profile?.sellerPlanKey === planKey
                    ? "bg-brand text-white"
                    : "border border-slate-200 bg-white text-ink hover:border-slate-300"
                }`}
                disabled={isUpdatingPlan || isProfileLoading || !profile}
                onClick={() => void handlePlanChange(planKey)}
                type="button"
              >
                {isProfileLoading || !profile
                  ? "Loading seller profile"
                  : isUpdatingPlan && normalizePlanKey(profile?.sellerPlanKey) !== planKey
                    ? "Opening billing"
                  : `${formatPlanLabel(planKey)} · ${planConfig[planKey].availableCredits} credits`}
              </button>
            ))}
          </div>
          {planMessage ? (
            <p className="mt-4 text-sm leading-6 text-ink-soft">{planMessage}</p>
          ) : null}
          {profile?.sellerPlanKey && normalizePlanKey(profile.sellerPlanKey) !== "starter" ? (
            <Link
              className="mt-4 inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:border-slate-300"
              href={buildSellerPlanManageHref({
                returnTo: "/sell/dashboard?focus=plan",
              })}
            >
              Manage paid plan
            </Link>
          ) : null}
          {listingLimitReached ? (
            <div className="mt-4 rounded-[1rem] border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-950">
              <p className="font-semibold">Listing cap reached</p>
              <p className="mt-1">{getListingLimitUpgradeMessage(normalizePlanKey(profile?.sellerPlanKey))}</p>
              <Link
                className="mt-3 inline-flex items-center justify-center rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
                href={buildSellerPlanCheckoutHref({
                  planKey: "basic",
                  returnTo: "/sell/dashboard?focus=plan",
                })}
                onClick={() =>
                  void trackMonetizationEvent({
                    eventType: "upgrade_click",
                    source: "seller_dashboard",
                      planKey: currentPlanKey,
                    metadata: {
                      reason: "listing_limit",
                      targetPlan: "basic",
                    },
                  })
                }
              >
                Upgrade to Basic
              </Link>
            </div>
          ) : null}
          <div className="mt-5 rounded-[1rem] border border-ink/5 bg-surface-subtle p-4">
            <p className="text-sm font-semibold text-ink">What each plan supports</p>
            <div className="mt-3 space-y-3">
              {(Object.keys(planConfig) as PlanKey[]).map((planKey) => {
                const plan = planConfig[planKey];
                const current = profile?.sellerPlanKey === planKey;

                return (
                  <div
                    key={planKey}
                    className={`rounded-[1rem] border px-4 py-3 ${
                      current ? "border-brand bg-white" : "border-transparent bg-white/70"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <p className="font-semibold text-ink">{plan.label}</p>
                      <p className="text-sm text-ink-soft">
                        {plan.creditGrantLabel}
                      </p>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-ink-soft">
                      {planKey === "starter"
                        ? "Best for testing the platform with a small one-time AI allowance and a 50/50 revenue split."
                        : planKey === "basic"
                          ? "Good for active sellers who want stronger payout economics and monthly AI credits."
                          : "Built for higher-volume sellers who want the strongest payout share and the largest monthly AI allowance."}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-ink-soft">
                      {plan.activeListingLimit} active listing{plan.activeListingLimit === 1 ? "" : "s"} included.
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="mt-5 rounded-[1rem] border border-ink/5 bg-surface-subtle p-4">
            <p className="text-sm font-semibold text-ink">AI action costs</p>
            <div className="mt-3 space-y-2">
              {(Object.entries(aiActionCosts) as Array<
                [keyof typeof aiActionCosts, number]
              >).map(([action, cost]) => (
                <div
                  key={action}
                  className="flex items-center justify-between rounded-[0.9rem] bg-white px-3 py-2 text-sm"
                >
                  <span className="text-ink-soft">{actionLabels[action]}</span>
                  <span className="font-semibold text-ink">{cost} credits</span>
                </div>
              ))}
            </div>
          </div>
            </article>

            <article className="rounded-[1.5rem] border border-ink/5 bg-surface-subtle p-5 shadow-soft-xl">
          <h2 className="text-xl font-semibold text-ink">Recent AI usage</h2>
          <div className="mt-4 space-y-3">
            {usageLedger.length ? (
              usageLedger.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-[1rem] bg-surface-subtle px-4 py-3 text-sm text-ink-soft"
                >
                  {entry.action} · {entry.creditsUsed} credits · {entry.status}
                </div>
              ))
            ) : (
              <p className="text-sm leading-7 text-ink-soft">
                No server-side AI usage recorded yet.
              </p>
            )}
          </div>
            </article>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <article className="rounded-[1.5rem] border border-ink/5 bg-surface-subtle p-5 shadow-soft-xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-ink">Full listing optimization</h2>
                  <p className="mt-2 text-sm leading-7 text-ink-soft">
                    Title rewrite, description rewrite, and keyword suggestions in one stronger paid workflow.
                  </p>
                </div>
                {!premiumAccess?.fullListingOptimization.unlocked ? (
                  <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">
                    <Lock className="h-3.5 w-3.5" />
                    Basic and Pro
                  </span>
                ) : (
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
                    Included
                  </span>
                )}
              </div>
              <p className={`mt-4 rounded-[1rem] bg-white px-4 py-4 text-sm leading-6 text-ink-soft ${premiumAccess?.fullListingOptimization.unlocked ? "" : "blur-[2px]"}`}>
                Sharper buyer-facing copy, better keyword targeting, and a stronger first impression before shoppers ever open the listing.
              </p>
              {!premiumAccess?.fullListingOptimization.unlocked ? (
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <Link
                    className="inline-flex items-center justify-center rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
                    href={buildSellerPlanCheckoutHref({
                      planKey: "basic",
                      returnTo: "/sell/dashboard?focus=plan",
                    })}
                    onClick={() =>
                      void trackMonetizationEvent({
                        eventType: "upgrade_click",
                        source: "seller_dashboard",
                      planKey: currentPlanKey,
                        metadata: {
                          reason: "full_listing_optimization",
                          targetPlan: "basic",
                        },
                      })
                    }
                  >
                    Upgrade to Basic
                  </Link>
                  <button
                    className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:border-slate-300"
                    onClick={() =>
                      void (async () => {
                        await trackMonetizationEvent({
                          eventType: "locked_feature_clicked",
                          source: "seller_dashboard",
                          planKey: normalizePlanKey(profile?.sellerPlanKey),
                          metadata: {
                            feature: "full_listing_optimization",
                          },
                        });
                      })()
                    }
                    type="button"
                  >
                    {getLockedFeatureMessage()}
                  </button>
                </div>
              ) : null}
            </article>

            <article className="rounded-[1.5rem] border border-ink/5 bg-surface-subtle p-5 shadow-soft-xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-ink">Performance insights</h2>
                  <p className="mt-2 text-sm leading-7 text-ink-soft">
                    Better optimization can increase visibility and sales.
                  </p>
                </div>
                {!premiumAccess?.revenueInsights.unlocked ? (
                  <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">
                    <Lock className="h-3.5 w-3.5" />
                    Locked on Starter
                  </span>
                ) : null}
              </div>
              <div className="mt-4 rounded-[1rem] bg-white px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-soft">
                  Estimated monthly revenue
                </p>
                <p className={`mt-2 text-3xl font-semibold text-ink ${premiumAccess?.revenueInsights.unlocked ? "" : "blur-[4px]"}`}>
                  {formatCurrency(
                    Math.round(
                      ((salesSummary?.buyerReadyListings ?? 0) || (hasAnyListings ? 1 : 0)) *
                        Math.max(1, salesSummary?.sellerEarningsCents ?? 1200),
                    ),
                  )}
                </p>
                <p className="mt-2 text-sm leading-6 text-ink-soft">
                  {premiumAccess?.revenueInsights.unlocked
                    ? "Use this as a simple benchmark while you improve listing quality and keep publishing consistently."
                    : "Upgrade to see performance insights and improve results."}
                </p>
              </div>
              {!premiumAccess?.revenueInsights.unlocked ? (
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <Link
                    className="inline-flex items-center justify-center rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
                    href={buildSellerPlanCheckoutHref({
                      planKey: "basic",
                      returnTo: "/sell/dashboard?focus=plan",
                    })}
                    onClick={() =>
                      void trackMonetizationEvent({
                        eventType: "upgrade_click",
                        source: "seller_dashboard",
                        planKey: normalizePlanKey(profile?.sellerPlanKey),
                        metadata: {
                          reason: "revenue_insights",
                          targetPlan: "basic",
                        },
                      })
                    }
                  >
                    Upgrade Plan
                  </Link>
                  <button
                    className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:border-slate-300"
                    onClick={() =>
                      void (async () => {
                        await trackMonetizationEvent({
                          eventType: "locked_feature_clicked",
                          source: "seller_dashboard",
                          planKey: normalizePlanKey(profile?.sellerPlanKey),
                          metadata: {
                            feature: "revenue_insights",
                          },
                        });
                      })()
                    }
                    type="button"
                  >
                    Unlock more listings and better tools
                  </button>
                </div>
              ) : null}
            </article>
          </div>

          <article className="rounded-[1.5rem] border border-ink/5 bg-surface-subtle p-5 shadow-soft-xl">
        <h2 className="text-xl font-semibold text-ink">AI status timeline</h2>
        <div className="mt-4 space-y-3">
          {aiTimeline.length ? (
            aiTimeline.map((item) => (
              <div
                key={item.id}
                className="rounded-[1rem] border border-ink/5 bg-surface-subtle px-4 py-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-ink">{item.title}</p>
                    <p className="mt-1 text-sm leading-6 text-ink-soft">{item.detail}</p>
                  </div>
                  <p className="text-xs uppercase tracking-[0.14em] text-ink-muted">
                    {item.timestamp}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm leading-7 text-ink-soft">
              AI status events will appear here once this seller uses AI or changes plans.
            </p>
          )}
        </div>
          </article>
        </div>
      </details>

      <details className="rounded-[1.5rem] border border-ink/5 bg-white p-5 shadow-soft-xl">
        <summary className="cursor-pointer text-xl font-semibold text-ink">
          Open seller health summary
        </summary>
        <div className="mt-4 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div>
            <h3 className="text-base font-semibold text-ink">Asset health</h3>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-[1rem] bg-surface-subtle px-4 py-4 text-sm text-ink-soft">
                Ready to publish
                <p className="mt-1 text-2xl font-semibold text-ink">{assetHealthSummary.ready}</p>
              </div>
              <div className="rounded-[1rem] bg-surface-subtle px-4 py-4 text-sm text-ink-soft">
                Missing preview
                <p className="mt-1 text-2xl font-semibold text-ink">{assetHealthSummary.needsPreview}</p>
              </div>
              <div className="rounded-[1rem] bg-surface-subtle px-4 py-4 text-sm text-ink-soft">
                Missing thumbnail
                <p className="mt-1 text-2xl font-semibold text-ink">{assetHealthSummary.needsThumbnail}</p>
              </div>
              <div className="rounded-[1rem] bg-surface-subtle px-4 py-4 text-sm text-ink-soft">
                Need rights check
                <p className="mt-1 text-2xl font-semibold text-ink">{assetHealthSummary.needsRights}</p>
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-base font-semibold text-ink">Attention first</h3>
            <div className="mt-4 space-y-3">
              {attentionFirstListings.length ? (
                attentionFirstListings.map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded-[1rem] border border-ink/5 bg-surface-subtle px-4 py-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-ink">{entry.title}</p>
                        <p className="mt-1 text-sm leading-6 text-ink-soft">
                          {entry.summary.detail}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${performanceBadgeClasses(entry.summary.tone)}`}
                      >
                        {entry.summary.label}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm leading-7 text-ink-soft">
                  No listing needs urgent seller attention right now. Focus on polishing previews,
                  titles, and trust details as new marketplace data comes in.
                </p>
              )}
            </div>
          </div>
        </div>
      </details>

      <div className="rounded-[2rem] border border-ink/5 bg-white p-8 shadow-soft-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-ink">Your Listings</h2>
            <p className="mt-2 text-sm leading-6 text-ink-soft">
              {filteredResources.length} listing{filteredResources.length === 1 ? "" : "s"} shown
              {listingFilter !== "all" ? " in this filtered view" : ""}.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {[
              { label: "All listings", value: "all" },
              { label: "Needs action", value: "needs-action" },
              { label: "Top performers", value: "top-performers" },
              { label: "Asset blocked", value: "asset-blocked" },
            ].map((option) => (
              <Link
                key={option.value}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  listingFilter === option.value
                    ? "bg-brand text-white"
                    : secondaryActionSurfaceClassName("px-4 py-2")
                }`}
                data-testid={`seller-dashboard-filter-${option.value}`}
                href={buildSellerDashboardFilterHref(option.value as SellerListingFilter)}
              >
                {option.label}
              </Link>
            ))}
            {listingFilter !== "all" ? (
              <Link
                className={secondaryActionLinkClassName("px-4 py-2")}
                data-testid="seller-dashboard-clear-filter"
                href="/sell/dashboard"
              >
                Clear filter
              </Link>
            ) : null}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span
            className="rounded-full border border-brand/15 bg-brand-soft/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-brand"
            data-testid="seller-dashboard-active-filter"
          >
            {listingFilter === "needs-action"
              ? "Needs action mode"
              : listingFilter === "top-performers"
                ? "Strong listings mode"
                : listingFilter === "asset-blocked"
                  ? "Asset blocked mode"
                  : "All listings"}
          </span>
          {listingFilter !== "all" ? (
            <p className="text-sm leading-6 text-ink-soft">
              This view stays active on reload and shared links.
            </p>
          ) : null}
        </div>
        <div
          className="mt-4 rounded-[1rem] border border-ink/5 bg-surface-subtle px-4 py-4"
          data-testid="seller-dashboard-filter-summary"
        >
          <p className="text-sm font-semibold text-ink">{sellerFilterSummary.title}</p>
          <p className="mt-1 text-sm leading-6 text-ink-soft">{sellerFilterSummary.body}</p>
        </div>
        <details
          className="mt-4 rounded-[1rem] border border-ink/5 bg-surface-subtle px-4 py-4 text-sm leading-6 text-ink-soft"
          data-testid="seller-dashboard-batch-guidance"
        >
          <summary className="cursor-pointer font-semibold text-ink">
            Open mode details
          </summary>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {sellerFilterStatCards.map((card) => (
              <div
                key={card.key}
                className="rounded-[1rem] bg-white px-4 py-4 text-sm text-ink-soft"
                data-testid={`seller-dashboard-mode-stat-${card.key}`}
              >
                {card.label}
                <p className="mt-1 text-2xl font-semibold text-ink">{card.value}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-[1rem] bg-white px-4 py-4">
            <p className="font-semibold text-ink">What to work on in this mode</p>
            <div className="mt-2 space-y-1">
              {sellerFilterBatchGuidance.map((item) => (
                <p key={item}>{item}</p>
              ))}
            </div>
          </div>
        </details>
        <div className="mt-6 grid gap-4">
          {filteredResources.length ? (
            filteredResources.map((resource) => {
              const insight = rankingInsights.find((entry) => entry.id === resource.id);
              const performanceSummary = getListingPerformanceSummary(resource, insight);
              const moderationGuidance = getSellerModerationGuidance(resource);
              const remediationFocus = getSellerRemediationFocus(resource);
              const filterReason = getSellerListingFilterReason(listingFilter, resource, insight);
              const publishBlockers = getProductPublishBlockers(resource);
              const isBuyerReady = Boolean(
                seller &&
                  resource.isPurchasable &&
                  resource.productStatus === "Published" &&
                  publishBlockers.length === 0,
              );
              const nextAction =
                resource.productStatus === "Flagged" || resource.productStatus === "Rejected"
                  ? "Fix the moderation blocker and resubmit this listing."
                  : publishBlockers.length > 0
                    ? `Clear this next blocker: ${publishBlockers[0]}`
                    : !seller
                      ? "Finish payout onboarding so published listings can move into checkout."
                      : resource.productStatus !== "Published"
                        ? "Publish this listing when you are ready for buyers to see it."
                        : "This listing is buyer-ready. Refresh the title, preview, or trust proof only if you want to improve performance.";
              const editHref = remediationFocus
                ? `/sell/products/${resource.id}/edit?focus=${remediationFocus}`
                : `/sell/products/${resource.id}/edit`;

              return (
                <article
                  key={resource.id}
                  className="rounded-[1.5rem] border border-ink/5 bg-surface-subtle p-5"
                  data-testid={`seller-dashboard-resource-${resource.id}`}
                >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-ink">{resource.title}</h3>
                    <p className="mt-2 text-sm text-ink-soft">
                      {resource.subject} · {resource.gradeBand} · {resource.format}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-brand">
                      {resource.productStatus || (resource.isPurchasable ? "Published" : "Draft")}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${performanceBadgeClasses(performanceSummary.tone)}`}
                    >
                      {performanceSummary.label}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${
                        isBuyerReady
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-ink-soft"
                      }`}
                    >
                      {isBuyerReady ? "Closest to live" : "Needs next step"}
                    </span>
                  </div>
                </div>
                <div className="mt-4 rounded-[1rem] border border-ink/5 bg-white px-4 py-3 text-sm leading-6 text-ink-soft">
                  <p className="font-semibold text-ink">What to do next</p>
                  <p className="mt-1">{nextAction}</p>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  {resource.productStatus === "Removed" ? (
                    <p
                      className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-ink-soft"
                      data-testid={`seller-dashboard-removed-note-${resource.id}`}
                    >
                      Removed listings can no longer be edited or resubmitted from the seller dashboard.
                    </p>
                  ) : (
                    <>
                      <a
                        className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:border-slate-300"
                        data-testid={`seller-dashboard-edit-${resource.id}`}
                        href={editHref}
                      >
                        Edit listing
                      </a>
                      {(resource.productStatus === "Flagged" ||
                        resource.productStatus === "Rejected") && (
                        <a
                          className="inline-flex items-center justify-center rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
                          data-testid={`seller-dashboard-resubmit-${resource.id}`}
                          href={editHref}
                        >
                          Fix and resubmit
                        </a>
                      )}
                    </>
                  )}
                </div>
                {filterReason ? (
                  <div
                    className="mt-4 rounded-[1rem] border border-brand/10 bg-brand-soft/40 px-4 py-3 text-sm leading-6 text-ink"
                    data-testid={`seller-dashboard-filter-reason-${resource.id}`}
                  >
                    <p className="font-semibold text-ink">{filterReason.label}</p>
                    <p className="mt-1">{filterReason.body}</p>
                  </div>
                ) : null}
                {insight ? (
                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-[1rem] bg-white px-4 py-3 text-sm text-ink-soft">
                      Marketplace rank
                      <p className="mt-1 text-lg font-semibold text-ink">#{insight.rank}</p>
                    </div>
                    <div className="rounded-[1rem] bg-white px-4 py-3 text-sm text-ink-soft">
                      Conversion
                      <p className="mt-1 text-lg font-semibold text-ink">{insight.conversionLabel}</p>
                    </div>
                    <div className="rounded-[1rem] bg-white px-4 py-3 text-sm text-ink-soft">
                      Reviews
                      <p className="mt-1 text-lg font-semibold text-ink">
                        {insight.reviewCount ? `${insight.averageRating} avg · ${insight.reviewCount}` : "No reviews"}
                      </p>
                    </div>
                    <div className="rounded-[1rem] bg-white px-4 py-3 text-sm text-ink-soft">
                      Trust signals
                      <p className="mt-1 text-lg font-semibold text-ink">{insight.issueCountLabel}</p>
                    </div>
                  </div>
                ) : null}
                <div className="mt-4 rounded-[1rem] border border-ink/5 bg-white px-4 py-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <div className="rounded-[1rem] bg-surface-subtle px-4 py-3 text-sm text-ink-soft">
                        Thumbnail
                        <p className="mt-1 text-lg font-semibold text-ink">
                          {resource.thumbnailIncluded ? "Ready" : "Missing"}
                        </p>
                      </div>
                      <div className="rounded-[1rem] bg-surface-subtle px-4 py-3 text-sm text-ink-soft">
                        Preview pages
                        <p className="mt-1 text-lg font-semibold text-ink">
                          {resource.previewIncluded ? "Ready" : "Missing"}
                        </p>
                      </div>
                      <div className="rounded-[1rem] bg-surface-subtle px-4 py-3 text-sm text-ink-soft">
                        Asset health
                        <p className="mt-1 text-lg font-semibold text-ink">
                          {publishBlockers.length ? "Needs fixes" : "In good shape"}
                        </p>
                      </div>
                    </div>
                    {resource.thumbnailUrl ? (
                      <div className="flex items-center gap-3 lg:w-[18rem] lg:justify-end">
                        <img
                          alt={`${resource.title} thumbnail`}
                          className="h-16 w-24 rounded-2xl border border-slate-200 object-cover"
                          src={resource.thumbnailUrl}
                        />
                        <p className="text-sm leading-6 text-ink-soft">
                          Current buyer-facing cover image.
                        </p>
                      </div>
                    ) : null}
                  </div>
                </div>
                <details className="mt-4 rounded-[1rem] border border-ink/5 bg-white px-4 py-3 text-sm leading-6 text-ink-soft">
                  <summary className="cursor-pointer font-semibold text-ink">
                    More listing detail
                  </summary>
                  <div className="mt-3 space-y-4">
                    <div>
                      <p className="font-semibold text-ink">Listing summary</p>
                      <p className="mt-1">{resource.summary}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-ink">Performance summary</p>
                      <p className="mt-1">{performanceSummary.detail}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-ink">Asset health</p>
                      <p className="mt-1">{getProductAssetHealthStatus(resource)}</p>
                      <p className="mt-2">Version {resource.assetVersionNumber ?? 1}</p>
                      {publishBlockers.length ? (
                        <div className="mt-2 space-y-1">
                          {publishBlockers.slice(0, 3).map((blocker) => (
                            <p key={blocker}>{blocker}</p>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-2">
                          This listing has the core preview, thumbnail, and rights checks in place.
                        </p>
                      )}
                    </div>
                    {insight?.recommendations.length ? (
                      <div className="rounded-[1rem] border border-brand/10 bg-brand-soft/40 px-4 py-3">
                        <p className="font-semibold text-ink">Seller guidance</p>
                        <div className="mt-1 space-y-1">
                          {insight.recommendations.map((recommendation) => (
                            <p key={recommendation}>{recommendation}</p>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </details>
                {resource.moderationFeedback ? (
                  <div className="mt-4 rounded-[1rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
                    <p className="font-semibold">
                      {resource.productStatus === "Flagged" || resource.productStatus === "Rejected"
                        ? "Action needed"
                        : "Moderation update"}
                    </p>
                    <p className="mt-1">{resource.moderationFeedback}</p>
                  </div>
                ) : null}
                {moderationGuidance ? (
                  <div
                    className="mt-4 rounded-[1rem] border border-amber-200 bg-amber-50/70 px-4 py-3 text-sm leading-6 text-amber-950"
                    data-testid={`seller-dashboard-guidance-${resource.id}`}
                  >
                    <p className="font-semibold">{moderationGuidance.headline}</p>
                    <p className="mt-1">{moderationGuidance.summary}</p>
                    <div className="mt-2 space-y-1">
                      {moderationGuidance.priorityActions.slice(0, 3).map((action) => (
                        <p key={action}>{action}</p>
                      ))}
                    </div>
                  </div>
                ) : null}
                <p className="mt-3 text-xs font-medium uppercase tracking-[0.16em] text-ink-muted">
                  {resource.createdPath || "Manual upload"}
                </p>
                </article>
              );
            })
          ) : (
          <div
              className="rounded-[1.5rem] border border-ink/5 bg-surface-subtle p-5 text-sm text-ink-soft"
              data-testid="seller-dashboard-empty-state"
            >
              <p className="font-semibold text-ink">{sellerFilterEmptyState.title}</p>
              <p className="mt-2 leading-6 text-ink-soft">{sellerFilterEmptyState.body}</p>
              {!hasAnyListings ? (
                <p className="mt-2 leading-6 text-ink-soft">
                  The fastest next move is one clean listing with a preview, thumbnail, and rights confirmation so this dashboard can start tracking real seller progress.
                </p>
              ) : null}
              <Link
                className="mt-4 inline-flex items-center justify-center rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
                data-testid="seller-dashboard-empty-state-action"
                href={sellerFilterEmptyState.actionHref}
              >
                {sellerFilterEmptyState.actionLabel}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
