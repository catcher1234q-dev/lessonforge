import "server-only";

import { listPrivateFeedback, listReports, listRefundRequests, listSellerProfiles, listOrders, listPersistedProducts } from "@/lib/lessonforge/data-access";
import { getIntegrationReadiness } from "@/lib/lessonforge/integration-readiness";
import { getPersistenceReadiness } from "@/lib/lessonforge/persistence-readiness";
import { getProductPublishBlockers } from "@/lib/lessonforge/product-validation";
import { getSupabaseServerAdminClient, hasSupabaseServerEnv } from "@/lib/supabase/server";
import { env } from "@/lib/config/env";
import type {
  OrderRecord,
  PrivateFeedbackRecord,
  ProductRecord,
  RefundRequestRecord,
  ReportRecord,
  SellerProfileDraft,
} from "@/types";

export type CheckStatus = "healthy" | "attention" | "down";

export type SiteHealthCheck = {
  key: string;
  label: string;
  status: CheckStatus;
  detail: string;
  httpStatus?: number;
};

export type OpsSignal = {
  title: string;
  detail: string;
  createdAt?: string;
  href?: string;
};

export type RecommendedAction = {
  title: string;
  detail: string;
  priority: "high" | "medium" | "low";
};

export type MonitoringStatus = {
  sentryConfigured: boolean;
  sentryDetail: string;
};

type SellerOnboardingSignalProfile = SellerProfileDraft & {
  paypalMerchantId?: string;
  paypalPayoutsEnabled?: boolean;
  paypalConsentGranted?: boolean;
  stripeAccountId?: string;
  stripeChargesEnabled?: boolean;
  stripePayoutsEnabled?: boolean;
};

function scoreStatus(ok: boolean): CheckStatus {
  return ok ? "healthy" : "down";
}

function sortNewest<T extends { createdAt?: string }>(items: T[]) {
  return [...items].sort((left, right) => {
    const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
    const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0;
    return rightTime - leftTime;
  });
}

function buildAbsoluteUrl(origin: string, path: string) {
  return new URL(path, origin).toString();
}

async function runSimpleCheck(origin: string, path: string, label: string): Promise<SiteHealthCheck> {
  try {
    const response = await fetch(buildAbsoluteUrl(origin, path), {
      cache: "no-store",
      redirect: "manual",
    });

    return {
      key: path,
      label,
      status: scoreStatus(response.status === 200),
      detail:
        response.status === 200
          ? `${label} returned 200.`
          : `${label} returned ${response.status}.`,
      httpStatus: response.status,
    };
  } catch (error) {
    return {
      key: path,
      label,
      status: "down",
      detail:
        error instanceof Error
          ? `${label} could not be reached: ${error.message}`
          : `${label} could not be reached.`,
    };
  }
}

async function runProtectedRouteCheck(
  origin: string,
  path: string,
  expectedText: string,
  label: string,
): Promise<SiteHealthCheck> {
  try {
    const response = await fetch(buildAbsoluteUrl(origin, path), {
      cache: "no-store",
      redirect: "manual",
    });
    const html = await response.text();
    const protectedCorrectly = response.status === 200 && html.includes(expectedText);

    return {
      key: path,
      label,
      status: protectedCorrectly ? "healthy" : "attention",
      detail: protectedCorrectly
        ? `${label} is still protected for signed-out visitors.`
        : `${label} did not show the expected signed-out protection message.`,
      httpStatus: response.status,
    };
  } catch (error) {
    return {
      key: path,
      label,
      status: "down",
      detail:
        error instanceof Error
          ? `${label} check failed: ${error.message}`
          : `${label} check failed.`,
    };
  }
}

async function getSupabaseHealthCheck(): Promise<SiteHealthCheck> {
  if (!hasSupabaseServerEnv()) {
    return {
      key: "supabase",
      label: "Supabase connection",
      status: "attention",
      detail: "Supabase server credentials are missing, so connection health cannot be confirmed here.",
    };
  }

  try {
    const supabase = getSupabaseServerAdminClient();
    const { error } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1,
    });

    return {
      key: "supabase",
      label: "Supabase connection",
      status: error ? "attention" : "healthy",
      detail: error
        ? `Supabase responded with an admin error: ${error.message}`
        : "Supabase server connection responded successfully.",
    };
  } catch (error) {
    return {
      key: "supabase",
      label: "Supabase connection",
      status: "down",
      detail:
        error instanceof Error
          ? `Supabase connection failed: ${error.message}`
          : "Supabase connection failed.",
    };
  }
}

function getEmailAuthStatus() {
  const smtpConfigured = Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);
  const siteUrlConfigured =
    Boolean(env.NEXT_PUBLIC_SITE_URL) && !env.NEXT_PUBLIC_SITE_URL.includes("localhost");
  const senderConfigured = Boolean(env.EMAIL_FROM);

  const status: CheckStatus =
    smtpConfigured && siteUrlConfigured && senderConfigured ? "healthy" : "attention";

  return {
    status,
    detail:
      status === "healthy"
        ? "SMTP sender settings and site URL are present for production auth emails."
        : "Auth email setup still needs attention. Check SMTP, sender address, and production callback URL settings.",
    smtpConfigured,
    senderConfigured,
    siteUrlConfigured,
  };
}

function getMonitoringStatus(): MonitoringStatus {
  const sentryConfigured = Boolean(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN);

  return {
    sentryConfigured,
    sentryDetail: sentryConfigured
      ? "Sentry DSN is present, so app errors can be sent once the Sentry project is connected."
      : "Sentry is not configured yet. Add a DSN before relying on app issue alerts outside this founder view.",
  };
}

function matchesKeyword(entry: PrivateFeedbackRecord, keywords: string[]) {
  const haystack = [
    entry.source,
    entry.pageContext,
    entry.confusingText,
    entry.improvementText,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return keywords.some((keyword) => haystack.includes(keyword));
}

function buildFeedbackSignal(entry: PrivateFeedbackRecord, fallbackTitle: string): OpsSignal {
  return {
    title: fallbackTitle,
    detail:
      entry.confusingText ||
      entry.improvementText ||
      "A user left a private note asking for help.",
    createdAt: entry.createdAt,
    href: "/founder",
  };
}

function buildCheckoutSignals(orders: OrderRecord[], refunds: RefundRequestRecord[]) {
  const failedOrPendingOrders = sortNewest(
    orders
      .filter((order) => order.paymentStatus === "failed" || order.paymentStatus === "pending")
      .map((order) => ({
        title: `${order.productTitle} checkout needs review`,
        detail:
          order.paymentStatus === "failed"
            ? `Checkout failed for ${order.buyerEmail || "a buyer"}. Review the payment event details in the admin workspace.`
            : `Checkout is still pending for ${order.buyerEmail || "a buyer"}.`,
        createdAt: order.purchasedAt,
        href: "/admin",
      })),
  );

  const refundSignals = sortNewest(
    refunds
      .filter((refund) => refund.status === "Submitted")
      .map((refund) => ({
        title: `${refund.productTitle} refund request is still open`,
        detail: refund.reason,
        createdAt: refund.requestedAt,
        href: "/admin",
      })),
  );

  return [...failedOrPendingOrders, ...refundSignals].slice(0, 6);
}

function buildOnboardingSignals(profiles: SellerProfileDraft[]) {
  return sortNewest(
    profiles
      .map((profile) => profile as SellerOnboardingSignalProfile)
      .filter(
        (profile) =>
          profile.onboardingCompleted || profile.paypalMerchantId || profile.stripeAccountId,
      )
      .filter(
        (profile) =>
          !(profile.paypalMerchantId && profile.paypalPayoutsEnabled && profile.paypalConsentGranted) &&
          !(profile.stripeAccountId && profile.stripeChargesEnabled && profile.stripePayoutsEnabled),
      )
      .map((profile) => ({
        title: `${profile.displayName || profile.storeName || profile.email} onboarding is incomplete`,
        detail:
          profile.paypalMerchantId || profile.stripeAccountId
            ? "This seller started payout setup but still needs to finish provider onboarding."
            : "This seller saved profile basics but has not finished payout setup yet.",
        createdAt: undefined,
        href: "/sell/onboarding",
      })),
  ).slice(0, 6);
}

function buildUploadSignals(products: ProductRecord[], feedback: PrivateFeedbackRecord[]) {
  const productSignals = products
    .filter((product) => product.createdPath === "Manual upload")
    .map((product) => {
      const blockers = getProductPublishBlockers(product);
      return {
        product,
        blockers,
      };
    })
    .filter(({ blockers }) =>
      blockers.some((blocker) =>
        ["preview", "thumbnail", "rights"].some((keyword) =>
          blocker.toLowerCase().includes(keyword),
        ),
      ),
    )
    .slice(0, 6)
    .map(({ product, blockers }) => ({
      title: `${product.title} still has upload-side publish blockers`,
      detail: blockers.join(", "),
      createdAt: product.updatedAt,
      href: "/admin",
    }));

  const feedbackSignals = feedback
    .filter((entry) => matchesKeyword(entry, ["upload", "file picker", "pdf", "preview image", "drag"]))
    .slice(0, 4)
    .map((entry) => buildFeedbackSignal(entry, "A seller reported an upload or preview problem"));

  return sortNewest([...productSignals, ...feedbackSignals]).slice(0, 6);
}

function buildSupportSignals(feedback: PrivateFeedbackRecord[]) {
  return sortNewest(
    feedback.slice(0, 8).map((entry) => ({
      title: entry.rating ? `Private feedback: ${entry.rating}` : "Private support-style feedback",
      detail:
        entry.confusingText ||
        entry.improvementText ||
        "A user left a short private note for the founder.",
      createdAt: entry.createdAt,
      href: "/founder",
    })),
  );
}

function buildPolicyQueue(products: ProductRecord[], reports: ReportRecord[]) {
  const productQueue = products
    .filter(
      (product) =>
        product.productStatus === "Pending review" ||
        product.productStatus === "Flagged" ||
        !product.rightsConfirmed ||
        !product.previewIncluded ||
        !product.thumbnailIncluded,
    )
    .slice(0, 8)
    .map((product) => ({
      title: product.title,
      detail: getProductPublishBlockers(product).join(", "),
      createdAt: product.updatedAt,
      href: "/admin",
    }));

  const reportQueue = reports
    .filter((report) => report.status === "Open" || report.status === "Under review")
    .slice(0, 6)
    .map((report) => ({
      title: `${report.productTitle} report: ${report.category}`,
      detail: report.details,
      createdAt: report.createdAt,
      href: "/admin",
    }));

  return sortNewest([...productQueue, ...reportQueue]).slice(0, 10);
}

function buildDisputeQueue(refunds: RefundRequestRecord[], reports: ReportRecord[]) {
  const items = [
    ...refunds
      .filter((refund) => refund.status === "Submitted")
      .map((refund) => ({
        title: `${refund.productTitle} refund review`,
        detail: refund.reason,
        createdAt: refund.requestedAt,
        href: "/admin",
      })),
    ...reports
      .filter((report) => report.category === "Access issue" || report.category === "Broken file")
      .filter((report) => report.status === "Open" || report.status === "Under review")
      .map((report) => ({
        title: `${report.productTitle} buyer issue`,
        detail: `${report.category}: ${report.details}`,
        createdAt: report.createdAt,
        href: "/admin",
      })),
  ];

  return sortNewest(items).slice(0, 8);
}

function buildRecommendedActions(input: {
  checks: SiteHealthCheck[];
  emailStatus: ReturnType<typeof getEmailAuthStatus>;
  monitoringStatus: MonitoringStatus;
  signupSignals: OpsSignal[];
  checkoutSignals: OpsSignal[];
  onboardingSignals: OpsSignal[];
  uploadSignals: OpsSignal[];
  policyQueue: OpsSignal[];
  disputeQueue: OpsSignal[];
}): RecommendedAction[] {
  const actions: RecommendedAction[] = [];

  if (input.checks.some((check) => check.status === "down")) {
    actions.push({
      title: "Fix route health failures first",
      detail: "One or more core site routes are failing. Start with the route health section before reviewing queue work.",
      priority: "high",
    });
  }

  if (input.emailStatus.status !== "healthy") {
    actions.push({
      title: "Finish auth email setup",
      detail: "SMTP or production email settings still need attention. This affects signup, magic link, and password reset reliability.",
      priority: "high",
    });
  }

  if (!input.monitoringStatus.sentryConfigured) {
    actions.push({
      title: "Finish external error monitoring setup",
      detail: "Sentry is not configured yet. Add the DSN before launch so production errors do not hide inside support inboxes.",
      priority: "medium",
    });
  }

  if (input.policyQueue.length > 0) {
    actions.push({
      title: "Review the product policy queue",
      detail: "Some listings still need preview, thumbnail, rights confirmation, or moderation review before they should be trusted.",
      priority: "high",
    });
  }

  if (input.disputeQueue.length > 0) {
    actions.push({
      title: "Prepare dispute and refund responses",
      detail: "Open buyer payment or access issues are waiting. Draft responses and review evidence before taking any money action.",
      priority: "high",
    });
  }

  if (input.onboardingSignals.length > 0) {
    actions.push({
      title: "Follow up on seller onboarding friction",
      detail: "Some sellers started setup but did not finish payout onboarding. These are good candidates for a support nudge or founder review.",
      priority: "medium",
    });
  }

  if (input.signupSignals.length > 0 || input.uploadSignals.length > 0 || input.checkoutSignals.length > 0) {
    actions.push({
      title: "Use support signals to draft next replies",
      detail: "There are recent user-reported pain points that are worth answering or turning into small product fixes.",
      priority: "medium",
    });
  }

  if (actions.length === 0) {
    actions.push({
      title: "No urgent founder action is visible right now",
      detail: "Core checks look stable. Keep monitoring and use this page as a daily operations scan.",
      priority: "low",
    });
  }

  return actions;
}

export async function getFounderOpsSnapshot(origin: string) {
  const [
    integrationReadiness,
    persistenceReadiness,
    reports,
    refundRequests,
    feedback,
    sellerProfiles,
    orders,
    products,
    homepageCheck,
    marketplaceCheck,
    supportCheck,
    pricingCheck,
    healthEndpointCheck,
    accountCheck,
    sellerUploadCheck,
    supabaseCheck,
  ] = await Promise.all([
    Promise.resolve(getIntegrationReadiness()),
    getPersistenceReadiness(),
    listReports(),
    listRefundRequests(),
    listPrivateFeedback(),
    listSellerProfiles(),
    listOrders(),
    listPersistedProducts(),
    runSimpleCheck(origin, "/", "Homepage"),
    runSimpleCheck(origin, "/marketplace", "Marketplace"),
    runSimpleCheck(origin, "/support", "Support page"),
    runSimpleCheck(origin, "/pricing", "Pricing page"),
    runSimpleCheck(origin, "/api/health", "Health endpoint"),
    runProtectedRouteCheck(origin, "/account", "Sign in to open your buyer tools.", "Account route"),
    runProtectedRouteCheck(origin, "/sell/products/new", "Sign in to open your seller tools.", "Seller upload route"),
    getSupabaseHealthCheck(),
  ]);

  const emailStatus = getEmailAuthStatus();
  const monitoringStatus = getMonitoringStatus();
  const authFeedbackSignals = feedback
    .filter((entry) =>
      matchesKeyword(entry, ["sign in", "login", "log in", "magic link", "reset password", "signup", "sign up"]),
    )
    .slice(0, 6)
    .map((entry) => buildFeedbackSignal(entry, "A user reported a signup or login problem"));

  const signupSignals =
    authFeedbackSignals.length > 0
      ? authFeedbackSignals
      : [
          {
            title: "No recent signup complaint notes were captured internally",
            detail: "The app does not yet have a dedicated auth error log feed on this dashboard. For deeper signup delivery issues, connect Supabase auth logs and SMTP provider logs.",
          },
        ];

  const checks: SiteHealthCheck[] = [
    homepageCheck,
    marketplaceCheck,
    supportCheck,
    pricingCheck,
    healthEndpointCheck,
    accountCheck,
    sellerUploadCheck,
    supabaseCheck,
    {
      key: "email-auth-config",
      label: "Auth email config",
      status: emailStatus.status,
      detail: emailStatus.detail,
    },
    {
      key: "sentry-config",
      label: "Sentry monitoring config",
      status: monitoringStatus.sentryConfigured ? "healthy" : "attention",
      detail: monitoringStatus.sentryDetail,
    },
    {
      key: "integration-readiness",
      label: "Hosted callback and payment config",
      status: integrationReadiness.status === "ready" ? "healthy" : "attention",
      detail: integrationReadiness.summary,
    },
    {
      key: "persistence-readiness",
      label: "Database health",
      status:
        persistenceReadiness.databaseReachable || !persistenceReadiness.hasRealDatabaseUrl
          ? "healthy"
          : "attention",
      detail: persistenceReadiness.founderSummary,
    },
  ];

  const checkoutSignals = buildCheckoutSignals(orders, refundRequests);
  const onboardingSignals = buildOnboardingSignals(sellerProfiles);
  const uploadSignals = buildUploadSignals(products, feedback);
  const supportSignals = buildSupportSignals(feedback);
  const policyQueue = buildPolicyQueue(products, reports);
  const disputeQueue = buildDisputeQueue(refundRequests, reports);
  const appIssueSignals = sortNewest<OpsSignal>(
    [
      ...checks
        .filter((check) => check.status !== "healthy")
        .map((check) => ({
          title: `${check.label} needs attention`,
          detail: check.detail,
        })),
      ...feedback
        .filter((entry) =>
          matchesKeyword(entry, ["error", "broken", "failed", "500", "crash", "bug"]),
        )
        .slice(0, 4)
        .map((entry) => buildFeedbackSignal(entry, "A user reported an app issue")),
    ].slice(0, 8) as OpsSignal[],
  );
  const recommendedActions = buildRecommendedActions({
    checks,
    emailStatus,
    monitoringStatus,
    signupSignals,
    checkoutSignals,
    onboardingSignals,
    uploadSignals,
    policyQueue,
    disputeQueue,
  });

  return {
    generatedAt: new Date().toISOString(),
    checks,
    emailStatus,
    monitoringStatus,
    signupSignals,
    appIssueSignals,
    checkoutSignals,
    onboardingSignals,
    uploadSignals,
    supportSignals,
    policyQueue,
    disputeQueue,
    recommendedActions,
  };
}

export type FounderOpsSnapshot = Awaited<ReturnType<typeof getFounderOpsSnapshot>>;
