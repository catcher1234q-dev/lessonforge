import { NextResponse } from "next/server";

import { hasAppSessionForEmail } from "@/lib/auth/app-session";
import { getCurrentViewer } from "@/lib/auth/viewer";
import { handleReviewRequest } from "@/lib/lessonforge/api-handlers";
import { listOrders, listReviews, saveReview } from "@/lib/lessonforge/data-access";

export async function GET() {
  const reviews = await listReviews();
  return NextResponse.json({ reviews });
}

export async function POST(request: Request) {
  const viewer = await getCurrentViewer();
  const body = (await request.json()) as {
    productId?: string;
    productTitle?: string;
    rating?: number;
    title?: string;
    body?: string;
    buyerName?: string;
    buyerEmail?: string;
  };

  if (!(await hasAppSessionForEmail(viewer.email))) {
    return NextResponse.json({ error: "Signed-in buyer access required." }, { status: 401 });
  }

  if (viewer.role !== "buyer") {
    return NextResponse.json({ error: "Buyer access required." }, { status: 403 });
  }

  if (body.buyerEmail && body.buyerEmail !== viewer.email) {
    return NextResponse.json(
      { error: "You can only submit reviews from your own buyer account." },
      { status: 403 },
    );
  }

  body.buyerEmail = viewer.email;
  body.buyerName = body.buyerName || viewer.name;

  const response = await handleReviewRequest(body, {
    listOrders,
    listReviews,
    saveReview,
  });

  return NextResponse.json(response.body, { status: response.status });
}
