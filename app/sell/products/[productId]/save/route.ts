import { NextResponse } from "next/server";

import { listPersistedProducts, saveProduct } from "@/lib/lessonforge/repository";
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
  const formData = await request.formData();
  const [products, syncedProduct] = await Promise.all([
    listPersistedProducts(),
    findSupabaseProductRecordById(productId).catch(() => null),
  ]);
  const product =
    syncedProduct ?? products.find((entry) => entry.id === productId);

  if (!product) {
    return NextResponse.redirect(new URL("/sell/dashboard", request.url), 303);
  }

  const title = String(formData.get("title") ?? "").trim();
  const price = Number(formData.get("price") ?? "");
  const nextStatus = formData.get("nextStatus") === "Pending review"
    ? "Pending review"
    : "Draft";

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
    previewIncluded: formData.get("previewIncluded") === "on",
    thumbnailIncluded: formData.get("thumbnailIncluded") === "on",
    rightsConfirmed: formData.get("rightsConfirmed") === "on",
    nextStatus,
  });

  await saveProduct(nextProduct);
  await syncSupabaseProductRecord(nextProduct).catch(() => null);

  const redirectUrl = new URL("/sell/dashboard", request.url);
  redirectUrl.searchParams.set(
    "listingUpdate",
    nextStatus === "Pending review" ? "resubmitted" : "saved",
  );
  redirectUrl.searchParams.set("listingTitle", nextProduct.title);

  return NextResponse.redirect(redirectUrl, 303);
}
