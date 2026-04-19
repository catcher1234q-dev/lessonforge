"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { ArrowDown, ArrowUp, GripVertical, ImagePlus, Trash2 } from "lucide-react";

import {
  MIN_PRODUCT_INTERIOR_PREVIEW_IMAGES,
  MAX_PRODUCT_GALLERY_IMAGES,
  MAX_PRODUCT_PREVIEW_IMAGES,
  PRODUCT_GALLERY_MAX_PDF_BYTES,
  normalizeProductGallery,
  validateProductGalleryFiles,
} from "@/lib/lessonforge/product-gallery";
import { renderPdfPreviewImages } from "@/lib/lessonforge/pdf-preview-client";
import type { ProductGalleryImage } from "@/types";

type ProductImageGalleryManagerProps = {
  productId: string;
  value: ProductGalleryImage[];
  onChange: (images: ProductGalleryImage[]) => void;
};

type GalleryDisplayImage = ProductGalleryImage & {
  displayUrl: string;
};

function reorderItems<T>(items: T[], fromIndex: number, toIndex: number) {
  const nextItems = [...items];
  const [moved] = nextItems.splice(fromIndex, 1);
  nextItems.splice(toIndex, 0, moved);
  return nextItems;
}

function isPdfFile(file: File) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

export function ProductImageGalleryManager({
  productId,
  value,
  onChange,
}: ProductImageGalleryManagerProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [localPreviewUrls, setLocalPreviewUrls] = useState<Record<string, string>>({});
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
      })),
    [localPreviewUrls, productId, value],
  );

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

      const availableSlots = MAX_PRODUCT_GALLERY_IMAGES - value.length - galleryImages.length - renderedFiles.length;
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

    const localUrls = Object.fromEntries(
      sourceFiles
        .filter((file) => !isPdfFile(file))
        .map((file) => [
        file.name,
        URL.createObjectURL(file),
      ]),
    );

    setIsUploading(true);
    setMessage("Preparing gallery images…");

    try {
      const files = await expandFiles(sourceFiles);
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
      onChange(normalizeProductGallery(productId, [...value, ...uploadedImages]));
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

    onChange(normalizeProductGallery(productId, reorderItems(images, currentIndex, nextIndex)));
  }

  function handleRemove(imageId: string) {
    const nextImages = normalizeProductGallery(
      productId,
      value.filter((image) => image.id !== imageId),
    );
    const localUrl = localPreviewUrls[imageId];
    if (localUrl) {
      URL.revokeObjectURL(localUrl);
    }
    setLocalPreviewUrls((current) => {
      const next = { ...current };
      delete next[imageId];
      return next;
    });
    onChange(nextImages);
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

    onChange(normalizeProductGallery(productId, reorderItems(images, fromIndex, toIndex)));
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
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-brand px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white">
          <ImagePlus className="h-4 w-4" />
          {isUploading ? "Uploading" : "Add images"}
          <input
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="hidden"
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

      {message ? (
        <p className="mt-3 text-sm leading-6 text-ink-soft">{message}</p>
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
                  {index === 0
                    ? "Marketplace thumbnail"
                    : "Watermarked interior preview image"}
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
