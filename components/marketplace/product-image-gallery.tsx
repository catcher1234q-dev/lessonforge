"use client";

import { useMemo, useState } from "react";

type ProductImageGalleryProps = {
  title: string;
  coverImageUrl: string | null;
  previewImageUrls: string[];
  previewLabels?: string[];
  pageCount?: number;
};

export function ProductImageGallery({
  title,
  coverImageUrl,
  previewImageUrls,
  previewLabels,
  pageCount,
}: ProductImageGalleryProps) {
  const galleryImages = useMemo(() => {
    const items = [
      coverImageUrl ? { url: coverImageUrl, label: previewLabels?.[0] ?? "Preview page 1" } : null,
      ...previewImageUrls.map((url, index) => ({
        url,
        label: previewLabels?.[index] ?? `Preview page ${index + 1}`,
      })),
    ].filter((value): value is { url: string; label: string } => Boolean(value));

    const seen = new Set<string>();
    return items.filter((item) => {
      if (seen.has(item.url)) {
        return false;
      }

      seen.add(item.url);
      return true;
    });
  }, [coverImageUrl, previewImageUrls, previewLabels]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  if (!galleryImages.length) {
    return null;
  }

  const selectedImage = galleryImages[Math.min(selectedIndex, galleryImages.length - 1)]!;
  const selectedLabel = selectedImage.label;

  return (
    <>
      <div className="grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
        <button
          className="overflow-hidden rounded-[30px] border border-slate-200 bg-slate-100 shadow-[0_18px_50px_rgba(15,23,42,0.10)]"
          onClick={() => setIsLightboxOpen(true)}
          type="button"
        >
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 text-left">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand">
                {selectedLabel}
              </p>
              <p className="mt-1 text-sm font-medium text-ink-soft">
                Real page from the downloadable file
              </p>
            </div>
            {pageCount ? (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium text-ink-soft">
                {pageCount} PDF page{pageCount === 1 ? "" : "s"}
              </span>
            ) : null}
          </div>
          <img
            alt={`${title} preview ${selectedIndex + 1}`}
            className="h-full max-h-[860px] w-full bg-slate-100 object-contain"
            decoding="async"
            loading="eager"
            sizes="(min-width: 1024px) 60vw, 100vw"
            src={selectedImage.url}
          />
        </button>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          {galleryImages.map((image, index) => (
            <button
              key={`${image.url}-${index}`}
              className={`group overflow-hidden rounded-[24px] border bg-white text-left shadow-[0_12px_30px_rgba(15,23,42,0.06)] transition hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(15,23,42,0.10)] ${
                index === selectedIndex ? "border-brand" : "border-slate-200"
              }`}
              onClick={() => setSelectedIndex(index)}
              type="button"
            >
              <div className="overflow-hidden bg-slate-100">
                <img
                  alt={`${title} gallery image ${index + 1}`}
                  className="h-52 w-full bg-slate-100 object-contain p-2 transition duration-300 group-hover:scale-[1.02]"
                  decoding="async"
                  loading="lazy"
                  sizes="(min-width: 1024px) 28vw, (min-width: 640px) 33vw, 100vw"
                  src={image.url}
                />
              </div>
              <div className="p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand">
                  {image.label}
                </p>
                <p className="mt-2 text-sm font-semibold leading-6 text-ink">
                  Page {Math.min(index + 1, galleryImages.length)} preview
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {isLightboxOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-8"
          onClick={() => setIsLightboxOpen(false)}
        >
          <div className="max-h-full max-w-6xl overflow-hidden rounded-[28px] border border-white/10 bg-slate-950 shadow-[0_24px_80px_rgba(15,23,42,0.45)]">
            <div className="border-b border-white/10 px-5 py-4 text-left">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-200">
                {selectedLabel}
              </p>
              <p className="mt-1 text-sm text-white/70">
                Preview image exported from the actual download file
              </p>
            </div>
            <img
              alt={`${title} enlarged preview ${selectedIndex + 1}`}
              className="max-h-[88vh] w-full bg-slate-950 object-contain"
              src={selectedImage.url}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
