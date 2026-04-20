import path from "node:path";

import {
  getLaunchProductAssetSeed,
  launchProductAssetSeeds,
} from "@/lib/lessonforge/launch-product-assets";

export const launchProductAssetDirectory = path.join(
  process.cwd(),
  "seed-assets",
  "launch-products",
);

export function getLaunchProductFile(productId: string) {
  const seed = getLaunchProductAssetSeed(productId);

  if (!seed) {
    return null;
  }

  return {
    productId: seed.id,
    title: seed.title,
    fileName: seed.fileName,
    filePath: path.join(launchProductAssetDirectory, seed.fileName),
    mimeType: "application/pdf",
  };
}

export function listLaunchProductFiles() {
  return launchProductAssetSeeds.map((seed) => ({
    productId: seed.id,
    title: seed.title,
    fileName: seed.fileName,
    filePath: path.join(launchProductAssetDirectory, seed.fileName),
    mimeType: "application/pdf" as const,
  }));
}
