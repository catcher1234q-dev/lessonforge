import type {
  ProductGalleryImage,
  ProductThumbnailCrop,
  ProductThumbnailSelection,
  ProductThumbnailVariant,
} from "@/types";

export const PRODUCT_THUMBNAIL_VARIANTS: Array<{
  label: string;
  value: ProductThumbnailVariant;
}> = [
  { label: "Cover", value: "cover" },
  { label: "Best page", value: "best-page" },
  { label: "Cropped", value: "cropped" },
  { label: "Branded", value: "branded" },
  { label: "Multi-page", value: "multi-page" },
];

export function clampThumbnailCrop(crop: ProductThumbnailCrop): ProductThumbnailCrop {
  const leftPct = Math.max(0, Math.min(0.94, crop.leftPct));
  const topPct = Math.max(0, Math.min(0.94, crop.topPct));
  const widthPct = Math.max(0.06, Math.min(1 - leftPct, crop.widthPct));
  const heightPct = Math.max(0.06, Math.min(1 - topPct, crop.heightPct));

  return {
    leftPct,
    topPct,
    widthPct,
    heightPct,
  };
}

export function buildThumbnailBadgeText(input: {
  subjectLabel?: string;
  gradeLabel?: string;
}) {
  const parts = [input.gradeLabel?.trim(), input.subjectLabel?.trim()].filter(Boolean);
  return parts.slice(0, 2).join(" • ");
}

export function applyThumbnailSelectionToGallery(
  images: ProductGalleryImage[],
  selection: ProductThumbnailSelection | null,
) {
  return images.map((image, index) => ({
    ...image,
    thumbnailSelection: index === 0 ? selection ?? undefined : undefined,
  }));
}

export function buildThumbnailSelection(input: {
  variant: ProductThumbnailVariant;
  sourceImageIds: string[];
  crop?: ProductThumbnailCrop;
  badgeText?: string;
}) {
  return {
    variant: input.variant,
    sourceImageIds: input.sourceImageIds,
    crop: input.crop ? clampThumbnailCrop(input.crop) : undefined,
    badgeText: input.badgeText?.trim() || undefined,
  } satisfies ProductThumbnailSelection;
}

export function getThumbnailSelection(images: ProductGalleryImage[]) {
  return images[0]?.thumbnailSelection ?? null;
}

export function resolveThumbnailSourceImages(
  images: ProductGalleryImage[],
  selection?: ProductThumbnailSelection | null,
) {
  const fallback = images[0] ? [images[0]] : [];
  if (!selection?.sourceImageIds.length) {
    return fallback;
  }

  const selectedImages = selection.sourceImageIds
    .map((imageId) => images.find((image) => image.id === imageId) ?? null)
    .filter((image): image is ProductGalleryImage => Boolean(image));

  return selectedImages.length ? selectedImages : fallback;
}

function escapeForSvg(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderFullBleedImage(input: {
  href: string;
  crop?: ProductThumbnailCrop;
}) {
  if (!input.crop) {
    return `<image href="${input.href}" x="0" y="0" width="1200" height="1500" preserveAspectRatio="xMidYMid slice" />`;
  }

  const crop = clampThumbnailCrop(input.crop);
  const width = 1200 / crop.widthPct;
  const height = 1500 / crop.heightPct;
  const x = -(crop.leftPct * width);
  const y = -(crop.topPct * height);

  return `<image href="${input.href}" x="${x}" y="${y}" width="${width}" height="${height}" preserveAspectRatio="none" />`;
}

export function renderProductThumbnailSvg(input: {
  title: string;
  selection?: ProductThumbnailSelection | null;
  sourceImageDataUris: string[];
}) {
  const selection = input.selection ?? null;
  const sources = input.sourceImageDataUris.filter(Boolean);
  const primaryImage = sources[0] ?? "";
  const safeTitle = escapeForSvg(input.title || "LessonForge resource");
  const badgeText = selection?.badgeText ? escapeForSvg(selection.badgeText) : "";

  if (!primaryImage) {
    return `
      <svg width="1200" height="1500" viewBox="0 0 1200 1500" xmlns="http://www.w3.org/2000/svg">
        <rect width="1200" height="1500" fill="#f8fafc" />
        <rect x="64" y="64" width="1072" height="1372" rx="48" fill="white" stroke="#e2e8f0" stroke-width="8" />
        <text x="96" y="1320" fill="#0f172a" font-size="48" font-family="Arial, sans-serif" font-weight="700">${safeTitle}</text>
      </svg>
    `;
  }

  if (selection?.variant === "multi-page" && sources.length > 1) {
    const slots = [
      { x: 88, y: 112, width: 660, height: 920, rotate: -5 },
      { x: 510, y: 180, width: 560, height: 780, rotate: 7 },
      { x: 210, y: 820, width: 610, height: 520, rotate: -3 },
    ];
    const cards = sources.slice(0, 3).map((href, index) => {
      const slot = slots[index];
      if (!slot) {
        return "";
      }
      return `
        <g transform="translate(${slot.x} ${slot.y}) rotate(${slot.rotate})">
          <rect width="${slot.width}" height="${slot.height}" rx="32" fill="white" />
          <clipPath id="clip-${index}">
            <rect x="16" y="16" width="${slot.width - 32}" height="${slot.height - 32}" rx="24" />
          </clipPath>
          <image href="${href}" x="16" y="16" width="${slot.width - 32}" height="${slot.height - 32}" preserveAspectRatio="xMidYMid slice" clip-path="url(#clip-${index})" />
        </g>
      `;
    });

    return `
      <svg width="1200" height="1500" viewBox="0 0 1200 1500" xmlns="http://www.w3.org/2000/svg">
        <rect width="1200" height="1500" fill="#f8fafc" />
        ${cards.join("")}
        <rect x="72" y="1360" width="1056" height="84" rx="28" fill="rgba(15,23,42,0.82)" />
        <text x="108" y="1414" fill="white" font-size="34" font-family="Arial, sans-serif" font-weight="700">${safeTitle}</text>
      </svg>
    `;
  }

  return `
    <svg width="1200" height="1500" viewBox="0 0 1200 1500" xmlns="http://www.w3.org/2000/svg">
      <rect width="1200" height="1500" fill="#f8fafc" />
      <clipPath id="thumb-frame">
        <rect x="54" y="54" width="1092" height="1292" rx="42" />
      </clipPath>
      ${renderFullBleedImage({ href: primaryImage, crop: selection?.variant === "cropped" ? selection.crop : undefined })}
      <rect width="1200" height="1500" fill="rgba(15,23,42,0.04)" clip-path="url(#thumb-frame)" />
      <rect x="54" y="54" width="1092" height="1292" rx="42" fill="none" stroke="rgba(15,23,42,0.12)" stroke-width="8" />
      ${
        selection?.variant === "branded" && badgeText
          ? `<rect x="86" y="92" width="360" height="74" rx="24" fill="rgba(255,255,255,0.92)" />
             <text x="116" y="138" fill="#0f172a" font-size="28" font-family="Arial, sans-serif" font-weight="700">${badgeText}</text>`
          : ""
      }
      <rect x="72" y="1360" width="1056" height="84" rx="28" fill="rgba(15,23,42,0.82)" />
      <text x="108" y="1414" fill="white" font-size="34" font-family="Arial, sans-serif" font-weight="700">${safeTitle}</text>
    </svg>
  `;
}
