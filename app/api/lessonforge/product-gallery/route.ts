import { NextResponse } from "next/server";

import { hasAppSessionForEmail } from "@/lib/auth/app-session";
import { getCurrentViewer } from "@/lib/auth/viewer";
import { listPersistedProducts } from "@/lib/lessonforge/data-access";
import {
  buildProductGalleryCoverUrl,
  buildProductGalleryPreviewUrl,
  MAX_PRODUCT_GALLERY_IMAGES,
} from "@/lib/lessonforge/product-gallery";
import { uploadProductGalleryImage } from "@/lib/lessonforge/product-gallery-storage";

export const runtime = "nodejs";

function createImageId() {
  return `img_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function POST(request: Request) {
  const viewer = await getCurrentViewer();

  if (!(await hasAppSessionForEmail(viewer.email))) {
    return NextResponse.json(
      { error: "Signed-in seller access required." },
      { status: 401 },
    );
  }

  if (
    viewer.role !== "seller" &&
    viewer.role !== "admin" &&
    viewer.role !== "owner"
  ) {
    return NextResponse.json({ error: "Seller access required." }, { status: 403 });
  }

  const formData = await request.formData();
  const productId = String(formData.get("productId") ?? "").trim();
  const files = formData
    .getAll("images")
    .filter((value): value is File => value instanceof File);

  if (!productId) {
    return NextResponse.json({ error: "Product id is required." }, { status: 400 });
  }

  if (!files.length) {
    return NextResponse.json({ error: "Add at least one gallery image." }, { status: 400 });
  }

  if (files.length > MAX_PRODUCT_GALLERY_IMAGES) {
    return NextResponse.json(
      { error: "Add up to 5 preview images plus one cover image." },
      { status: 400 },
    );
  }

  const existingProducts = await listPersistedProducts();
  const existingProduct = existingProducts.find((product) => product.id === productId) ?? null;
  const existingImageCount = existingProduct?.imageGallery?.length ?? 0;

  if (
    existingProduct &&
    viewer.role === "seller" &&
    existingProduct.sellerId?.trim().toLowerCase() !== viewer.email.trim().toLowerCase()
  ) {
    return NextResponse.json(
      { error: "You can only manage gallery images for your own listings." },
      { status: 403 },
    );
  }

  if (existingImageCount + files.length > MAX_PRODUCT_GALLERY_IMAGES) {
    return NextResponse.json(
      { error: "Add up to 5 preview images plus one cover image." },
      { status: 400 },
    );
  }

  try {
    const uploadedImages = await Promise.all(
      files.map(async (file, index) => {
        const imageId = createImageId();
        const uploaded = await uploadProductGalleryImage({
          productId,
          imageId,
          file,
        });

        return {
          id: imageId,
          ...uploaded,
          role: index === 0 ? "cover" : "preview",
          position: index,
          coverUrl: buildProductGalleryCoverUrl(productId, imageId),
          previewUrl: buildProductGalleryPreviewUrl(productId, imageId),
        };
      }),
    );

    return NextResponse.json({ images: uploadedImages });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to upload gallery images right now.",
      },
      { status: 500 },
    );
  }
}
