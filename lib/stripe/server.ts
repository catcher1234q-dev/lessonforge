import Stripe from "stripe";

import { featureFlags } from "@/lib/config/feature-flags";

let stripeClient: Stripe | null = null;

function isPlaceholderStripeSecret(secretKey?: string | null) {
  if (!secretKey) {
    return true;
  }

  return (
    secretKey === "sk_test_replace_me" ||
    secretKey === "replace_me" ||
    secretKey.includes("replace_me")
  );
}

export function isStripeServerConfigured() {
  return featureFlags.stripeEnabled && !isPlaceholderStripeSecret(process.env.STRIPE_SECRET_KEY);
}

export function getStripeServerClient() {
  if (stripeClient) {
    return stripeClient;
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!isStripeServerConfigured() || !secretKey) {
    throw new Error("Stripe server is not configured for live checkout yet.");
  }

  stripeClient = new Stripe(secretKey, {
    apiVersion: "2026-03-25.dahlia",
  });

  return stripeClient;
}
