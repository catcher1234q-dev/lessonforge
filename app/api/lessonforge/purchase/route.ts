import { NextResponse } from "next/server";

import { hasAppSessionForEmail } from "@/lib/auth/app-session";
import { getCurrentViewer } from "@/lib/auth/viewer";
import { handlePurchaseRequest } from "@/lib/lessonforge/api-handlers";
import { saveOrder } from "@/lib/lessonforge/data-access";
import { isStripeServerConfigured } from "@/lib/stripe/server";

export async function POST(request: Request) {
  const viewer = await getCurrentViewer();

  if (process.env.VERCEL === "1" || isStripeServerConfigured()) {
    return NextResponse.json(
      { error: "Preview purchase confirmation is disabled on the live site. Use real Stripe checkout." },
      { status: 403 },
    );
  }

  if (!(await hasAppSessionForEmail(viewer.email))) {
    return NextResponse.json({ error: "Sign in to complete this purchase." }, { status: 401 });
  }

  if (viewer.role !== "buyer") {
    return NextResponse.json({ error: "Only signed-in buyer accounts can complete purchases." }, { status: 403 });
  }

  const body = (await request.json()) as {
    productId?: string;
    productTitle?: string;
    sellerName?: string;
    sellerId?: string;
    sellerPlanKey?: "starter" | "basic" | "pro";
    amountCents?: number;
  };

  const response = await handlePurchaseRequest(
    {
      ...body,
      buyerName: viewer.name,
      buyerEmail: viewer.email,
    },
    {
    saveOrder,
    },
  );

  return NextResponse.json(response.body, { status: response.status });
}
