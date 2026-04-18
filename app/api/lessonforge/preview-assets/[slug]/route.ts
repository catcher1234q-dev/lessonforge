import { NextResponse } from "next/server";

import { getPublicMarketplaceListingBySlug } from "@/lib/lessonforge/server-catalog";
import { renderManagedPreviewSvg } from "@/lib/lessonforge/preview-assets";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const listing = await getPublicMarketplaceListingBySlug(slug);

  if (!listing) {
    return NextResponse.json({ error: "Preview asset not found." }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get("page") ?? "1");

  if (!Number.isFinite(page) || page < 1 || page > listing.previewAssets.length) {
    return NextResponse.json({ error: "Preview page not found." }, { status: 404 });
  }

  const svg = renderManagedPreviewSvg({
    title: listing.title,
    subject: listing.subject,
    gradeBand: listing.gradeBand,
    format: listing.format,
    sellerName: listing.sellerName,
    summary: listing.summary,
    pageNumber: page,
    pageCount: listing.previewAssets.length,
  });

  return new NextResponse(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
      "X-Robots-Tag": "noindex",
    },
  });
}
