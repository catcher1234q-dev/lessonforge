import { NextResponse } from "next/server";

import { hasAppSessionForEmail } from "@/lib/auth/app-session";
import { getCurrentViewer } from "@/lib/auth/viewer";
import { handlePurchaseRequest } from "@/lib/lessonforge/api-handlers";
import { saveOrder } from "@/lib/lessonforge/repository";

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
  params.set("purchaseError", error);

  return NextResponse.redirect(
    new URL(`/checkout-preview?${params.toString()}`, request.url),
    303,
  );
}
