import { getStripeServerClient } from "@/lib/stripe/server";

export type SellerPayoutStatus = "live" | "onboarding_required" | "connect_required";

export type SellerPayoutStatusDetails = {
  accountId: string | null;
  status: SellerPayoutStatus;
  transferStatus: string | null;
  payoutStatus: string | null;
  requirements: string[];
};

const ACCOUNT_INCLUDE_FIELDS = [
  "configuration.recipient",
  "requirements",
] as const;

export function resolveSellerAccountId(
  accountId?: string,
  sellerAccountEnvKey?: string,
) {
  return (
    accountId ||
    (sellerAccountEnvKey
      ? process.env[sellerAccountEnvKey as keyof NodeJS.ProcessEnv]
      : undefined) ||
    null
  );
}

export async function getSellerPayoutStatusDetails(
  accountId?: string,
  sellerAccountEnvKey?: string,
): Promise<SellerPayoutStatusDetails> {
  const resolvedAccountId = resolveSellerAccountId(accountId, sellerAccountEnvKey);

  if (!resolvedAccountId) {
    return {
      accountId: null,
      status: "connect_required",
      transferStatus: null,
      payoutStatus: null,
      requirements: [],
    };
  }

  const stripe = getStripeServerClient();
  const account = await stripe.v2.core.accounts.retrieve(resolvedAccountId, {
    include: [...ACCOUNT_INCLUDE_FIELDS],
  });

  const transferStatus =
    account.configuration?.recipient?.capabilities?.stripe_balance?.stripe_transfers
      ?.status ?? null;
  const payoutStatus =
    account.configuration?.recipient?.capabilities?.stripe_balance?.payouts
      ?.status ?? null;
  const requirements =
    account.requirements?.entries
      ?.map((entry) => entry.description)
      .filter((description): description is string => Boolean(description)) ?? [];

  const isLive = transferStatus === "active" && payoutStatus === "active";

  return {
    accountId: resolvedAccountId,
    status: isLive ? "live" : "onboarding_required",
    transferStatus,
    payoutStatus,
    requirements,
  };
}
