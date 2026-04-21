import { NextResponse } from "next/server";

import { hasAppSessionForEmail } from "@/lib/auth/app-session";
import { getCurrentViewer } from "@/lib/auth/viewer";
import {
  buildProductGalleryCoverUrl,
  buildProductGalleryPreviewUrl,
  MAX_PRODUCT_GALLERY_IMAGES,
} from "@/lib/lessonforge/product-gallery";
import {
  buildProductGalleryStoragePath,
  uploadProductGalleryImageAtStoragePath,
} from "@/lib/lessonforge/product-gallery-storage";

const GENERATED_COVER_ID = "generated-cover";

function generatedPreviewId(index: number) {
  return `generated-preview-${index + 1}`;
}

export const runtime = "nodejs";

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
  const coverImage = formData.get("coverImage");
  const previewImages = formData
    .getAll("previewImages")
    .filter((value): value is File => value instanceof File);

  if (!productId) {
    return NextResponse.json({ error: "Product id is required." }, { status: 400 });
  }

  if (!(coverImage instanceof File)) {
    return NextResponse.json({ error: "A generated cover image is required." }, { status: 400 });
  }

  if (!previewImages.length) {
    return NextResponse.json({ error: "At least one generated preview page is required." }, { status: 400 });
  }

  if (previewImages.length + 1 > MAX_PRODUCT_GALLERY_IMAGES) {
    return NextResponse.json(
      { error: "Add up to 5 preview images plus one cover image." },
      { status: 400 },
    );
  }

  try {
    const uploadedCover = await uploadProductGalleryImageAtStoragePath({
      storagePath: buildProductGalleryStoragePath({
        productId,
        imageId: GENERATED_COVER_ID,
        fileName: coverImage.name,
        mimeType: coverImage.type,
      }),
      file: coverImage,
    });

    const uploadedPreviews = await Promise.all(
      previewImages.map((file, index) =>
        uploadProductGalleryImageAtStoragePath({
          storagePath: buildProductGalleryStoragePath({
            productId,
            imageId: generatedPreviewId(index),
            fileName: file.name,
            mimeType: file.type,
          }),
          file,
        }),
      ),
    );

    return NextResponse.json({
      images: [
        {
          id: GENERATED_COVER_ID,
          ...uploadedCover,
          role: "cover",
          position: 0,
          coverUrl: buildProductGalleryCoverUrl(productId, GENERATED_COVER_ID),
          previewUrl: buildProductGalleryPreviewUrl(productId, GENERATED_COVER_ID),
        },
        ...uploadedPreviews.map((image, index) => ({
          id: generatedPreviewId(index),
          ...image,
          role: "preview",
          position: index + 1,
          coverUrl: buildProductGalleryCoverUrl(productId, generatedPreviewId(index)),
          previewUrl: buildProductGalleryPreviewUrl(productId, generatedPreviewId(index)),
        })),
      ],
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to save the generated listing assets.",
      },
      { status: 500 },
    );
  }
}
