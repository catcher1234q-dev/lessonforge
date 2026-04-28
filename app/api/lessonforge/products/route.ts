import { NextResponse } from "next/server";

import { hasAppSessionForEmail } from "@/lib/auth/app-session";
import { getOwnerAccessContext } from "@/lib/auth/owner-access";
import { getCurrentViewer } from "@/lib/auth/viewer";
import { normalizePlanKey } from "@/lib/config/plans";
import { checkAdminMutationRateLimit } from "@/lib/lessonforge/admin-rate-limit";
import { handleProductModerationRequest } from "@/lib/lessonforge/api-handlers";
import { deleteProductGalleryImages } from "@/lib/lessonforge/product-gallery-storage";
import { mergeProductRecord } from "@/lib/lessonforge/product-record-merge";
import { validateProductForSave } from "@/lib/lessonforge/product-validation";
import {
  listPersistedProducts,
  listSellerProfiles,
  saveProduct,
  trackMonetizationEvent,
  updateProductStatus,
} from "@/lib/lessonforge/data-access";
import {
  listSupabaseProductRecords,
  syncSupabaseProductRecord,
} from "@/lib/supabase/admin-sync";
import type { ProductRecord } from "@/types";

const SAVE_PRODUCT_SIDE_EFFECT_TIMEOUT_MS = 2_000;

function mergeProductSources(
  persistedProducts: ProductRecord[],
  syncedProducts: ProductRecord[],
) {
  const merged = new Map<string, ProductRecord>();

  for (const product of persistedProducts) {
    merged.set(product.id, product);
  }

  for (const product of syncedProducts) {
    const existing = merged.get(product.id);
    merged.set(product.id, existing ? mergeProductRecord(existing, product) : product);
  }

  return Array.from(merged.values());
}

async function runBestEffortSaveSideEffect(
  label: string,
  operation: () => Promise<unknown>,
  timeoutMs = SAVE_PRODUCT_SIDE_EFFECT_TIMEOUT_MS,
) {
  let timedOut = false;
  const timeoutPromise = new Promise<null>((resolve) => {
    setTimeout(() => {
      timedOut = true;
      console.warn(`[lessonforge.products.save] side effect timed out`, {
        label,
        timeoutMs,
      });
      resolve(null);
    }, timeoutMs);
  });

  const operationPromise = operation()
    .then(() => {
      if (!timedOut) {
        console.info(`[lessonforge.products.save] side effect finished`, { label });
      }
      return null;
    })
    .catch((error) => {
      console.error(`[lessonforge.products.save] side effect failed`, {
        label,
        message: error instanceof Error ? error.message : String(error),
      });
      return null;
    });

  await Promise.race([operationPromise, timeoutPromise]);
}

export async function GET() {
  const [products, syncedProducts] = await Promise.all([
    listPersistedProducts(),
    listSupabaseProductRecords().catch(() => []),
  ]);

  return NextResponse.json({
    products: mergeProductSources(products, syncedProducts),
  });
}

export async function POST(request: Request) {
  try {
    console.info("[lessonforge.products.save] request received");
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
      return NextResponse.json(
        { error: "Seller access required." },
        { status: 403 },
      );
    }

    const body = (await request.json()) as { product?: ProductRecord };

    if (!body.product) {
      return NextResponse.json(
        { error: "Product details are required." },
        { status: 400 },
      );
    }

    const [profiles, persistedProducts] = await Promise.all([
      listSellerProfiles(),
      listPersistedProducts(),
    ]);
    const effectiveSellerId =
      body.product.sellerId ||
      (viewer.role === "seller" ? viewer.email : undefined);

    if (
      viewer.role === "seller" &&
      effectiveSellerId?.trim().toLowerCase() !== viewer.email.trim().toLowerCase()
    ) {
      return NextResponse.json(
        { error: "You can only save products for your own seller account." },
        { status: 403 },
      );
    }

    const profile =
      profiles.find((entry) => entry.email === effectiveSellerId) ??
      profiles.find((entry) => entry.email === viewer.email);

    const galleryAwareProduct = {
      ...body.product,
      previewIncluded:
        (body.product.imageGallery?.length ?? 0) > 2 || body.product.previewIncluded,
      thumbnailIncluded:
        (body.product.imageGallery?.length ?? 0) > 0 || body.product.thumbnailIncluded,
    };
    const productToSave =
      viewer.role === "seller"
        ? {
            ...galleryAwareProduct,
            sellerId: viewer.email,
          }
        : galleryAwareProduct;

    const previousProduct =
      persistedProducts.find((entry) => entry.id === productToSave.id) ?? null;

    const validationError = validateProductForSave(productToSave);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    console.info("[lessonforge.products.save] before DB write", {
      productId: productToSave.id,
      sellerId: productToSave.sellerId,
      status: productToSave.productStatus ?? "Draft",
    });
    const saved = await saveProduct(productToSave);
    console.info("[lessonforge.products.save] after DB write", {
      productId: saved.id,
      sellerId: saved.sellerId,
    });
    const removedGalleryStoragePaths =
      previousProduct?.imageGallery
        ?.filter(
          (image) =>
            !saved.imageGallery?.some((nextImage) => nextImage.storagePath === image.storagePath),
        )
        .map((image) => image.storagePath) ?? [];
    await Promise.all([
      runBestEffortSaveSideEffect("sync_supabase_product", () =>
        syncSupabaseProductRecord(saved),
      ),
      runBestEffortSaveSideEffect("delete_removed_gallery_images", () =>
        deleteProductGalleryImages(removedGalleryStoragePaths),
      ),
      runBestEffortSaveSideEffect("track_monetization_event", () =>
        trackMonetizationEvent({
          sellerId: saved.sellerId || viewer.email,
          sellerEmail: saved.sellerId || viewer.email,
          planKey: normalizePlanKey(profile?.sellerPlanKey),
          eventType: "listing_created",
          source: "seller_creator",
          metadata: {
            productId: saved.id,
            productStatus: saved.productStatus ?? "Draft",
          },
        }),
      ),
    ]);

    console.info("[lessonforge.products.save] before return", {
      productId: saved.id,
    });
    return NextResponse.json({ product: saved });
  } catch (error) {
    console.error("[lessonforge.products.save] request failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to save product.",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const [viewer, ownerAccess] = await Promise.all([
    getCurrentViewer(),
    getOwnerAccessContext(),
  ]);

  if (!(await hasAppSessionForEmail(viewer.email))) {
    return NextResponse.json({ error: "Signed-in owner access required." }, { status: 401 });
  }

  if (!ownerAccess.isOwner) {
    return NextResponse.json({ error: "Owner access required." }, { status: 403 });
  }

  const rateLimit = checkAdminMutationRateLimit({
    actorEmail: ownerAccess.authenticatedEmail ?? viewer.email,
    actorRole: "owner",
    actionKey: "product-moderation",
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: `Rate limit reached for moderation actions. Try again in ${rateLimit.retryAfterSeconds} seconds.`,
      },
      { status: 429 },
    );
  }

  const body = (await request.json()) as {
    productId?: string;
    productStatus?: NonNullable<ProductRecord["productStatus"]>;
    moderationFeedback?: string;
  };

  const response = await handleProductModerationRequest(body, {
    updateProductStatus: (productId, productStatus, moderationFeedback) =>
      updateProductStatus(productId, productStatus, moderationFeedback, {
        email: ownerAccess.authenticatedEmail ?? viewer.email,
        role: "owner",
      }),
  });

  return NextResponse.json(response.body, { status: response.status });
}
