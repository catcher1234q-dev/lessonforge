import { NextResponse } from "next/server";

import { renderManagedThumbnailSvg } from "@/lib/lessonforge/preview-assets";
import { getMarketplaceListingBySlug } from "@/lib/lessonforge/server-catalog";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const listing = await getMarketplaceListingBySlug(slug);

  if (!listing) {
    return NextResponse.json({ error: "Thumbnail asset not found." }, { status: 404 });
  }

  const svg = renderManagedThumbnailSvg({
    title: listing.title,
    subject: listing.subject,
    gradeBand: listing.gradeBand,
    format: listing.format,
    sellerName: listing.sellerName,
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
