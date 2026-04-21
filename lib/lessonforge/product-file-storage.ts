import "server-only";

import { getSupabaseServerAdminClient } from "@/lib/supabase/server";

const PRODUCT_FILE_BUCKET = "lessonforge-product-files";
const PRODUCT_FILE_MAX_BYTES = 20 * 1024 * 1024;

function sanitizeFileSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
}

function getStoragePointer(storagePath: string) {
  return `storage://${storagePath}`;
}

export function isProductFileStoragePointer(value?: string | null) {
  return Boolean(value?.startsWith("storage://"));
}

export function unwrapProductFileStoragePointer(value: string) {
  return value.replace(/^storage:\/\//, "");
}

async function ensureProductFileBucket() {
  const supabase = getSupabaseServerAdminClient();
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();

  if (listError) {
    throw new Error(`Unable to inspect product file storage: ${listError.message}`);
  }

  const existing = buckets.find((bucket) => bucket.name === PRODUCT_FILE_BUCKET);
  if (existing) {
    return;
  }

  const { error: createError } = await supabase.storage.createBucket(PRODUCT_FILE_BUCKET, {
    public: false,
    fileSizeLimit: String(PRODUCT_FILE_MAX_BYTES),
  });

  if (createError && !/already exists/i.test(createError.message)) {
    throw new Error(`Unable to prepare product file storage: ${createError.message}`);
  }
}

export async function uploadProductOriginalFile(input: {
  productId: string;
  file: File;
}) {
  if (input.file.size > PRODUCT_FILE_MAX_BYTES) {
    throw new Error("Product files must stay under 20 MB.");
  }

  await ensureProductFileBucket();

  const safeName = sanitizeFileSegment(input.file.name);
  const storagePath = `products/${sanitizeFileSegment(input.productId)}/original/${safeName}`;
  const supabase = getSupabaseServerAdminClient();
  const { error } = await supabase.storage
    .from(PRODUCT_FILE_BUCKET)
    .upload(storagePath, input.file, {
      contentType: input.file.type || "application/octet-stream",
      cacheControl: "3600",
      upsert: true,
    });

  if (error) {
    throw new Error(`Unable to upload the original product file: ${error.message}`);
  }

  return {
    storagePath,
    pointer: getStoragePointer(storagePath),
    fileName: input.file.name,
    mimeType: input.file.type || "application/octet-stream",
    fileSizeBytes: input.file.size,
  };
}

export async function downloadProductOriginalFile(storagePointerOrPath: string) {
  const storagePath = isProductFileStoragePointer(storagePointerOrPath)
    ? unwrapProductFileStoragePointer(storagePointerOrPath)
    : storagePointerOrPath;
  const supabase = getSupabaseServerAdminClient();
  const { data, error } = await supabase.storage
    .from(PRODUCT_FILE_BUCKET)
    .download(storagePath);

  if (error || !data) {
    throw new Error(`Unable to load the original product file: ${error?.message ?? "Missing file"}`);
  }

  return {
    storagePath,
    fileName: storagePath.split("/").pop() || "lessonforge-product-file.pdf",
    data,
  };
}
