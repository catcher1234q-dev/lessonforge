import { getSupabaseServerAdminClient } from "@/lib/supabase/server";
import {
  PRODUCT_GALLERY_BUCKET,
  PRODUCT_GALLERY_MAX_FILE_BYTES,
  isAllowedProductGalleryImageType,
} from "@/lib/lessonforge/product-gallery";

export async function ensureProductGalleryBucket() {
  const supabase = getSupabaseServerAdminClient();
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();

  if (listError) {
    throw new Error(`Unable to inspect product gallery storage: ${listError.message}`);
  }

  const existing = buckets.find((bucket) => bucket.name === PRODUCT_GALLERY_BUCKET);
  if (existing) {
    return;
  }

  const { error: createError } = await supabase.storage.createBucket(PRODUCT_GALLERY_BUCKET, {
    public: false,
    fileSizeLimit: String(PRODUCT_GALLERY_MAX_FILE_BYTES),
  });

  if (createError && !/already exists/i.test(createError.message)) {
    throw new Error(`Unable to prepare product gallery storage: ${createError.message}`);
  }
}

function sanitizeFileSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
}

function getFileExtension(fileName: string, mimeType: string) {
  const explicit = fileName.split(".").pop()?.trim().toLowerCase();
  if (explicit && explicit.length <= 5) {
    return explicit;
  }

  switch (mimeType) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return "jpg";
  }
}

export async function uploadProductGalleryImage(input: {
  productId: string;
  imageId: string;
  file: File;
}) {
  if (!isAllowedProductGalleryImageType(input.file.type)) {
    throw new Error("Upload JPG, PNG, or WebP images only.");
  }

  if (input.file.size > PRODUCT_GALLERY_MAX_FILE_BYTES) {
    throw new Error("Each gallery image must be under 8 MB.");
  }

  await ensureProductGalleryBucket();

  const extension = getFileExtension(input.file.name, input.file.type);
  const safeName = sanitizeFileSegment(input.file.name.replace(/\.[^.]+$/, ""));
  const storagePath = buildProductGalleryStoragePath({
    productId: input.productId,
    imageId: input.imageId,
    fileName: input.file.name,
    mimeType: input.file.type,
  });

  const supabase = getSupabaseServerAdminClient();
  const { error } = await supabase.storage
    .from(PRODUCT_GALLERY_BUCKET)
    .upload(storagePath, input.file, {
      contentType: input.file.type,
      cacheControl: "3600",
      upsert: true,
    });

  if (error) {
    throw new Error(`Unable to upload product gallery image: ${error.message}`);
  }

  return {
    storagePath,
    fileName: input.file.name,
    mimeType: input.file.type,
    fileSizeBytes: input.file.size,
  };
}

export function buildProductGalleryStoragePath(input: {
  productId: string;
  imageId: string;
  fileName: string;
  mimeType: string;
}) {
  const extension = getFileExtension(input.fileName, input.mimeType);
  const safeName = sanitizeFileSegment(input.fileName.replace(/\.[^.]+$/, ""));
  return `products/${sanitizeFileSegment(input.productId)}/gallery/${sanitizeFileSegment(input.imageId)}-${safeName}.${extension}`;
}

export async function uploadProductGalleryImageAtStoragePath(input: {
  storagePath: string;
  file: File;
}) {
  if (!isAllowedProductGalleryImageType(input.file.type)) {
    throw new Error("Upload JPG, PNG, or WebP images only.");
  }

  if (input.file.size > PRODUCT_GALLERY_MAX_FILE_BYTES) {
    throw new Error("Each gallery image must be under 8 MB.");
  }

  await ensureProductGalleryBucket();

  const supabase = getSupabaseServerAdminClient();
  const { error } = await supabase.storage
    .from(PRODUCT_GALLERY_BUCKET)
    .upload(input.storagePath, input.file, {
      contentType: input.file.type,
      cacheControl: "3600",
      upsert: true,
    });

  if (error) {
    throw new Error(`Unable to upload product gallery image: ${error.message}`);
  }

  return {
    storagePath: input.storagePath,
    fileName: input.file.name,
    mimeType: input.file.type,
    fileSizeBytes: input.file.size,
  };
}

export async function downloadProductGalleryImage(storagePath: string) {
  const supabase = getSupabaseServerAdminClient();
  const { data, error } = await supabase.storage
    .from(PRODUCT_GALLERY_BUCKET)
    .download(storagePath);

  if (error || !data) {
    throw new Error(`Unable to load product gallery image: ${error?.message ?? "Missing file"}`);
  }

  return data;
}

export async function deleteProductGalleryImages(storagePaths: string[]) {
  if (!storagePaths.length) {
    return;
  }

  const supabase = getSupabaseServerAdminClient();
  const { error } = await supabase.storage
    .from(PRODUCT_GALLERY_BUCKET)
    .remove(storagePaths);

  if (error) {
    throw new Error(`Unable to delete product gallery images: ${error.message}`);
  }
}
