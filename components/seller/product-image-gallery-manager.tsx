"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  GripVertical,
  ImagePlus,
  RefreshCw,
  Trash2,
} from "lucide-react";

import {
  MIN_PRODUCT_INTERIOR_PREVIEW_IMAGES,
  MAX_PRODUCT_GALLERY_IMAGES,
  MAX_PRODUCT_PREVIEW_IMAGES,
  PRODUCT_GALLERY_MAX_PDF_BYTES,
  normalizeProductGallery,
  validateProductGalleryFiles,
} from "@/lib/lessonforge/product-gallery";
import { renderPdfPreviewImages } from "@/lib/lessonforge/pdf-preview-client";
import {
  applyThumbnailSelectionToGallery,
  buildThumbnailBadgeText,
  buildThumbnailSelection,
  getThumbnailSelection,
} from "@/lib/lessonforge/product-thumbnail-options";
import type { ProductGalleryImage, ProductThumbnailCrop, ProductThumbnailSelection } from "@/types";

type ProductImageGalleryManagerProps = {
  productId: string;
  value: ProductGalleryImage[];
  onChange: (images: ProductGalleryImage[]) => void;
  subjectLabel?: string;
  gradeLabel?: string;
};

type GalleryDisplayImage = ProductGalleryImage & {
  displayUrl: string;
  sourceUrl: string;
};

type ThumbnailOption = {
  key: string;
  label: string;
  description: string;
  selection: ProductThumbnailSelection;
  sourceImages: GalleryDisplayImage[];
};

type ImageMetrics = {
  crop: ProductThumbnailCrop;
  score: number;
};

const THUMBNAIL_CARD_LABELS = new Map([
  ["cover", "Cover"],
  ["best-page", "Best page"],
  ["cropped", "Cropped"],
  ["branded", "Branded"],
  ["multi-page", "Multi-page"],
]);

function reorderItems<T>(items: T[], fromIndex: number, toIndex: number) {
  const nextItems = [...items];
  const [moved] = nextItems.splice(fromIndex, 1);
  nextItems.splice(toIndex, 0, moved);
  return nextItems;
}

function isPdfFile(file: File) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

function selectionKey(selection: ProductThumbnailSelection | null | undefined) {
  if (!selection) {
    return "";
  }

  return JSON.stringify({
    variant: selection.variant,
    sourceImageIds: selection.sourceImageIds,
    crop: selection.crop,
    badgeText: selection.badgeText,
  });
}

function imageLoad(image: HTMLImageElement) {
  return new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("Unable to analyze thumbnail source image."));
  });
}

function buildDefaultCrop(): ProductThumbnailCrop {
  return {
    leftPct: 0,
    topPct: 0,
    widthPct: 1,
    heightPct: 1,
  };
}

function fitCropToAspect(input: {
  left: number;
  top: number;
  right: number;
  bottom: number;
  imageWidth: number;
  imageHeight: number;
}) {
  const targetAspect = 4 / 5;
  let cropWidth = Math.max(1, input.right - input.left);
  let cropHeight = Math.max(1, input.bottom - input.top);
  const centerX = (input.left + input.right) / 2;
  const centerY = (input.top + input.bottom) / 2;

  if (cropWidth / cropHeight > targetAspect) {
    cropHeight = cropWidth / targetAspect;
  } else {
    cropWidth = cropHeight * targetAspect;
  }

  cropWidth = Math.min(input.imageWidth, cropWidth * 1.12);
  cropHeight = Math.min(input.imageHeight, cropHeight * 1.12);

  let left = centerX - cropWidth / 2;
  let top = centerY - cropHeight / 2;

  left = Math.max(0, Math.min(input.imageWidth - cropWidth, left));
  top = Math.max(0, Math.min(input.imageHeight - cropHeight, top));

  return {
    leftPct: left / input.imageWidth,
    topPct: top / input.imageHeight,
    widthPct: cropWidth / input.imageWidth,
    heightPct: cropHeight / input.imageHeight,
  };
}

async function analyzeImage(url: string) {
  const image = new Image();
  image.decoding = "async";
  image.src = url;
  if (typeof image.decode === "function") {
    try {
      await image.decode();
    } catch {
      await imageLoad(image);
    }
  } else {
    await imageLoad(image);
  }

  const sampleWidth = 120;
  const sampleHeight = Math.max(120, Math.round((image.naturalHeight / image.naturalWidth) * sampleWidth));
  const canvas = document.createElement("canvas");
  canvas.width = sampleWidth;
  canvas.height = sampleHeight;
  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context) {
    return {
      crop: buildDefaultCrop(),
      score: 0,
    } satisfies ImageMetrics;
  }

  context.drawImage(image, 0, 0, sampleWidth, sampleHeight);
  const { data } = context.getImageData(0, 0, sampleWidth, sampleHeight);

  let minX = sampleWidth;
  let minY = sampleHeight;
  let maxX = 0;
  let maxY = 0;
  let contentPixels = 0;

  for (let y = 0; y < sampleHeight; y += 1) {
    for (let x = 0; x < sampleWidth; x += 1) {
      const index = (y * sampleWidth + x) * 4;
      const alpha = data[index + 3] ?? 0;
      const red = data[index] ?? 255;
      const green = data[index + 1] ?? 255;
      const blue = data[index + 2] ?? 255;
      const brightness = (red + green + blue) / 3;

      if (alpha > 24 && brightness < 245) {
        contentPixels += 1;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (contentPixels === 0) {
    return {
      crop: buildDefaultCrop(),
      score: 0,
    } satisfies ImageMetrics;
  }

  const crop = fitCropToAspect({
    left: (minX / sampleWidth) * image.naturalWidth,
    top: (minY / sampleHeight) * image.naturalHeight,
    right: ((maxX + 1) / sampleWidth) * image.naturalWidth,
    bottom: ((maxY + 1) / sampleHeight) * image.naturalHeight,
    imageWidth: image.naturalWidth,
    imageHeight: image.naturalHeight,
  });
  const contentRatio = contentPixels / (sampleWidth * sampleHeight);
  const cropArea = crop.widthPct * crop.heightPct;

  return {
    crop,
    score: contentRatio + (1 - cropArea) * 0.35,
  } satisfies ImageMetrics;
}

function findBestContentImage(images: GalleryDisplayImage[], metricsById: Record<string, ImageMetrics>) {
  const previewCandidates = images.slice(1);
  const candidates = previewCandidates.length ? previewCandidates : images;

  return (
    candidates.reduce<GalleryDisplayImage | null>((best, image) => {
      const imageScore = metricsById[image.id]?.score ?? 0;
      const bestScore = best ? metricsById[best.id]?.score ?? 0 : -1;
      return imageScore > bestScore ? image : best;
    }, null) ?? images[0]
  );
}

function buildThumbnailOptions(input: {
  images: GalleryDisplayImage[];
  metricsById: Record<string, ImageMetrics>;
  badgeText?: string;
}) {
  if (!input.images.length) {
    return [] as ThumbnailOption[];
  }

  const coverImage = input.images[0];
  const bestPageImage = findBestContentImage(input.images, input.metricsById);
  const crop = input.metricsById[bestPageImage.id]?.crop ?? buildDefaultCrop();
  const collageImages =
    input.images.length >= 3
      ? input.images.slice(0, 3)
      : input.images.length === 2
        ? [input.images[0], input.images[1]]
        : [input.images[0]];

  return [
    {
      key: "cover",
      label: "Cover",
      description: "Uses page 1 or your uploaded cover as-is.",
      selection: buildThumbnailSelection({
        variant: "cover",
        sourceImageIds: [coverImage.id],
      }),
      sourceImages: [coverImage],
    },
    {
      key: "best-page",
      label: "Best page",
      description: "Uses the strongest real content page from the upload.",
      selection: buildThumbnailSelection({
        variant: "best-page",
        sourceImageIds: [bestPageImage.id],
      }),
      sourceImages: [bestPageImage],
    },
    {
      key: "cropped",
      label: "Cropped",
      description: "Zooms into the most readable section of the strongest page.",
      selection: buildThumbnailSelection({
        variant: "cropped",
        sourceImageIds: [bestPageImage.id],
        crop,
      }),
      sourceImages: [bestPageImage],
    },
    {
      key: "branded",
      label: "Branded",
      description: "Uses a real page with a light grade or subject label.",
      selection: buildThumbnailSelection({
        variant: "branded",
        sourceImageIds: [bestPageImage.id],
        badgeText: input.badgeText,
      }),
      sourceImages: [bestPageImage],
    },
    {
      key: "multi-page",
      label: "Multi-page",
      description: "Combines 2 to 3 real pages in one premium-style collage.",
      selection: buildThumbnailSelection({
        variant: "multi-page",
        sourceImageIds: collageImages.map((image) => image.id),
      }),
      sourceImages: collageImages,
    },
  ] satisfies ThumbnailOption[];
}

function renderCroppedImage(image: GalleryDisplayImage, crop?: ProductThumbnailCrop) {
  if (!crop) {
    return (
      <img
        alt={image.fileName}
        className="h-full w-full object-cover object-top"
        src={image.sourceUrl}
      />
    );
  }

  const width = `${100 / crop.widthPct}%`;
  const height = `${100 / crop.heightPct}%`;
  const left = `${-(crop.leftPct / crop.widthPct) * 100}%`;
  const top = `${-(crop.topPct / crop.heightPct) * 100}%`;

  return (
    <img
      alt={image.fileName}
      className="absolute max-w-none object-cover"
      src={image.sourceUrl}
      style={{
        width,
        height,
        left,
        top,
      }}
    />
  );
}

function ThumbnailOptionPreview({ option }: { option: ThumbnailOption }) {
  const primaryImage = option.sourceImages[0];

  if (!primaryImage) {
    return <div className="h-full w-full bg-slate-100" />;
  }

  if (option.selection.variant === "multi-page") {
    const cards = option.sourceImages.slice(0, 3);
    return (
      <div className="relative h-full w-full overflow-hidden rounded-[0.9rem] bg-slate-100">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.08),_transparent_55%)]" />
        {cards.map((image, index) => (
          <div
            key={image.id}
            className="absolute overflow-hidden rounded-[0.85rem] border border-slate-200 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.12)]"
            style={
              index === 0
                ? { left: "8%", top: "10%", width: "54%", height: "58%", transform: "rotate(-5deg)" }
                : index === 1
                  ? { right: "9%", top: "18%", width: "46%", height: "50%", transform: "rotate(6deg)" }
                  : { left: "18%", bottom: "10%", width: "52%", height: "34%", transform: "rotate(-2deg)" }
            }
          >
            <img alt={image.fileName} className="h-full w-full object-cover object-top" src={image.sourceUrl} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden rounded-[0.9rem] bg-white">
      <div className="absolute inset-0 overflow-hidden rounded-[0.9rem]">
        {renderCroppedImage(
          primaryImage,
          option.selection.variant === "cropped" ? option.selection.crop : undefined,
        )}
      </div>
      {option.selection.variant === "branded" && option.selection.badgeText ? (
        <div className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink shadow-sm">
          {option.selection.badgeText}
        </div>
      ) : null}
      <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-slate-950/35 to-transparent" />
    </div>
  );
}

export function ProductImageGalleryManager({
  productId,
  value,
  onChange,
  subjectLabel,
  gradeLabel,
}: ProductImageGalleryManagerProps) {
  const uploadInputId = `${productId}-gallery-upload`;
  const [message, setMessage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isGeneratingOptions, setIsGeneratingOptions] = useState(false);
  const [thumbnailOptions, setThumbnailOptions] = useState<ThumbnailOption[]>([]);
  const [localPreviewUrls, setLocalPreviewUrls] = useState<Record<string, string>>({});
  const [regenerationNonce, setRegenerationNonce] = useState(0);
  const draggingIdRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      Object.values(localPreviewUrls).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [localPreviewUrls]);

  const images = useMemo<GalleryDisplayImage[]>(
    () =>
      normalizeProductGallery(productId, value).map((image) => ({
        ...image,
        displayUrl:
          localPreviewUrls[image.id] ?? (image.role === "cover" ? image.coverUrl : image.previewUrl),
        sourceUrl: localPreviewUrls[image.id] ?? image.coverUrl,
      })),
    [localPreviewUrls, productId, value],
  );

  const currentSelection = getThumbnailSelection(images);
  const badgeText = buildThumbnailBadgeText({
    subjectLabel,
    gradeLabel,
  });

  function updateGallery(nextImages: ProductGalleryImage[], selection = currentSelection) {
    const normalizedImages = normalizeProductGallery(productId, nextImages);
    onChange(applyThumbnailSelectionToGallery(normalizedImages, selection));
  }

  useEffect(() => {
    let cancelled = false;

    async function generateOptions() {
      if (!images.length) {
        setThumbnailOptions([]);
        return;
      }

      setIsGeneratingOptions(true);
      try {
        const metricsEntries = await Promise.all(
          images.map(async (image) => [image.id, await analyzeImage(image.sourceUrl)] as const),
        );

        if (cancelled) {
          return;
        }

        const nextOptions = buildThumbnailOptions({
          images,
          metricsById: Object.fromEntries(metricsEntries),
          badgeText,
        });
        setThumbnailOptions(nextOptions);

        if (!nextOptions.length) {
          return;
        }

        const selectedKey = selectionKey(currentSelection);
        const matched = nextOptions.find((option) => selectionKey(option.selection) === selectedKey) ?? null;

        if (!matched) {
          const defaultSelection = nextOptions[0]?.selection ?? null;
          if (defaultSelection) {
            updateGallery(images, defaultSelection);
          }
        }
      } catch {
        if (!cancelled) {
          const coverOnly = images[0]
            ? [
                {
                  key: "cover",
                  label: "Cover",
                  description: "Using the first real uploaded page as the fallback thumbnail.",
                  selection: buildThumbnailSelection({
                    variant: "cover",
                    sourceImageIds: [images[0].id],
                  }),
                  sourceImages: [images[0]],
                } satisfies ThumbnailOption,
              ]
            : [];

          setThumbnailOptions(coverOnly);
          setMessage(
            "We could not generate every thumbnail option, so page 1 is being used. You can still upload a stronger cover image manually.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsGeneratingOptions(false);
        }
      }
    }

    void generateOptions();

    return () => {
      cancelled = true;
    };
  }, [badgeText, currentSelection, images, productId, regenerationNonce]);

  async function expandFiles(files: File[]) {
    const galleryImages = files.filter((file) => !isPdfFile(file));
    const pdfFiles = files.filter(isPdfFile);

    if (!pdfFiles.length) {
      return galleryImages;
    }

    const remainingSlots = MAX_PRODUCT_GALLERY_IMAGES - value.length - galleryImages.length;
    if (remainingSlots <= 0) {
      throw new Error(`Add up to ${MAX_PRODUCT_PREVIEW_IMAGES} preview images plus one cover image.`);
    }

    const renderedFiles: File[] = [];

    for (const pdfFile of pdfFiles) {
      if (pdfFile.size > PRODUCT_GALLERY_MAX_PDF_BYTES) {
        throw new Error("Preview PDFs must be under 20 MB.");
      }

      const availableSlots =
        MAX_PRODUCT_GALLERY_IMAGES - value.length - galleryImages.length - renderedFiles.length;
      if (availableSlots <= 0) {
        break;
      }

      const pages = await renderPdfPreviewImages({
        file: pdfFile,
        maxPages: Math.min(MAX_PRODUCT_PREVIEW_IMAGES, availableSlots),
      });

      if (!pages.length) {
        throw new Error("We could not turn that preview PDF into gallery pages.");
      }

      renderedFiles.push(...pages.slice(0, availableSlots));
    }

    return [...galleryImages, ...renderedFiles];
  }

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const sourceFiles = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (!sourceFiles.length) {
      return;
    }

    let localUrls: Record<string, string> = {};

    setIsUploading(true);
    setMessage("Preparing gallery images…");

    try {
      const files = await expandFiles(sourceFiles);
      localUrls = Object.fromEntries(files.map((file) => [file.name, URL.createObjectURL(file)]));
      const combinedFilesCount = value.length + files.length;

      if (combinedFilesCount > MAX_PRODUCT_GALLERY_IMAGES) {
        throw new Error(`Add up to ${MAX_PRODUCT_PREVIEW_IMAGES} preview images plus one cover image.`);
      }

      const validationError = validateProductGalleryFiles(files);
      if (validationError) {
        throw new Error(validationError);
      }

      setMessage("Uploading gallery images…");

      const formData = new FormData();
      formData.set("productId", productId);
      files.forEach((file) => formData.append("images", file));

      const response = await fetch("/api/lessonforge/product-gallery", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as {
        error?: string;
        images?: ProductGalleryImage[];
      };

      if (!response.ok || !payload.images) {
        throw new Error(payload.error || "Unable to upload gallery images.");
      }

      const uploadedImages = payload.images.map((image, index) => ({
        ...image,
        displayUrl:
          localUrls[files[index]?.name ?? ""] ??
          (index === 0 && value.length === 0 ? image.coverUrl : image.previewUrl),
      }));

      const nextLocalUrls = { ...localPreviewUrls };
      uploadedImages.forEach((image) => {
        nextLocalUrls[image.id] = image.displayUrl;
      });
      setLocalPreviewUrls(nextLocalUrls);
      updateGallery([...value, ...uploadedImages], currentSelection);
      setRegenerationNonce((current) => current + 1);
      setMessage(
        sourceFiles.some(isPdfFile)
          ? "Gallery images uploaded. Preview PDF pages were turned into real preview images."
          : "Gallery images uploaded.",
      );
    } catch (error) {
      Object.values(localUrls).forEach((url) => URL.revokeObjectURL(url));
      setMessage(
        error instanceof Error ? error.message : "Unable to upload gallery images right now.",
      );
    } finally {
      setIsUploading(false);
    }
  }

  function handleMove(imageId: string, direction: "up" | "down") {
    const currentIndex = images.findIndex((image) => image.id === imageId);
    const nextIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= images.length) {
      return;
    }

    updateGallery(reorderItems(images, currentIndex, nextIndex));
  }

  function handleRemove(imageId: string) {
    const nextImages = value.filter((image) => image.id !== imageId);
    const localUrl = localPreviewUrls[imageId];
    if (localUrl) {
      URL.revokeObjectURL(localUrl);
    }
    setLocalPreviewUrls((current) => {
      const next = { ...current };
      delete next[imageId];
      return next;
    });
    updateGallery(nextImages);
    setRegenerationNonce((current) => current + 1);
  }

  function handleDrop(targetId: string) {
    const draggingId = draggingIdRef.current;
    draggingIdRef.current = null;

    if (!draggingId || draggingId === targetId) {
      return;
    }

    const fromIndex = images.findIndex((image) => image.id === draggingId);
    const toIndex = images.findIndex((image) => image.id === targetId);

    if (fromIndex < 0 || toIndex < 0) {
      return;
    }

    updateGallery(reorderItems(images, fromIndex, toIndex));
  }

  function handleSelectThumbnail(selection: ProductThumbnailSelection) {
    updateGallery(images, selection);
    setMessage(`${THUMBNAIL_CARD_LABELS.get(selection.variant) ?? "Thumbnail"} selected for this draft.`);
  }

  return (
    <section className="rounded-[1.25rem] border border-black/5 bg-white p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-ink">Product image gallery</p>
          <p className="mt-1 text-sm leading-6 text-ink-soft">
            Put the cover image first, then add up to {MAX_PRODUCT_PREVIEW_IMAGES} interior preview images. You need 1 cover image and {MIN_PRODUCT_INTERIOR_PREVIEW_IMAGES} interior pages before publishing.
          </p>
        </div>
        <label
          className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-brand px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white"
          htmlFor={uploadInputId}
        >
          <ImagePlus className="h-4 w-4" />
          {isUploading ? "Uploading" : "Add images"}
          <input
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="sr-only"
            data-testid="seller-gallery-upload-input"
            id={uploadInputId}
            multiple
            onChange={handleUpload}
            type="file"
          />
        </label>
      </div>

      <div className="mt-3 rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-ink-soft">
        Cover image: {images.length > 0 ? "Ready" : "Still needed"} · Preview images:{" "}
        {Math.max(0, images.length - 1)}/{MAX_PRODUCT_PREVIEW_IMAGES}
      </div>

      {message ? <p className="mt-3 text-sm leading-6 text-ink-soft">{message}</p> : null}

      {images.length ? (
        <section className="mt-4 rounded-[1rem] border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-ink">Choose your marketplace thumbnail</p>
              <p className="mt-1 text-sm leading-6 text-ink-soft">
                Every option uses the real uploaded file. Pick the one that reads best on a small marketplace card.
              </p>
            </div>
            <button
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-ink transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isGeneratingOptions || !images.length}
              onClick={() => setRegenerationNonce((current) => current + 1)}
              type="button"
            >
              <RefreshCw className={`h-4 w-4 ${isGeneratingOptions ? "animate-spin" : ""}`} />
              {isGeneratingOptions ? "Generating" : "Regenerate options"}
            </button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {thumbnailOptions.map((option) => {
              const isSelected = selectionKey(currentSelection) === selectionKey(option.selection);
              return (
                <button
                  key={option.key}
                  className={`rounded-[1rem] border p-3 text-left transition ${
                    isSelected
                      ? "border-brand bg-white shadow-[0_12px_35px_rgba(37,99,235,0.12)]"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                  onClick={() => handleSelectThumbnail(option.selection)}
                  type="button"
                >
                  <div className="relative overflow-hidden rounded-[0.9rem] border border-slate-200 bg-white">
                    <div className="aspect-[4/5] w-full">
                      <ThumbnailOptionPreview option={option} />
                    </div>
                    {isSelected ? (
                      <div className="absolute right-3 top-3 rounded-full bg-brand p-1.5 text-white shadow-sm">
                        <Check className="h-4 w-4" />
                      </div>
                    ) : null}
                  </div>
                  <div className="mt-3">
                    <p className="text-sm font-semibold text-ink">{option.label}</p>
                    <p className="mt-1 text-xs leading-5 text-ink-soft">{option.description}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {!thumbnailOptions.length ? (
            <div className="mt-4 rounded-[0.9rem] border border-dashed border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-ink-soft">
              Upload a PDF or page images first. If automatic processing ever fails, you can still upload a dedicated cover image manually and place it first.
            </div>
          ) : null}
        </section>
      ) : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {images.map((image, index) => (
          <div
            key={image.id}
            className="rounded-[1rem] border border-slate-200 bg-slate-50 p-3"
            draggable
            onDragOver={(event) => event.preventDefault()}
            onDragStart={() => {
              draggingIdRef.current = image.id;
            }}
            onDrop={() => handleDrop(image.id)}
          >
            <div className="relative overflow-hidden rounded-[0.9rem] border border-slate-200 bg-white">
              <img
                alt={image.fileName}
                className="aspect-[4/5] w-full object-cover object-top"
                src={image.displayUrl}
              />
              <div className="absolute left-3 top-3 rounded-full bg-white/92 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink shadow-sm">
                {index === 0 ? "Cover" : `Preview ${index}`}
              </div>
            </div>
            <div className="mt-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{image.fileName}</p>
                <p className="mt-1 text-xs leading-5 text-ink-soft">
                  {index === 0 ? "Marketplace thumbnail source" : "Real interior preview image"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="rounded-full border border-slate-200 bg-white p-2 text-ink-soft transition hover:border-slate-300 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={index === 0}
                  onClick={() => handleMove(image.id, "up")}
                  type="button"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  className="rounded-full border border-slate-200 bg-white p-2 text-ink-soft transition hover:border-slate-300 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={index === images.length - 1}
                  onClick={() => handleMove(image.id, "down")}
                  type="button"
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
                <GripVertical className="h-4 w-4 text-ink-soft" />
                <button
                  className="rounded-full border border-slate-200 bg-white p-2 text-ink-soft transition hover:border-red-200 hover:text-red-600"
                  onClick={() => handleRemove(image.id)}
                  type="button"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
