import { NextResponse } from "next/server";

import { hasAppSessionForEmail } from "@/lib/auth/app-session";
import { getCurrentViewer } from "@/lib/auth/viewer";
import { getSellerSalesSummary } from "@/lib/lessonforge/server-operations";

export async function GET(request: Request) {
  const viewer = await getCurrentViewer();
  const url = new URL(request.url);
  const sellerId = url.searchParams.get("sellerId");
  const sellerEmail = url.searchParams.get("sellerEmail");

  if (!sellerId) {
    return NextResponse.json({ error: "sellerId is required." }, { status: 400 });
  }

  if (!(await hasAppSessionForEmail(viewer.email))) {
    return NextResponse.json({ error: "Signed-in seller access required." }, { status: 401 });
  }

  if (viewer.role !== "seller" && viewer.role !== "admin" && viewer.role !== "owner") {
    return NextResponse.json({ error: "Seller access required." }, { status: 403 });
  }

  if (viewer.role === "seller" && sellerId !== viewer.email && sellerEmail !== viewer.email) {
    return NextResponse.json(
      { error: "You can only view sales for your own seller account." },
      { status: 403 },
    );
  }

  const summary = await getSellerSalesSummary(sellerId, sellerEmail ?? undefined);
  return NextResponse.json(summary);
}
