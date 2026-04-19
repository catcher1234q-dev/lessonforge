import { NextResponse } from "next/server";

import { hasAppSessionForEmail } from "@/lib/auth/app-session";
import { getCurrentViewer } from "@/lib/auth/viewer";
import { listPersistedProducts } from "@/lib/lessonforge/data-access";
import { downloadProductGalleryImage } from "@/lib/lessonforge/product-gallery-storage";

export const runtime = "nodejs";

function renderWatermarkedImageSvg(input: {
  title: string;
  imageDataUri: string;
}) {
  const safeTitle = input.title
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

  return `
    <svg width="1200" height="1600" viewBox="0 0 1200 1600" xmlns="http://www.w3.org/2000/svg">
      <rect width="1200" height="1600" fill="#f8fafc" />
      <image href="${input.imageDataUri}" x="0" y="0" width="1200" height="1600" preserveAspectRatio="xMidYMid slice" />
      <rect width="1200" height="1600" fill="rgba(15,23,42,0.08)" />
      <text x="600" y="360" text-anchor="middle" fill="rgba(255,255,255,0.75)" font-size="56" font-family="Arial, sans-serif" font-weight="800" transform="rotate(-18 600 360)">LESSONFORGE PREVIEW</text>
      <text x="600" y="800" text-anchor="middle" fill="rgba(255,255,255,0.68)" font-size="56" font-family="Arial, sans-serif" font-weight="800" transform="rotate(-18 600 800)">SAMPLE ONLY</text>
      <text x="600" y="1240" text-anchor="middle" fill="rgba(255,255,255,0.72)" font-size="56" font-family="Arial, sans-serif" font-weight="800" transform="rotate(-18 600 1240)">LESSONFORGE PREVIEW</text>
      <rect x="56" y="1452" width="1088" height="96" rx="28" fill="rgba(15,23,42,0.74)" />
      <text x="96" y="1508" fill="white" font-size="34" font-family="Arial, sans-serif" font-weight="700">${safeTitle}</text>
    </svg>
  `;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ productId: string; imageId: string }> },
) {
  const { productId, imageId } = await params;
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode") === "cover" ? "cover" : "preview";

  const products = await listPersistedProducts();
  const product = products.find((entry) => entry.id === productId) ?? null;

  if (!product) {
    return NextResponse.json({ error: "Gallery image not found." }, { status: 404 });
  }

  const image = product.imageGallery?.find((entry) => entry.id === imageId) ?? null;

  if (!image) {
    return NextResponse.json({ error: "Gallery image not found." }, { status: 404 });
  }

  const viewer = await getCurrentViewer();
  const hasOwnerAccess =
    (viewer.role === "seller" || viewer.role === "admin" || viewer.role === "owner") &&
    (viewer.role !== "seller" ||
      (await hasAppSessionForEmail(viewer.email)) &&
        product.sellerId?.trim().toLowerCase() === viewer.email.trim().toLowerCase());

  if (product.productStatus !== "Published" && !hasOwnerAccess) {
    return NextResponse.json({ error: "Gallery image not found." }, { status: 404 });
  }

  try {
    const downloaded = await downloadProductGalleryImage(image.storagePath);
    const bytes = Buffer.from(await downloaded.arrayBuffer());

    if (mode === "cover") {
      return new NextResponse(bytes, {
        status: 200,
        headers: {
          "Content-Type": image.mimeType,
          "Cache-Control": "public, max-age=3600, s-maxage=86400",
          "X-Robots-Tag": "noindex",
        },
      });
    }

    const imageDataUri = `data:${image.mimeType};base64,${bytes.toString("base64")}`;
    const svg = renderWatermarkedImageSvg({
      title: product.title,
      imageDataUri,
    });

    return new NextResponse(svg, {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
        "X-Robots-Tag": "noindex",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load gallery image.",
      },
      { status: 500 },
    );
  }
}
