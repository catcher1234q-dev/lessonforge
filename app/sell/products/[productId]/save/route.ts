import { NextResponse } from "next/server";

import { hasAppSessionForEmail } from "@/lib/auth/app-session";
import { getCurrentViewer } from "@/lib/auth/viewer";
import { listPersistedProducts, saveProduct } from "@/lib/lessonforge/data-access";
import { parseProductGalleryJson } from "@/lib/lessonforge/product-gallery";
import { deleteProductGalleryImages } from "@/lib/lessonforge/product-gallery-storage";
import { buildSellerProductRevision } from "@/lib/lessonforge/workflow-rules";
import {
  findSupabaseProductRecordById,
  syncSupabaseProductRecord,
} from "@/lib/supabase/admin-sync";
import type { ProductRecord } from "@/types";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ productId: string }> },
) {
  const { productId } = await params;
  const viewer = await getCurrentViewer();
  const formData = await request.formData();

  if (!(await hasAppSessionForEmail(viewer.email))) {
    return NextResponse.redirect(new URL("/sell/onboarding?access=signin-required", request.url), 303);
  }

  if (viewer.role !== "seller" && viewer.role !== "admin" && viewer.role !== "owner") {
    return NextResponse.redirect(new URL("/sell/onboarding?access=seller-required", request.url), 303);
  }

  const [products, syncedProduct] = await Promise.all([
    listPersistedProducts(),
    findSupabaseProductRecordById(productId).catch(() => null),
  ]);
  const product =
    syncedProduct ?? products.find((entry) => entry.id === productId);

  if (!product) {
    return NextResponse.redirect(new URL("/sell/dashboard", request.url), 303);
  }

  if (
    viewer.role === "seller" &&
    product.sellerId?.trim().toLowerCase() !== viewer.email.trim().toLowerCase()
  ) {
    return NextResponse.redirect(new URL("/sell/dashboard?access=listing-forbidden", request.url), 303);
  }

  const title = String(formData.get("title") ?? "").trim();
  const price = Number(formData.get("price") ?? "");
  const nextStatus = formData.get("nextStatus") === "Pending review"
    ? "Pending review"
    : "Draft";
  const imageGallery = parseProductGalleryJson(
    productId,
    String(formData.get("imageGalleryJson") ?? ""),
  );

  if (!title || !Number.isFinite(price) || price < 1) {
    return NextResponse.redirect(new URL(`/sell/products/${productId}/edit`, request.url), 303);
  }

  const nextProduct: ProductRecord = buildSellerProductRevision(product, {
    title,
    subject: String(formData.get("subject") ?? product.subject),
    gradeBand: String(formData.get("gradeBand") ?? product.gradeBand),
    priceCents: Math.round(price * 100),
    notes: String(formData.get("notes") ?? product.summary ?? ""),
    licenseType: String(formData.get("licenseType") ?? product.licenseType ?? ""),
    createdPath: String(formData.get("createdPath") ?? product.createdPath ?? "Manual upload") as ProductRecord["createdPath"],
    previewIncluded: imageGallery.length > 2 || formData.get("previewIncluded") === "on",
    thumbnailIncluded: imageGallery.length > 0 || formData.get("thumbnailIncluded") === "on",
    rightsConfirmed: formData.get("rightsConfirmed") === "on",
    nextStatus,
  });

  nextProduct.imageGallery = imageGallery;

  await saveProduct(nextProduct);
  const removedGalleryStoragePaths =
    product.imageGallery
      ?.filter(
        (image) =>
          !nextProduct.imageGallery?.some((nextImage) => nextImage.storagePath === image.storagePath),
      )
      .map((image) => image.storagePath) ?? [];
  await deleteProductGalleryImages(removedGalleryStoragePaths).catch(() => null);
  await syncSupabaseProductRecord(nextProduct).catch(() => null);

  const redirectUrl = new URL("/sell/dashboard", request.url);
  redirectUrl.searchParams.set(
    "listingUpdate",
    nextStatus === "Pending review" ? "resubmitted" : "saved",
  );
  redirectUrl.searchParams.set("listingTitle", nextProduct.title);

  return NextResponse.redirect(redirectUrl, 303);
}
