import "server-only";

import { normalizePlanKey, type PlanKey } from "@/lib/config/plans";
import { getSupabaseServerAdminClient, hasSupabaseServerEnv } from "@/lib/supabase/server";
import type {
  LibraryAccessRecord,
  OrderRecord,
  ProductRecord,
  SellerProfileDraft,
  StripeWebhookEventRecord,
} from "@/types";

type SupabaseProfileRole = "buyer" | "seller" | "admin";

type UpsertSupabaseProfileInput = {
  id: string;
  email: string;
  role?: SupabaseProfileRole;
};

type UpsertSupabaseSellerProfileInput = {
  userId: string;
  email: string;
  displayName: string;
  storeName: string;
  storeHandle: string;
  primarySubject: string;
  tagline?: string;
  sellerPlanKey: PlanKey;
  onboardingCompleted: boolean;
  stripeAccountId?: string | null;
  stripeOnboardingStatus?: string | null;
  stripeChargesEnabled?: boolean;
  stripePayoutsEnabled?: boolean;
};

type SyncSupabaseSubscriptionInput = {
  email: string;
  planName: PlanKey;
  status: string;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  currentPeriodEnd?: Date | null;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function canSyncSupabaseAdminRecords() {
  return hasSupabaseServerEnv();
}

export async function upsertSupabaseProfile(input: UpsertSupabaseProfileInput) {
  if (!canSyncSupabaseAdminRecords()) {
    return { synced: false as const, reason: "missing_env" as const };
  }

  const email = normalizeEmail(input.email);

  if (!email) {
    return { synced: false as const, reason: "missing_email" as const };
  }

  const supabase = getSupabaseServerAdminClient();
  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: input.id,
        email,
        role: input.role ?? "buyer",
      },
      {
        onConflict: "id",
      },
    )
    .select("id, email, role")
    .single();

  if (error) {
    throw new Error(`Unable to sync Supabase profile: ${error.message}`);
  }

  return {
    synced: true as const,
    profile: data,
  };
}

export async function getSupabaseProfileByEmail(email: string) {
  const supabase = getSupabaseServerAdminClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, role")
    .eq("email", normalizeEmail(email))
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load Supabase profile: ${error.message}`);
  }

  return data;
}

async function getSupabaseProfileById(id: string) {
  const supabase = getSupabaseServerAdminClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, role")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load Supabase profile by id: ${error.message}`);
  }

  return data;
}

type SupabaseSellerProfileRow = {
  user_id: string;
  display_name: string | null;
  store_name: string;
  store_handle: string;
  primary_subject: string | null;
  tagline: string | null;
  seller_plan_key: string;
  onboarding_completed: boolean;
  stripe_account_id: string | null;
  stripe_onboarding_status: string | null;
  stripe_charges_enabled: boolean;
  stripe_payouts_enabled: boolean;
  created_at?: string;
  updated_at?: string;
};

function toSellerProfileDraft(
  baseProfile: { email: string },
  sellerProfile: SupabaseSellerProfileRow,
): SellerProfileDraft {
  return {
    displayName:
      sellerProfile.display_name ??
      sellerProfile.store_name ??
      baseProfile.email.split("@")[0] ??
      "Seller",
    email: baseProfile.email,
    storeName: sellerProfile.store_name,
    storeHandle: sellerProfile.store_handle,
    primarySubject: sellerProfile.primary_subject ?? "Math",
    tagline: sellerProfile.tagline ?? "",
    sellerPlanKey: normalizePlanKey(sellerProfile.seller_plan_key),
    onboardingCompleted: sellerProfile.onboarding_completed,
    stripeAccountId: sellerProfile.stripe_account_id ?? undefined,
    stripeOnboardingStatus: sellerProfile.stripe_onboarding_status ?? undefined,
    stripeChargesEnabled: sellerProfile.stripe_charges_enabled,
    stripePayoutsEnabled: sellerProfile.stripe_payouts_enabled,
  };
}

export async function getSupabaseSellerProfile(email: string) {
  if (!canSyncSupabaseAdminRecords()) {
    return null;
  }

  const profile = await getSupabaseProfileByEmail(email);

  if (!profile?.id || !profile.email) {
    return null;
  }

  const supabase = getSupabaseServerAdminClient();
  const { data, error } = await supabase
    .from("seller_profiles")
    .select(
      "user_id, display_name, store_name, store_handle, primary_subject, tagline, seller_plan_key, onboarding_completed, stripe_account_id, stripe_onboarding_status, stripe_charges_enabled, stripe_payouts_enabled, created_at, updated_at",
    )
    .eq("user_id", profile.id)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load Supabase seller profile: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return toSellerProfileDraft(
    {
      email: profile.email,
    },
    data as SupabaseSellerProfileRow,
  );
}

export async function listSupabaseSellerProfiles() {
  if (!canSyncSupabaseAdminRecords()) {
    return [];
  }

  const supabase = getSupabaseServerAdminClient();
  const { data, error } = await supabase
    .from("seller_profiles")
    .select(
      "user_id, display_name, store_name, store_handle, primary_subject, tagline, seller_plan_key, onboarding_completed, stripe_account_id, stripe_onboarding_status, stripe_charges_enabled, stripe_payouts_enabled, profiles!inner(email)",
    )
    .order("store_name", { ascending: true });

  if (error) {
    throw new Error(`Unable to load Supabase seller profiles: ${error.message}`);
  }

  return ((data ?? []) as Array<SupabaseSellerProfileRow & { profiles?: { email?: string | null } }>)
    .filter((entry) => Boolean(entry.profiles?.email))
    .map((entry) =>
      toSellerProfileDraft(
        {
          email: entry.profiles?.email?.trim().toLowerCase() ?? "",
        },
        entry,
      ),
    );
}

export async function upsertSupabaseSellerProfile(
  input: UpsertSupabaseSellerProfileInput,
) {
  if (!canSyncSupabaseAdminRecords()) {
    return { synced: false as const, reason: "missing_env" as const };
  }

  await upsertSupabaseProfile({
    id: input.userId,
    email: input.email,
    role: "seller",
  });

  const supabase = getSupabaseServerAdminClient();
  const { data, error } = await supabase
    .from("seller_profiles")
    .upsert(
      {
        user_id: input.userId,
        display_name: input.displayName,
        store_name: input.storeName,
        store_handle: input.storeHandle,
        primary_subject: input.primarySubject,
        tagline: input.tagline ?? "",
        seller_plan_key: normalizePlanKey(input.sellerPlanKey),
        onboarding_completed: input.onboardingCompleted,
        stripe_account_id: input.stripeAccountId ?? null,
        stripe_onboarding_status: input.stripeOnboardingStatus ?? null,
        stripe_charges_enabled: input.stripeChargesEnabled ?? false,
        stripe_payouts_enabled: input.stripePayoutsEnabled ?? false,
      },
      {
        onConflict: "user_id",
      },
    )
    .select(
      "user_id, display_name, store_name, store_handle, primary_subject, tagline, seller_plan_key, onboarding_completed, stripe_account_id, stripe_onboarding_status, stripe_charges_enabled, stripe_payouts_enabled, profiles!inner(email)",
    )
    .single();

  if (error) {
    throw new Error(`Unable to sync Supabase seller profile: ${error.message}`);
  }

  const row = data as SupabaseSellerProfileRow & { profiles?: { email?: string | null } };

  return {
    synced: true as const,
    profile: toSellerProfileDraft(
      {
        email: row.profiles?.email?.trim().toLowerCase() ?? normalizeEmail(input.email),
      },
      row,
    ),
  };
}

function mapProductStatusToSupabaseStatus(productStatus?: ProductRecord["productStatus"]) {
  switch (productStatus) {
    case "Pending review":
      return "pending_review";
    case "Published":
      return "published";
    case "Flagged":
      return "flagged";
    case "Rejected":
      return "rejected";
    case "Removed":
      return "removed";
    case "Draft":
    default:
      return "draft";
  }
}

function buildSellerLabelFromEmail(email?: string | null) {
  const safeEmail = email?.trim().toLowerCase();

  if (!safeEmail) {
    return "Teacher seller";
  }

  const prefix = safeEmail.split("@")[0]?.replace(/[-_.]+/g, " ").trim();

  if (!prefix) {
    return safeEmail;
  }

  return prefix.replace(/\b\w/g, (character) => character.toUpperCase());
}

export async function syncSupabaseSubscriptionRecord(
  input: SyncSupabaseSubscriptionInput,
) {
  if (!canSyncSupabaseAdminRecords()) {
    return { synced: false as const, reason: "missing_env" as const };
  }

  const profile = await getSupabaseProfileByEmail(input.email);

  if (!profile?.id) {
    return { synced: false as const, reason: "missing_profile" as const };
  }

  const supabase = getSupabaseServerAdminClient();
  const { data, error } = await supabase
    .from("subscriptions")
    .upsert(
      {
        user_id: profile.id,
        stripe_customer_id: input.stripeCustomerId ?? null,
        stripe_subscription_id: input.stripeSubscriptionId ?? null,
        plan_name: normalizePlanKey(input.planName),
        status: input.status,
        current_period_end: input.currentPeriodEnd?.toISOString() ?? null,
      },
      {
        onConflict: input.stripeSubscriptionId ? "stripe_subscription_id" : "user_id",
      },
    )
    .select(
      "id, user_id, stripe_customer_id, stripe_subscription_id, plan_name, status, current_period_end",
    )
    .single();

  if (error) {
    throw new Error(`Unable to sync Supabase subscription: ${error.message}`);
  }

  return {
    synced: true as const,
    subscription: data,
  };
}

export async function getSupabaseSubscriptionRecord(email: string) {
  if (!canSyncSupabaseAdminRecords()) {
    return null;
  }

  const profile = await getSupabaseProfileByEmail(email);

  if (!profile?.id) {
    return null;
  }

  const supabase = getSupabaseServerAdminClient();
  const { data, error } = await supabase
    .from("subscriptions")
    .select(
      "id, user_id, stripe_customer_id, stripe_subscription_id, plan_name, status, current_period_end",
    )
    .eq("user_id", profile.id)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load Supabase subscription: ${error.message}`);
  }

  return data;
}

export async function syncSupabaseProductRecord(product: ProductRecord) {
  if (!canSyncSupabaseAdminRecords() || !product.id || !product.sellerId) {
    return { synced: false as const, reason: "missing_env_or_owner" as const };
  }

  const sellerProfile = await getSupabaseProfileByEmail(product.sellerId);

  if (!sellerProfile?.id) {
    return { synced: false as const, reason: "missing_profile" as const };
  }

  const supabase = getSupabaseServerAdminClient();
  const { data, error } = await supabase
    .from("products")
    .upsert(
      {
        id: product.id,
        seller_id: sellerProfile.id,
        title: product.title,
        description:
          product.fullDescription ??
          product.shortDescription ??
          product.summary ??
          "",
        price: product.priceCents ?? 0,
        file_url: product.originalAssetUrl ?? null,
        status: mapProductStatusToSupabaseStatus(product.productStatus),
      },
      {
        onConflict: "id",
      },
    )
    .select("id, seller_id, title, status")
    .single();

  if (error) {
    throw new Error(`Unable to sync Supabase product: ${error.message}`);
  }

  return {
    synced: true as const,
    product: data,
  };
}

export async function syncSupabaseOrderRecord(order: OrderRecord) {
  if (!canSyncSupabaseAdminRecords() || !order.id || !order.productId || !order.buyerEmail) {
    return { synced: false as const, reason: "missing_env_or_order_fields" as const };
  }

  const [buyerProfile, productResult] = await Promise.all([
    getSupabaseProfileByEmail(order.buyerEmail),
    getSupabaseServerAdminClient()
      .from("products")
      .select("id")
      .eq("id", order.productId)
      .maybeSingle(),
  ]);

  if (!buyerProfile?.id) {
    return { synced: false as const, reason: "missing_buyer_profile" as const };
  }

  if (productResult.error) {
    throw new Error(`Unable to load Supabase product: ${productResult.error.message}`);
  }

  if (!productResult.data?.id) {
    return { synced: false as const, reason: "missing_product" as const };
  }

  const supabase = getSupabaseServerAdminClient();
  const { data, error } = await supabase
    .from("orders")
    .upsert(
      {
        id: order.id,
        buyer_id: buyerProfile.id,
        product_id: order.productId,
        stripe_checkout_session_id: order.stripeCheckoutSessionId ?? null,
        stripe_payment_intent_id: order.stripePaymentIntentId ?? null,
        status: order.paymentStatus ?? "paid",
        amount_paid: order.amountCents,
        seller_share_paid: order.sellerShareCents,
        platform_share_paid: order.platformShareCents,
      },
      {
        onConflict: "id",
      },
    )
    .select(
      "id, buyer_id, product_id, stripe_checkout_session_id, stripe_payment_intent_id, status, amount_paid, seller_share_paid, platform_share_paid",
    )
    .single();

  if (error) {
    throw new Error(`Unable to sync Supabase order: ${error.message}`);
  }

  return {
    synced: true as const,
    order: data,
  };
}

type SupabaseOrderReadRow = {
  id: string;
  buyer_id: string;
  product_id: string;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  status: string;
  amount_paid: number;
  seller_share_paid: number;
  platform_share_paid: number;
  created_at: string;
};

type SupabaseProductReadRow = {
  id: string;
  seller_id: string;
  title: string;
  description: string;
  price: number;
  file_url: string | null;
  status: string;
  created_at: string;
};

async function buildSupabaseOrderRecords(orderRows: SupabaseOrderReadRow[]) {
  if (!orderRows.length) {
    return [];
  }

  const supabase = getSupabaseServerAdminClient();
  const productIds = [...new Set(orderRows.map((row) => row.product_id))];
  const buyerIds = [...new Set(orderRows.map((row) => row.buyer_id))];

  const [{ data: products, error: productsError }, { data: buyers, error: buyersError }] =
    await Promise.all([
      supabase
        .from("products")
        .select("id, seller_id, title, price")
        .in("id", productIds),
      supabase.from("profiles").select("id, email").in("id", buyerIds),
    ]);

  if (productsError) {
    throw new Error(`Unable to load Supabase products: ${productsError.message}`);
  }

  if (buyersError) {
    throw new Error(`Unable to load Supabase buyers: ${buyersError.message}`);
  }

  const sellerIds = [...new Set((products ?? []).map((product) => product.seller_id))];
  const { data: sellers, error: sellersError } = await supabase
    .from("profiles")
    .select("id, email")
    .in("id", sellerIds);

  if (sellersError) {
    throw new Error(`Unable to load Supabase sellers: ${sellersError.message}`);
  }

  return orderRows.map<OrderRecord>((row) => {
    const product = (products ?? []).find((entry) => entry.id === row.product_id);
    const buyer = (buyers ?? []).find((entry) => entry.id === row.buyer_id);
    const seller = (sellers ?? []).find((entry) => entry.id === product?.seller_id);
    const sellerEmail = seller?.email?.trim().toLowerCase() ?? "";
    const productTitle = product?.title ?? "Purchased resource";

    return {
      id: row.id,
      productId: row.product_id,
      productTitle,
      buyerEmail: buyer?.email?.trim().toLowerCase(),
      sellerName: buildSellerLabelFromEmail(sellerEmail),
      sellerId: sellerEmail || product?.seller_id || row.product_id,
      amountCents: row.amount_paid,
      sellerShareCents: row.seller_share_paid ?? 0,
      platformShareCents: row.platform_share_paid ?? 0,
      paymentStatus:
        row.status === "failed"
          ? "failed"
          : row.status === "refunded"
            ? "refunded"
            : row.status === "pending"
              ? "pending"
              : "paid",
      stripeCheckoutSessionId: row.stripe_checkout_session_id ?? undefined,
      stripePaymentIntentId: row.stripe_payment_intent_id ?? undefined,
      versionLabel: "Version 1",
      accessType: "Download + linked asset",
      updatedLabel: "Current version",
      instructions:
        "Download the included files from your library. Linked Google assets can be opened from the same screen.",
      purchasedAt: row.created_at,
    };
  });
}

function mapSupabaseStatusToProductStatus(status?: string): ProductRecord["productStatus"] {
  switch (status) {
    case "pending_review":
      return "Pending review";
    case "published":
      return "Published";
    case "flagged":
      return "Flagged";
    case "rejected":
      return "Rejected";
    case "removed":
      return "Removed";
    case "draft":
    default:
      return "Draft";
  }
}

async function buildSupabaseProductRecords(productRows: SupabaseProductReadRow[]) {
  if (!productRows.length) {
    return [];
  }

  const sellerIds = [...new Set(productRows.map((row) => row.seller_id))];
  const supabase = getSupabaseServerAdminClient();
  const { data: sellers, error } = await supabase
    .from("profiles")
    .select("id, email")
    .in("id", sellerIds);

  if (error) {
    throw new Error(`Unable to load Supabase product sellers: ${error.message}`);
  }

  return productRows.map<ProductRecord>((row) => {
    const seller = (sellers ?? []).find((entry) => entry.id === row.seller_id);
    const sellerEmail = seller?.email?.trim().toLowerCase() ?? "";
    const title = row.title || "Untitled listing";

    return {
      id: row.id,
      title,
      subject: "General",
      gradeBand: "Not set",
      standardsTag: "Not set",
      updatedAt: row.created_at,
      format: "Digital resource",
      summary: row.description || "Saved seller listing",
      shortDescription: row.description || "Saved seller listing",
      fullDescription: row.description || "Saved seller listing",
      demoOnly: false,
      originalAssetUrl: row.file_url ?? undefined,
      sellerId: sellerEmail || row.seller_id,
      sellerName: buildSellerLabelFromEmail(sellerEmail),
      priceCents: row.price,
      isPurchasable: mapSupabaseStatusToProductStatus(row.status) === "Published",
      productStatus: mapSupabaseStatusToProductStatus(row.status),
    };
  });
}

export async function listSupabaseOrderRecordsForBuyer(email: string) {
  if (!canSyncSupabaseAdminRecords()) {
    return [];
  }

  const buyerProfile = await getSupabaseProfileByEmail(email);

  if (!buyerProfile?.id) {
    return [];
  }

  const supabase = getSupabaseServerAdminClient();
  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, buyer_id, product_id, stripe_checkout_session_id, stripe_payment_intent_id, status, amount_paid, seller_share_paid, platform_share_paid, created_at",
    )
    .eq("buyer_id", buyerProfile.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Unable to load Supabase buyer orders: ${error.message}`);
  }

  return buildSupabaseOrderRecords((data ?? []) as SupabaseOrderReadRow[]);
}

export async function listSupabaseOrderRecordsForSeller(email: string) {
  if (!canSyncSupabaseAdminRecords()) {
    return [];
  }

  const sellerProfile = await getSupabaseProfileByEmail(email);

  if (!sellerProfile?.id) {
    return [];
  }

  const supabase = getSupabaseServerAdminClient();
  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("id")
    .eq("seller_id", sellerProfile.id);

  if (productsError) {
    throw new Error(`Unable to load Supabase seller products: ${productsError.message}`);
  }

  const productIds = (products ?? []).map((product) => product.id);

  if (!productIds.length) {
    return [];
  }

  const { data: orders, error: ordersError } = await supabase
    .from("orders")
    .select(
      "id, buyer_id, product_id, stripe_checkout_session_id, stripe_payment_intent_id, status, amount_paid, seller_share_paid, platform_share_paid, created_at",
    )
    .in("product_id", productIds)
    .order("created_at", { ascending: false });

  if (ordersError) {
    throw new Error(`Unable to load Supabase seller orders: ${ordersError.message}`);
  }

  return buildSupabaseOrderRecords((orders ?? []) as SupabaseOrderReadRow[]);
}

export async function listSupabaseOrderRecords() {
  if (!canSyncSupabaseAdminRecords()) {
    return [];
  }

  const supabase = getSupabaseServerAdminClient();
  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, buyer_id, product_id, stripe_checkout_session_id, stripe_payment_intent_id, status, amount_paid, seller_share_paid, platform_share_paid, created_at",
    )
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Unable to load Supabase orders: ${error.message}`);
  }

  return buildSupabaseOrderRecords((data ?? []) as SupabaseOrderReadRow[]);
}

export async function findSupabaseOrderRecordById(orderId: string) {
  if (!canSyncSupabaseAdminRecords()) {
    return null;
  }

  const supabase = getSupabaseServerAdminClient();
  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, buyer_id, product_id, stripe_checkout_session_id, stripe_payment_intent_id, status, amount_paid, seller_share_paid, platform_share_paid, created_at",
    )
    .eq("id", orderId)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load Supabase order: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  const [record] = await buildSupabaseOrderRecords([data as SupabaseOrderReadRow]);
  return record ?? null;
}

export async function findSupabaseOrderRecordByCheckoutSessionId(sessionId: string) {
  if (!canSyncSupabaseAdminRecords()) {
    return null;
  }

  const supabase = getSupabaseServerAdminClient();
  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, buyer_id, product_id, stripe_checkout_session_id, stripe_payment_intent_id, status, amount_paid, seller_share_paid, platform_share_paid, created_at",
    )
    .eq("stripe_checkout_session_id", sessionId)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load Supabase order by checkout session: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  const [record] = await buildSupabaseOrderRecords([data as SupabaseOrderReadRow]);
  return record ?? null;
}

export async function findSupabaseOrderRecordByPaymentIntentId(paymentIntentId: string) {
  if (!canSyncSupabaseAdminRecords()) {
    return null;
  }

  const supabase = getSupabaseServerAdminClient();
  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, buyer_id, product_id, stripe_checkout_session_id, stripe_payment_intent_id, status, amount_paid, seller_share_paid, platform_share_paid, created_at",
    )
    .eq("stripe_payment_intent_id", paymentIntentId)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load Supabase order by payment intent: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  const [record] = await buildSupabaseOrderRecords([data as SupabaseOrderReadRow]);
  return record ?? null;
}

export async function updateSupabaseOrderStatus(input: {
  orderId: string;
  status: NonNullable<OrderRecord["paymentStatus"]>;
}) {
  if (!canSyncSupabaseAdminRecords()) {
    return { updated: false as const, reason: "missing_env" as const };
  }

  const supabase = getSupabaseServerAdminClient();
  const { error } = await supabase
    .from("orders")
    .update({
      status: input.status,
    })
    .eq("id", input.orderId);

  if (error) {
    throw new Error(`Unable to update Supabase order status: ${error.message}`);
  }

  return { updated: true as const };
}

export async function grantSupabaseLibraryAccess(email: string, productId: string) {
  if (!canSyncSupabaseAdminRecords()) {
    return { granted: false as const, reason: "missing_env" as const };
  }

  const supabase = getSupabaseServerAdminClient();
  const [profile, product] = await Promise.all([
    getSupabaseProfileByEmail(email),
    supabase
      .from("products")
      .select("id")
      .eq("id", productId)
      .maybeSingle(),
  ]);

  if (product.error) {
    throw new Error(`Unable to load Supabase product for library access: ${product.error.message}`);
  }

  if (!profile?.id || !product.data?.id) {
    return { granted: false as const, reason: "missing_profile_or_product" as const };
  }

  const { data, error } = await supabase
    .from("library_access")
    .upsert(
      {
        user_id: profile.id,
        product_id: productId,
      },
      {
        onConflict: "user_id,product_id",
      },
    )
    .select("user_id, product_id, granted_at")
    .single();

  if (error) {
    throw new Error(`Unable to grant Supabase library access: ${error.message}`);
  }

  return {
    granted: true as const,
    access: {
      userId: data.user_id,
      productId: data.product_id,
      grantedAt: data.granted_at,
    } satisfies LibraryAccessRecord,
  };
}

export async function revokeSupabaseLibraryAccess(email: string, productId: string) {
  if (!canSyncSupabaseAdminRecords()) {
    return { revoked: false as const, reason: "missing_env" as const };
  }

  const profile = await getSupabaseProfileByEmail(email);

  if (!profile?.id) {
    return { revoked: false as const, reason: "missing_profile" as const };
  }

  const supabase = getSupabaseServerAdminClient();
  const { error } = await supabase
    .from("library_access")
    .delete()
    .eq("user_id", profile.id)
    .eq("product_id", productId);

  if (error) {
    throw new Error(`Unable to revoke Supabase library access: ${error.message}`);
  }

  return { revoked: true as const };
}

export async function listSupabaseLibraryAccessProductIdsForBuyer(email: string) {
  if (!canSyncSupabaseAdminRecords()) {
    return [];
  }

  const buyerProfile = await getSupabaseProfileByEmail(email);

  if (!buyerProfile?.id) {
    return [];
  }

  const supabase = getSupabaseServerAdminClient();
  const { data, error } = await supabase
    .from("library_access")
    .select("product_id")
    .eq("user_id", buyerProfile.id);

  if (error) {
    throw new Error(`Unable to load Supabase library access: ${error.message}`);
  }

  return (data ?? []).map((row) => row.product_id);
}

export async function recordStripeWebhookEvent(input: {
  eventId: string;
  eventType: string;
  status: StripeWebhookEventRecord["status"];
  userId?: string;
  productId?: string;
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
}) {
  if (!canSyncSupabaseAdminRecords()) {
    return { recorded: false as const, reason: "missing_env" as const };
  }

  const userProfile =
    input.userId && input.userId.includes("@")
      ? await getSupabaseProfileByEmail(input.userId)
      : input.userId
        ? await getSupabaseProfileById(input.userId)
        : null;

  const supabase = getSupabaseServerAdminClient();
  const { data, error } = await supabase
    .from("stripe_webhook_events")
    .upsert(
      {
        event_id: input.eventId,
        event_type: input.eventType,
        status: input.status,
        user_id: userProfile?.id ?? null,
        product_id: input.productId ?? null,
        stripe_session_id: input.stripeSessionId ?? null,
        stripe_payment_intent_id: input.stripePaymentIntentId ?? null,
        processed_at:
          input.status === "processed" || input.status === "ignored"
            ? new Date().toISOString()
            : null,
      },
      {
        onConflict: "event_id",
      },
    )
    .select(
      "event_id, event_type, status, user_id, product_id, stripe_session_id, stripe_payment_intent_id, created_at, processed_at",
    )
    .single();

  if (error) {
    throw new Error(`Unable to record Stripe webhook event: ${error.message}`);
  }

  return {
    recorded: true as const,
    event: {
      eventId: data.event_id,
      eventType: data.event_type,
      status: data.status,
      userId: data.user_id ?? undefined,
      productId: data.product_id ?? undefined,
      stripeSessionId: data.stripe_session_id ?? undefined,
      stripePaymentIntentId: data.stripe_payment_intent_id ?? undefined,
      createdAt: data.created_at,
      processedAt: data.processed_at ?? undefined,
    } satisfies StripeWebhookEventRecord,
  };
}

export async function getStripeWebhookEventRecord(eventId: string) {
  if (!canSyncSupabaseAdminRecords()) {
    return null;
  }

  const supabase = getSupabaseServerAdminClient();
  const { data, error } = await supabase
    .from("stripe_webhook_events")
    .select(
      "event_id, event_type, status, user_id, product_id, stripe_session_id, stripe_payment_intent_id, created_at, processed_at",
    )
    .eq("event_id", eventId)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load Stripe webhook event: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return {
    eventId: data.event_id,
    eventType: data.event_type,
    status: data.status,
    userId: data.user_id ?? undefined,
    productId: data.product_id ?? undefined,
    stripeSessionId: data.stripe_session_id ?? undefined,
    stripePaymentIntentId: data.stripe_payment_intent_id ?? undefined,
    createdAt: data.created_at,
    processedAt: data.processed_at ?? undefined,
  } satisfies StripeWebhookEventRecord;
}

export async function listSupabaseProductRecords() {
  if (!canSyncSupabaseAdminRecords()) {
    return [];
  }

  const supabase = getSupabaseServerAdminClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, seller_id, title, description, price, file_url, status, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Unable to load Supabase products: ${error.message}`);
  }

  return buildSupabaseProductRecords((data ?? []) as SupabaseProductReadRow[]);
}

export async function findSupabaseProductRecordById(productId: string) {
  if (!canSyncSupabaseAdminRecords()) {
    return null;
  }

  const supabase = getSupabaseServerAdminClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, seller_id, title, description, price, file_url, status, created_at")
    .eq("id", productId)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load Supabase product: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  const [record] = await buildSupabaseProductRecords([data as SupabaseProductReadRow]);
  return record ?? null;
}
