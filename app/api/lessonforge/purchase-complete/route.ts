import { NextResponse } from "next/server";

import { hasAppSessionForEmail } from "@/lib/auth/app-session";
import { getCurrentViewer } from "@/lib/auth/viewer";
import { hasRealDatabaseUrl } from "@/lib/lessonforge/prisma-preflight";
import { handlePurchaseRequest } from "@/lib/lessonforge/api-handlers";
import { saveOrder } from "@/lib/lessonforge/data-access";
import { getPersistenceMode } from "@/lib/prisma/client";
import { isStripeServerConfigured } from "@/lib/stripe/server";

function buildCheckoutReturnParams(formData: FormData) {
  const params = new URLSearchParams();
  const fields = [
    "productId",
    "productTitle",
    "sellerName",
    "sellerId",
    "amountCents",
    "sellerPlanKey",
    "priceCents",
    "teacherPayoutCents",
    "platformFeeCents",
    "title",
    "returnTo",
  ] as const;

  for (const field of fields) {
    const value = formData.get(field);
    if (value) {
      params.set(field, value.toString());
    }
  }

  if (!params.has("title") && params.has("productTitle")) {
    params.set("title", params.get("productTitle") as string);
  }

  return params;
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const viewer = await getCurrentViewer();
  const params = buildCheckoutReturnParams(formData);

  if (process.env.VERCEL === "1" || isStripeServerConfigured()) {
    params.set(
      "purchaseError",
      "Preview purchase confirmation is disabled on the live site. Use real Stripe checkout instead.",
    );
    return NextResponse.redirect(
      new URL(`/checkout-preview?${params.toString()}`, request.url),
      303,
    );
  }

  const persistenceMode = getPersistenceMode();
  const hostedPreviewWithoutWritableStorage =
    process.env.VERCEL === "1" &&
    persistenceMode !== "prisma" &&
    !hasRealDatabaseUrl();

  if (!(await hasAppSessionForEmail(viewer.email))) {
    params.set("purchaseError", "Sign in to complete this purchase.");
    return NextResponse.redirect(
      new URL(`/checkout-preview?${params.toString()}`, request.url),
      303,
    );
  }

  if (viewer.role !== "buyer") {
    params.set(
      "purchaseError",
      "Only signed-in buyer accounts can complete purchases.",
    );
    return NextResponse.redirect(
      new URL(`/checkout-preview?${params.toString()}`, request.url),
      303,
    );
  }

  const body = {
    productId: formData.get("productId")?.toString(),
    productTitle: formData.get("productTitle")?.toString(),
    buyerName: viewer.name,
    buyerEmail: viewer.email,
    sellerName: formData.get("sellerName")?.toString(),
    sellerId: formData.get("sellerId")?.toString(),
    amountCents: Number(formData.get("amountCents") || 0),
    sellerPlanKey:
      (formData.get("sellerPlanKey")?.toString() as "starter" | "basic" | "pro" | undefined) ??
      undefined,
  };

  if (hostedPreviewWithoutWritableStorage) {
    params.set(
      "purchaseError",
      "Preview purchases are not enabled on the live site until the real database setup is connected. Use real Stripe checkout after Supabase and database setup, or keep using this page just as a final review step.",
    );
    return NextResponse.redirect(
      new URL(`/checkout-preview?${params.toString()}`, request.url),
      303,
    );
  }

  const response = await handlePurchaseRequest(body, {
    saveOrder,
  });

  if (response.status === 200) {
    const params = new URLSearchParams({
      purchase: "success",
    });

    if (body.productId) {
      params.set("productId", body.productId);
    }

    if (body.productTitle) {
      params.set("productTitle", body.productTitle);
    }

    return NextResponse.redirect(
      new URL(`/library?${params.toString()}`, request.url),
      303,
    );
  }

  const error =
    "error" in response.body && typeof response.body.error === "string"
      ? response.body.error
      : "Unable to complete purchase.";
  const normalizedError =
    error.includes("EROFS") || error.includes("read-only file system")
      ? "Preview purchases cannot save on the hosted site yet because the live database is still not connected. Finish the database setup first, then use real Stripe checkout for the payment test."
      : error;
  params.set("purchaseError", normalizedError);

  return NextResponse.redirect(
    new URL(`/checkout-preview?${params.toString()}`, request.url),
    303,
  );
}
