import { NextResponse } from "next/server";

import { hasAppSessionForEmail } from "@/lib/auth/app-session";
import { getCurrentViewer } from "@/lib/auth/viewer";
import { listFavorites, toggleFavorite } from "@/lib/lessonforge/data-access";

export async function GET() {
  const viewer = await getCurrentViewer();

  if (!(await hasAppSessionForEmail(viewer.email))) {
    return NextResponse.json({ error: "Signed-in buyer access required." }, { status: 401 });
  }

  const favorites = await listFavorites();

  return NextResponse.json({
    favorites:
      viewer.role === "buyer"
        ? favorites.filter((favorite) => favorite.userEmail === viewer.email)
        : [],
  });
}

export async function POST(request: Request) {
  const viewer = await getCurrentViewer();

  if (!(await hasAppSessionForEmail(viewer.email))) {
    return NextResponse.json({ error: "Signed-in buyer access required." }, { status: 401 });
  }

  if (viewer.role !== "buyer") {
    return NextResponse.json({ error: "Only buyers can save favorites." }, { status: 403 });
  }

  const body = (await request.json()) as { productId?: string };

  if (!body.productId) {
    return NextResponse.json({ error: "Product id is required." }, { status: 400 });
  }

  const result = await toggleFavorite(viewer.email, body.productId);
  return NextResponse.json(result);
}
