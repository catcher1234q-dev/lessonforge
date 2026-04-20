import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

import { hasAppSessionForEmail } from "@/lib/auth/app-session";
import { getCurrentViewer } from "@/lib/auth/viewer";
import { env } from "@/lib/config/env";
import { calculateMarketplaceSplit } from "@/lib/domain/marketplace";
import { handlePurchaseRequest } from "@/lib/lessonforge/api-handlers";
import { saveOrder, listOrders } from "@/lib/lessonforge/data-access";
import { listMarketplaceListings } from "@/lib/lessonforge/server-catalog";
import {
  getSupabaseProfileByEmail,
  grantSupabaseLibraryAccess,
  listSupabaseOrderRecordsForBuyer,
  syncSupabaseOrderRecord,
  upsertSupabaseProfile,
} from "@/lib/supabase/admin-sync";
import { getSupabaseServerAdminClient, hasSupabaseServerEnv } from "@/lib/supabase/server";
import type { OrderRecord } from "@/types";

function isGrantPurchaseEnabled() {
  return process.env.NODE_ENV === "development" || env.DEV_GRANT_PURCHASE_ENABLED;
}

function buildSyntheticSellerEmail(sellerId: string) {
  if (sellerId.includes("@")) {
    return sellerId.trim().toLowerCase();
  }

  return `${sellerId.trim().toLowerCase()}@lessonforge.dev`;
}

function buildFallbackOrder(input: {
  productId: string;
  productTitle: string;
  buyerName: string;
  buyerEmail: string;
  sellerName: string;
  sellerId: string;
  amountCents: number;
}): OrderRecord {
  const split = calculateMarketplaceSplit(input.amountCents, "starter");

  return {
    id: `dev-grant-${Date.now()}`,
    productId: input.productId,
    productTitle: input.productTitle,
    buyerName: input.buyerName,
    buyerEmail: input.buyerEmail,
    sellerName: input.sellerName,
    sellerId: input.sellerId,
    amountCents: input.amountCents,
    sellerShareCents: split.sellerCents,
    platformShareCents: split.platformCents,
    paymentStatus: "paid",
    versionLabel: "Version 1",
    accessType: "Download + linked asset",
    updatedLabel: "Current version",
    instructions:
      "Download the included files from your library. Linked Google assets can be opened from the same screen.",
    purchasedAt: new Date().toISOString(),
  };
}

async function ensureSupabaseAuthUser(email: string) {
  const normalizedEmail = email.trim().toLowerCase();

  if (!hasSupabaseServerEnv()) {
    return null;
  }

  const supabase = getSupabaseServerAdminClient();
  const listed = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });

  if (listed.error) {
    throw new Error(`Unable to list Supabase auth users: ${listed.error.message}`);
  }

  const existing = listed.data.users.find(
    (user) => user.email?.trim().toLowerCase() === normalizedEmail,
  );

  if (existing) {
    return existing;
  }

  const created = await supabase.auth.admin.createUser({
    email: normalizedEmail,
    password: `LessonForgeDev!${randomUUID()}`,
    email_confirm: true,
    user_metadata: {
      lessonforgeDevGrant: true,
    },
  });

  if (created.error || !created.data.user) {
    throw new Error(
      `Unable to create Supabase auth user: ${created.error?.message ?? "Unknown error"}`,
    );
  }

  return created.data.user;
}

async function ensureSupabaseDevOwnershipScaffolding(input: {
  buyerEmail: string;
  listing: {
    id: string;
    title: string;
    fullDescription: string;
    shortDescription: string;
    summary: string;
    priceCents: number;
    sellerId: string;
  };
}) {
  if (!hasSupabaseServerEnv()) {
    return {
      buyerProfileReady: false,
      sellerProfileReady: false,
      productReady: false,
      reason: "missing_env" as const,
      message: "Supabase server credentials are not configured.",
    };
  }

  const buyerEmail = input.buyerEmail.trim().toLowerCase();
  const sellerEmail = buildSyntheticSellerEmail(input.listing.sellerId);
  let buyerProfile = await getSupabaseProfileByEmail(buyerEmail).catch(() => null);
  let sellerProfile = await getSupabaseProfileByEmail(sellerEmail).catch(() => null);

  if (!buyerProfile?.id) {
    try {
      const buyerUser = await ensureSupabaseAuthUser(buyerEmail);
      const result = await upsertSupabaseProfile({
        id: buyerUser?.id ?? randomUUID(),
        email: buyerEmail,
        role: "buyer",
      });
      buyerProfile = result.synced ? result.profile : null;
    } catch (error) {
      return {
        buyerProfileReady: false,
        sellerProfileReady: Boolean(sellerProfile?.id),
        productReady: false,
        reason: "missing_profile" as const,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  if (!sellerProfile?.id) {
    try {
      const sellerUser = await ensureSupabaseAuthUser(sellerEmail);
      const result = await upsertSupabaseProfile({
        id: sellerUser?.id ?? randomUUID(),
        email: sellerEmail,
        role: "seller",
      });
      sellerProfile = result.synced ? result.profile : null;
    } catch (error) {
      return {
        buyerProfileReady: Boolean(buyerProfile?.id),
        sellerProfileReady: false,
        productReady: false,
        reason: "missing_profile" as const,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  if (!buyerProfile?.id || !sellerProfile?.id) {
    return {
      buyerProfileReady: Boolean(buyerProfile?.id),
      sellerProfileReady: Boolean(sellerProfile?.id),
      productReady: false,
      reason: "missing_profile" as const,
      message: "Buyer or seller profile could not be prepared in Supabase.",
    };
  }

  const supabase = getSupabaseServerAdminClient();
  const { error } = await supabase.from("products").upsert(
    {
      id: input.listing.id,
      seller_id: sellerProfile.id,
      title: input.listing.title,
      description:
        input.listing.fullDescription ||
        input.listing.shortDescription ||
        input.listing.summary,
      price: input.listing.priceCents,
      file_url: "/api/lessonforge/library-delivery",
      status: "published",
    },
    {
      onConflict: "id",
    },
  );

  if (error) {
    return {
      buyerProfileReady: true,
      sellerProfileReady: true,
      productReady: false,
      reason: "product_upsert_failed" as const,
      message: error.message,
    };
  }

  return {
    buyerProfileReady: true,
    sellerProfileReady: true,
    productReady: true,
    reason: null,
  };
}

export async function POST(request: Request) {
  if (!isGrantPurchaseEnabled()) {
    return NextResponse.json(
      { error: "Development purchase bypass is not enabled." },
      { status: 403 },
    );
  }

  const viewer = await getCurrentViewer();

  if (!(await hasAppSessionForEmail(viewer.email))) {
    return NextResponse.json({ error: "Sign in to grant a test purchase." }, { status: 401 });
  }

  if (viewer.role !== "buyer") {
    return NextResponse.json(
      { error: "Switch to a signed-in buyer account to grant a test purchase." },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as { productId?: string };
  const productId = body.productId?.trim();

  if (!productId) {
    return NextResponse.json({ error: "productId is required." }, { status: 400 });
  }

  const [listings, prismaOrders, syncedOrders] = await Promise.all([
    listMarketplaceListings(),
    listOrders(),
    listSupabaseOrderRecordsForBuyer(viewer.email).catch(() => []),
  ]);
  const listing = listings.find((entry) => entry.id === productId);

  if (!listing) {
    return NextResponse.json({ error: "Product not found in the marketplace catalog." }, { status: 404 });
  }

  const existingOrder =
    syncedOrders.find(
      (order) =>
        order.productId === productId &&
        order.buyerEmail?.trim().toLowerCase() === viewer.email.trim().toLowerCase() &&
        order.paymentStatus !== "failed" &&
        order.paymentStatus !== "refunded",
    ) ??
    prismaOrders.find(
      (order) =>
        order.productId === productId &&
        order.buyerEmail?.trim().toLowerCase() === viewer.email.trim().toLowerCase() &&
        order.paymentStatus !== "failed" &&
        order.paymentStatus !== "refunded",
    );

  const purchaseInput = {
    productId: listing.id,
    productTitle: listing.title,
    buyerName: viewer.name,
    buyerEmail: viewer.email,
    sellerName: listing.sellerName,
    sellerId: listing.sellerId,
    amountCents: listing.priceCents,
  };

  const purchaseResponse = existingOrder
    ? { status: 200 as const, body: { order: existingOrder } }
    : await handlePurchaseRequest(
        purchaseInput,
        {
          saveOrder,
        },
      );
  const order =
    purchaseResponse.status === 200 && "order" in purchaseResponse.body
      ? purchaseResponse.body.order
      : buildFallbackOrder(purchaseInput);
  let [syncResult, accessResult] = await Promise.all([
    syncSupabaseOrderRecord(order).catch((error) => ({
      synced: false as const,
      reason: "error" as const,
      message: error instanceof Error ? error.message : String(error),
    })),
    grantSupabaseLibraryAccess(viewer.email, order.productId).catch((error) => ({
      granted: false as const,
      reason: "error" as const,
      message: error instanceof Error ? error.message : String(error),
    })),
  ]);

  const needsSupabaseScaffolding =
    !syncResult.synced &&
    (syncResult.reason === "missing_buyer_profile" ||
      syncResult.reason === "missing_product") &&
    !accessResult.granted;
  const ownershipScaffolding = needsSupabaseScaffolding
    ? await ensureSupabaseDevOwnershipScaffolding({
        buyerEmail: viewer.email,
        listing,
      })
    : null;

  if (ownershipScaffolding?.productReady) {
    [syncResult, accessResult] = await Promise.all([
      syncSupabaseOrderRecord(order).catch((error) => ({
        synced: false as const,
        reason: "error" as const,
        message: error instanceof Error ? error.message : String(error),
      })),
      grantSupabaseLibraryAccess(viewer.email, order.productId).catch((error) => ({
        granted: false as const,
        reason: "error" as const,
        message: error instanceof Error ? error.message : String(error),
      })),
    ]);
  }

  console.info("[lessonforge.dev] grant purchase used", {
    buyerEmail: viewer.email,
    productId: listing.id,
    orderId: order.id,
    reusedExistingOrder: Boolean(existingOrder),
    fallbackOrderUsed:
      !existingOrder &&
      (purchaseResponse.status !== 200 || !("order" in purchaseResponse.body)),
    prismaPurchaseError:
      purchaseResponse.status !== 200 && "error" in purchaseResponse.body
        ? purchaseResponse.body.error
        : null,
    ownershipScaffolding,
    syncedSupabaseOrder: syncResult.synced,
    grantedLibraryAccess: accessResult.granted,
  });

  return NextResponse.json({
    order,
    reusedExistingOrder: Boolean(existingOrder),
    fallbackOrderUsed:
      !existingOrder &&
      (purchaseResponse.status !== 200 || !("order" in purchaseResponse.body)),
    prismaPurchaseError:
      purchaseResponse.status !== 200 && "error" in purchaseResponse.body
        ? purchaseResponse.body.error
        : null,
    ownershipScaffolding,
    libraryUrl: `/library?purchase=success&productId=${encodeURIComponent(order.productId)}&productTitle=${encodeURIComponent(order.productTitle)}`,
    deliveryRequest: {
      method: "POST",
      url: "/api/lessonforge/library-delivery",
      body: {
        orderId: order.id,
      },
    },
    supabaseOrderSync: syncResult,
    libraryAccessGrant: accessResult,
  });
}
