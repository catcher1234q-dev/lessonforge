import type { PrismaSellerFlowReport } from "@/lib/lessonforge/prisma-verify-contract";
import { buildPrismaSellerFlowReport } from "@/lib/lessonforge/prisma-verify-contract";
import { hasRealDatabaseUrl } from "@/lib/lessonforge/prisma-preflight";

export function getPrismaSellerFlowBlockedMessage(databaseUrl = process.env.DATABASE_URL) {
  if (!hasRealDatabaseUrl(databaseUrl)) {
    return "Set a real DATABASE_URL before running prisma:verify-seller-flow.";
  }

  return null;
}

export async function verifyPrismaSellerFlow(): Promise<PrismaSellerFlowReport> {
  const blockedMessage = getPrismaSellerFlowBlockedMessage();

  if (blockedMessage) {
    throw new Error(blockedMessage);
  }

  const [{ saveSellerProfile, listSellerProfiles, saveProduct, listPersistedProducts }, { prisma }] =
    await Promise.all([
      import("../lessonforge/data-access"),
      import("../prisma/client"),
    ]);

  const stamp = Date.now();
  const sellerEmail = `cutover-seller-${stamp}@lessonforge.demo`;
  const productId = `cutover-product-${stamp}`;

  const sellerProfile = {
    displayName: "Prisma Cutover Seller",
    email: sellerEmail,
    storeName: "Prisma Cutover Store",
    storeHandle: `prisma-cutover-${stamp}`,
    primarySubject: "Math",
    tagline: "Verification path for strict Prisma mode",
    sellerPlanKey: "starter" as const,
    onboardingCompleted: true,
  };

  const product = {
    id: productId,
    title: "Prisma Cutover Verification Resource",
    subject: "Math",
    gradeBand: "6-8",
    standardsTag: "CCSS.MATH.CONTENT.6.RP.A.1",
    updatedAt: new Date().toISOString(),
    format: "Worksheet",
    summary: "A temporary record used to verify seller product persistence on Prisma.",
    demoOnly: false,
    resourceType: "Worksheet",
    shortDescription: "Temporary Prisma cutover verification product.",
    fullDescription:
      "This temporary product exists only to verify that seller-created products save and reload correctly through the Prisma persistence path.",
    licenseType: "Single classroom",
    fileTypes: ["PDF"],
    includedItems: ["Teacher notes", "Student worksheet"],
    thumbnailIncluded: true,
    previewIncluded: true,
    rightsConfirmed: true,
    thumbnailUrl: `/api/lessonforge/thumbnail-assets/${productId}`,
    previewAssetUrls: [`/api/lessonforge/preview-assets/${productId}?page=1`],
    originalAssetUrl: `/api/lessonforge/protected-download?productId=${productId}`,
    assetVersionNumber: 1,
    freshnessScore: 14,
    sellerName: sellerProfile.storeName,
    sellerHandle: `@${sellerProfile.storeHandle}`,
    sellerId: sellerEmail,
    priceCents: 1200,
    isPurchasable: false,
    productStatus: "Draft" as const,
    createdPath: "Manual upload" as const,
  };

  let sellerProfileSaved = false;
  let productSaved = false;

  try {
    await saveSellerProfile(sellerProfile);
    const savedProfiles = await listSellerProfiles();
    const savedProfile = savedProfiles.find((entry) => entry.email === sellerEmail);

    if (!savedProfile) {
      throw new Error("Seller profile was not returned after Prisma save.");
    }

    sellerProfileSaved = true;

    await saveProduct(product);
    const savedProducts = await listPersistedProducts();
    const savedProduct = savedProducts.find((entry) => entry.id === productId);

    if (!savedProduct) {
      throw new Error("Product was not returned after Prisma save.");
    }

    productSaved = true;

    return buildPrismaSellerFlowReport({
      sellerEmail,
      productId,
      sellerProfileSaved,
      productSaved,
    });
  } finally {
    await prisma.product.deleteMany({
      where: { id: productId },
    });
    await prisma.sellerProfile.deleteMany({
      where: { user: { email: sellerEmail } },
    });
    await prisma.user.deleteMany({
      where: { email: sellerEmail },
    });
    await prisma.$disconnect();
  }
}
