import type { ProductGalleryImage, ProductRecord } from "@/types";

export const MAX_PRODUCT_PREVIEW_IMAGES = 5;
export const MAX_PRODUCT_GALLERY_IMAGES = MAX_PRODUCT_PREVIEW_IMAGES + 1;
export const MIN_PRODUCT_INTERIOR_PREVIEW_IMAGES = 2;
export const PRODUCT_GALLERY_BUCKET = "lessonforge-product-gallery";
export const PRODUCT_GALLERY_MAX_FILE_BYTES = 8 * 1024 * 1024;
export const PRODUCT_GALLERY_MAX_PDF_BYTES = 20 * 1024 * 1024;

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

type StoredProductGalleryImage = {
  id: string;
  storagePath: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  position?: number;
};

export function isAllowedProductGalleryImageType(mimeType: string) {
  return ALLOWED_IMAGE_MIME_TYPES.has(mimeType.toLowerCase());
}

export function buildProductGalleryCoverUrl(productId: string, imageId: string) {
  return `/api/lessonforge/product-gallery/${encodeURIComponent(productId)}/${encodeURIComponent(imageId)}?mode=cover`;
}

export function buildProductGalleryPreviewUrl(productId: string, imageId: string) {
  return `/api/lessonforge/product-gallery/${encodeURIComponent(productId)}/${encodeURIComponent(imageId)}?mode=preview`;
}

export function normalizeProductGallery(
  productId: string,
  images: Array<StoredProductGalleryImage | ProductGalleryImage>,
) {
  return images
    .slice(0, MAX_PRODUCT_GALLERY_IMAGES)
    .map((image, index) => {
      const id = image.id.trim();
      return {
        id,
        storagePath: image.storagePath,
        fileName: image.fileName,
        mimeType: image.mimeType,
        fileSizeBytes: image.fileSizeBytes,
        role: index === 0 ? "cover" : "preview",
        position: index,
        coverUrl: buildProductGalleryCoverUrl(productId, id),
        previewUrl: buildProductGalleryPreviewUrl(productId, id),
      } satisfies ProductGalleryImage;
    });
}

export function serializeProductGallery(images: ProductGalleryImage[]) {
  return images
    .slice(0, MAX_PRODUCT_GALLERY_IMAGES)
    .map((image) =>
      JSON.stringify({
        id: image.id,
        storagePath: image.storagePath,
        fileName: image.fileName,
        mimeType: image.mimeType,
        fileSizeBytes: image.fileSizeBytes,
        position: image.position,
      } satisfies StoredProductGalleryImage),
    );
}

export function deserializeProductGallery(productId: string, storedValues?: string[] | null) {
  const parsed = (storedValues ?? [])
    .map((value) => {
      try {
        return JSON.parse(value) as StoredProductGalleryImage;
      } catch {
        return null;
      }
    })
    .filter((value): value is StoredProductGalleryImage =>
      Boolean(
        value?.id &&
          value.storagePath &&
          value.fileName &&
          value.mimeType &&
          typeof value.fileSizeBytes === "number",
      ),
    )
    .sort((left, right) => (left.position ?? 0) - (right.position ?? 0));

  return normalizeProductGallery(productId, parsed);
}

export function parseProductGalleryJson(productId: string, rawValue: string | null | undefined) {
  if (!rawValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue) as StoredProductGalleryImage[];
    if (!Array.isArray(parsed)) {
      return [];
    }
    return normalizeProductGallery(productId, parsed);
  } catch {
    return [];
  }
}

export function getProductGalleryCoverImage(product: Pick<ProductRecord, "id" | "imageGallery">) {
  return normalizeProductGallery(product.id, product.imageGallery ?? [])[0] ?? null;
}

export function getProductGalleryPreviewImages(product: Pick<ProductRecord, "id" | "imageGallery">) {
  return normalizeProductGallery(product.id, product.imageGallery ?? []).slice(1);
}

export function hasRequiredProductGallery(product: ProductRecord) {
  const gallery = normalizeProductGallery(product.id, product.imageGallery ?? []);
  const previewCount = Math.max(0, gallery.length - 1);
  return {
    hasCoverImage: gallery.length > 0,
    hasPreviewImage: previewCount >= MIN_PRODUCT_INTERIOR_PREVIEW_IMAGES,
    previewCount,
    gallery,
  };
}

export function validateProductGalleryFiles(files: File[]) {
  if (!files.length) {
    return `Add at least one cover image and ${MIN_PRODUCT_INTERIOR_PREVIEW_IMAGES} interior preview images.`;
  }

  if (files.length > MAX_PRODUCT_GALLERY_IMAGES) {
    return `Add up to ${MAX_PRODUCT_PREVIEW_IMAGES} preview images plus one cover image.`;
  }

  for (const file of files) {
    if (!isAllowedProductGalleryImageType(file.type)) {
      return "Upload JPG, PNG, or WebP images only.";
    }

    if (file.size > PRODUCT_GALLERY_MAX_FILE_BYTES) {
      return "Each gallery image must be under 8 MB.";
    }
  }

  return null;
}
