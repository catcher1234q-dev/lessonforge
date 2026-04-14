import { isSellerPlanBillingConfigured } from "@/lib/stripe/seller-plan-billing";
import { isStripeServerConfigured } from "@/lib/stripe/server";
import { hasSupabaseServerEnv } from "@/lib/supabase/server";

type ReadinessProbe = {
  key: string;
  label: string;
  ready: boolean;
  detail: string;
};

function hasNonPlaceholderValue(value?: string | null, placeholders: string[] = []) {
  if (!value) {
    return false;
  }

  if (value.includes("replace_me")) {
    return false;
  }

  return !placeholders.includes(value);
}

function isWebhookSecretConfigured() {
  return hasNonPlaceholderValue(process.env.STRIPE_WEBHOOK_SECRET, ["whsec_replace_me"]);
}

function isSupabaseBrowserConfigured() {
  return (
    hasNonPlaceholderValue(process.env.NEXT_PUBLIC_SUPABASE_URL, [
      "https://your-project-ref.supabase.co",
    ]) &&
    hasNonPlaceholderValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, ["your-anon-key"])
  );
}

function isSiteUrlConfigured() {
  return hasNonPlaceholderValue(process.env.NEXT_PUBLIC_SITE_URL, [
    "http://localhost:3000",
  ]);
}

export function getIntegrationReadiness() {
  const supabaseBrowserReady = isSupabaseBrowserConfigured();
  const supabaseServerReady = hasSupabaseServerEnv();
  const stripeCheckoutReady = isStripeServerConfigured();
  const stripeWebhookReady = stripeCheckoutReady && isWebhookSecretConfigured();
  const sellerBillingReady =
    stripeCheckoutReady &&
    isSellerPlanBillingConfigured("basic") &&
    isSellerPlanBillingConfigured("pro");
  const siteUrlReady = isSiteUrlConfigured();

  const probes: ReadinessProbe[] = [
    {
      key: "supabase_browser",
      label: "Supabase sign-in",
      ready: supabaseBrowserReady,
      detail: supabaseBrowserReady
        ? "Public Supabase keys are present for buyer and seller sign-in."
        : "Supabase public URL or anon key is still missing or placeholder.",
    },
    {
      key: "supabase_server",
      label: "Supabase server sync",
      ready: supabaseServerReady,
      detail: supabaseServerReady
        ? "Server-side Supabase writes can run for profiles, subscriptions, products, and orders."
        : "The Supabase service role key is still missing, so backend sync cannot fully run.",
    },
    {
      key: "stripe_checkout",
      label: "Stripe checkout",
      ready: stripeCheckoutReady,
      detail: stripeCheckoutReady
        ? "Stripe server keys are present for real checkout creation."
        : "Stripe secret key is still missing or placeholder.",
    },
    {
      key: "stripe_webhook",
      label: "Stripe webhook sync",
      ready: stripeWebhookReady,
      detail: stripeWebhookReady
        ? "Stripe can verify webhook events before unlocking paid features."
        : "Stripe webhook secret is still missing or placeholder.",
    },
    {
      key: "seller_billing",
      label: "Seller plan billing",
      ready: sellerBillingReady,
      detail: sellerBillingReady
        ? "Basic and Pro Stripe price IDs are present for paid seller upgrades."
        : "Basic and Pro Stripe price IDs still need to be added before seller upgrades are fully live.",
    },
    {
      key: "site_url",
      label: "Hosted return URLs",
      ready: siteUrlReady,
      detail: siteUrlReady
        ? "The site URL is configured for redirects, checkout results, and callback flows."
        : "NEXT_PUBLIC_SITE_URL still looks local or placeholder, so hosted callbacks may be wrong.",
    },
  ];

  const readyCount = probes.filter((probe) => probe.ready).length;
  const status =
    readyCount === probes.length
      ? "ready"
      : readyCount >= probes.length - 2
        ? "almost_ready"
        : readyCount > 0
          ? "partial"
          : "not_ready";

  const summary =
    status === "ready"
      ? "Core sign-in and paid-flow integrations look configured."
      : status === "almost_ready"
        ? "Most core integrations are in place, but a few launch-critical settings still need attention."
        : status === "partial"
          ? "Some core integrations are connected, but the real sign-in and payment flow is not fully launch-ready yet."
          : "The real sign-in and payment flow is still mostly unconfigured.";

  return {
    status,
    summary,
    readyCount,
    totalCount: probes.length,
    probes,
  };
}
