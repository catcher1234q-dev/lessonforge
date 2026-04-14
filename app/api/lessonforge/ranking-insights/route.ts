import { NextResponse } from "next/server";

import { getSellerRankingInsights } from "@/lib/lessonforge/server-operations";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const sellerId = url.searchParams.get("sellerId");

  if (!sellerId) {
    return NextResponse.json({ error: "sellerId is required." }, { status: 400 });
  }

  const insights = await getSellerRankingInsights(sellerId);
  return NextResponse.json({ insights });
}
