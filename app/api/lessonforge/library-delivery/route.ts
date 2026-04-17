import { NextResponse } from "next/server";

import { hasAppSessionForEmail } from "@/lib/auth/app-session";
import { getCurrentViewer } from "@/lib/auth/viewer";
import {
  findOrderById,
  orderBelongsToBuyer,
} from "@/lib/lessonforge/marketplace-rules";
import { listOrders } from "@/lib/lessonforge/data-access";
import {
  findSupabaseOrderRecordById,
  listSupabaseLibraryAccessProductIdsForBuyer,
} from "@/lib/supabase/admin-sync";
import { createProtectedDeliveryToken } from "@/lib/lessonforge/secure-delivery";

async function buildDeliveryPayload(requestedOrderId: string, viewerEmail: string) {
  const orders = await listOrders();
  const order =
    (await findSupabaseOrderRecordById(requestedOrderId).catch(() => null)) ??
    findOrderById(orders, requestedOrderId);

  if (!order) {
    return {
      ok: false as const,
      status: 404,
      body: { error: "Order not found." },
    };
  }

  if (!orderBelongsToBuyer(order, viewerEmail)) {
    return {
      ok: false as const,
      status: 403,
      body: { error: "This order does not belong to the current buyer." },
    };
  }

  const grantedProductIds = await listSupabaseLibraryAccessProductIdsForBuyer(viewerEmail).catch(
    () => [] as string[],
  );
  const hasGrantedAccess = grantedProductIds.includes(order.productId);
  const isRecentPaidFallback =
    order.paymentStatus === "paid" &&
    Date.now() - new Date(order.purchasedAt).getTime() < 5 * 60 * 1000;

  if (
    order.paymentStatus === "failed" ||
    order.paymentStatus === "refunded" ||
    (!hasGrantedAccess && !isRecentPaidFallback)
  ) {
    return {
      ok: false as const,
      status: 403,
      body: { error: "This purchase is not ready for download yet." },
    };
  }

  const expiresAt = Date.now() + 5 * 60 * 1000;
  const token = createProtectedDeliveryToken({
    orderId: order.id,
    productId: order.productId,
    buyerEmail: viewerEmail,
    assetKind: "original",
    expiresAt,
  });

  return {
    ok: true as const,
    deliveryUrl: `/api/lessonforge/protected-download?token=${encodeURIComponent(token)}`,
    expiresAt: new Date(expiresAt).toISOString(),
  };
}

export async function GET(request: Request) {
  const viewer = await getCurrentViewer();

  if (!(await hasAppSessionForEmail(viewer.email))) {
    return NextResponse.json({ error: "Signed-in buyer access required." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get("orderId");

  if (!orderId) {
    return NextResponse.json({ error: "Order id is required." }, { status: 400 });
  }

  const payload = await buildDeliveryPayload(orderId, viewer.email);

  if (!payload.ok) {
    return NextResponse.json(payload.body, { status: payload.status });
  }

  return NextResponse.redirect(new URL(payload.deliveryUrl, request.url), 303);
}

export async function POST(request: Request) {
  const viewer = await getCurrentViewer();

  if (!(await hasAppSessionForEmail(viewer.email))) {
    return NextResponse.json({ error: "Signed-in buyer access required." }, { status: 401 });
  }

  const body = (await request.json()) as { orderId?: string };

  if (!body.orderId) {
    return NextResponse.json({ error: "Order id is required." }, { status: 400 });
  }

  const payload = await buildDeliveryPayload(body.orderId, viewer.email);

  if (!payload.ok) {
    return NextResponse.json(payload.body, { status: payload.status });
  }

  return NextResponse.json({
    deliveryUrl: payload.deliveryUrl,
    expiresAt: payload.expiresAt,
  });
}
