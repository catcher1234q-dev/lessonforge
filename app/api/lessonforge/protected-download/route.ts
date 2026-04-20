import fs from "node:fs/promises";

import { NextResponse } from "next/server";

import { getCurrentViewer } from "@/lib/auth/viewer";
import { getLaunchProductFile } from "@/lib/lessonforge/launch-product-files";
import {
  findOrderById,
  orderBelongsToBuyer,
} from "@/lib/lessonforge/marketplace-rules";
import { listOrders } from "@/lib/lessonforge/data-access";
import { findSupabaseOrderRecordById } from "@/lib/supabase/admin-sync";
import { verifyProtectedDeliveryToken } from "@/lib/lessonforge/secure-delivery";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function GET(request: Request) {
  const viewer = await getCurrentViewer();
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Delivery token is required." }, { status: 400 });
  }

  const verification = verifyProtectedDeliveryToken(token);

  if (!verification.valid) {
    return NextResponse.json({ error: verification.reason }, { status: 401 });
  }

  if (verification.payload.buyerEmail !== viewer.email) {
    return NextResponse.json(
      { error: "This delivery link does not belong to the current buyer." },
      { status: 403 },
    );
  }

  const orders = await listOrders();
  const order =
    (await findSupabaseOrderRecordById(verification.payload.orderId).catch(() => null)) ??
    findOrderById(orders, verification.payload.orderId);

  if (!order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  if (!orderBelongsToBuyer(order, viewer.email)) {
    return NextResponse.json(
      { error: "This order does not belong to the current buyer." },
      { status: 403 },
    );
  }

  const launchAsset = getLaunchProductFile(order.productId);

  if (launchAsset) {
    try {
      const bytes = await fs.readFile(launchAsset.filePath);

      return new NextResponse(bytes, {
        status: 200,
        headers: {
          "Content-Type": launchAsset.mimeType,
          "Content-Disposition": `attachment; filename="${launchAsset.fileName}"`,
          "Cache-Control": "private, no-store",
        },
      });
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? `Launch asset is not available yet: ${error.message}`
              : "Launch asset is not available yet.",
        },
        { status: 500 },
      );
    }
  }

  const fileContents = [
    "LessonForge protected delivery",
    "",
    `Product: ${order.productTitle}`,
    `Seller: ${order.sellerName}`,
    `Version: ${order.versionLabel}`,
    `Access: ${order.accessType}`,
    "",
    "This file represents the protected post-purchase asset for this order.",
    "In a connected storage setup, this route would stream the purchased file or redirect to a signed delivery URL.",
  ].join("\n");

  return new NextResponse(fileContents, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename=\"${slugify(order.productTitle)}-lessonforge-protected.txt\"`,
      "Cache-Control": "private, no-store",
    },
  });
}
