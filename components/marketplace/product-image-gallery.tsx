"use client";

import { useMemo, useState } from "react";

type ProductImageGalleryProps = {
  title: string;
  coverImageUrl: string | null;
  previewImageUrls: string[];
};

export function ProductImageGallery({
  title,
  coverImageUrl,
  previewImageUrls,
}: ProductImageGalleryProps) {
  const galleryImages = useMemo(
    () => [coverImageUrl, ...previewImageUrls].filter((value): value is string => Boolean(value)),
    [coverImageUrl, previewImageUrls],
  );
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  if (!galleryImages.length) {
    return null;
  }

  const selectedImage = galleryImages[Math.min(selectedIndex, galleryImages.length - 1)]!;

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <button
          className="overflow-hidden rounded-[28px] border border-slate-200 bg-slate-100 shadow-[0_16px_40px_rgba(15,23,42,0.08)]"
          onClick={() => setIsLightboxOpen(true)}
          type="button"
        >
          <img
            alt={`${title} preview ${selectedIndex + 1}`}
            className="h-full max-h-[760px] w-full bg-slate-100 object-contain"
            decoding="async"
            loading="eager"
            sizes="(min-width: 1024px) 60vw, 100vw"
            src={selectedImage}
          />
        </button>

        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
          {galleryImages.map((imageUrl, index) => (
            <button
              key={`${imageUrl}-${index}`}
              className={`group overflow-hidden rounded-[24px] border bg-white text-left shadow-[0_12px_30px_rgba(15,23,42,0.06)] transition hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(15,23,42,0.10)] ${
                index === selectedIndex ? "border-brand" : "border-slate-200"
              }`}
              onClick={() => setSelectedIndex(index)}
              type="button"
            >
              <div className="overflow-hidden bg-slate-100">
                <img
                  alt={`${title} gallery image ${index + 1}`}
                  className="h-44 w-full bg-slate-100 object-contain p-2 transition duration-300 group-hover:scale-[1.02]"
                  decoding="async"
                  loading="lazy"
                  sizes="(min-width: 1024px) 28vw, (min-width: 640px) 33vw, 100vw"
                  src={imageUrl}
                />
              </div>
              <div className="p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand">
                  {index === 0 ? "Cover image" : `Preview image ${index}`}
                </p>
                <p className="mt-2 text-sm font-semibold leading-6 text-ink">
                  {index === 0 ? "Marketplace cover" : "Watermarked preview"}
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
            <img
              alt={`${title} enlarged preview ${selectedIndex + 1}`}
              className="max-h-[88vh] w-full bg-slate-950 object-contain"
              src={selectedImage}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
