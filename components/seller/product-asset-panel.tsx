import Link from "next/link";

import {
  buildManagedPreviewAssets,
  buildStoredAssetPaths,
  renderManagedThumbnailSvg,
} from "@/lib/lessonforge/preview-assets";

type ProductAssetPanelProps = {
  productId: string;
  title: string;
  subject: string;
  gradeBand: string;
  format: string;
  summary: string;
  previewIncluded: boolean;
  thumbnailIncluded: boolean;
  assetVersionNumber?: number;
  previewAssetUrls?: string[];
  originalAssetUrl?: string;
  className?: string;
};

export function ProductAssetPanel({
  productId,
  title,
  subject,
  gradeBand,
  format,
  summary,
  previewIncluded,
  thumbnailIncluded,
  assetVersionNumber,
  previewAssetUrls,
  originalAssetUrl,
  className,
}: ProductAssetPanelProps) {
  const thumbnailPreviewSvg = renderManagedThumbnailSvg({
    title: title || "Untitled resource",
    subject,
    gradeBand,
    format,
  });
  const storedPaths = buildStoredAssetPaths({
    productId,
    title: title || "untitled-resource",
    format,
  });
  const previewAssets = buildManagedPreviewAssets({
    productId,
    title: title || "Untitled resource",
    subject,
    format,
    previewUrls: previewAssetUrls?.length ? previewAssetUrls : storedPaths.previewUrls,
  });
  const versionNumber = assetVersionNumber ?? storedPaths.assetVersionNumber;
  const protectedOriginalUrl = originalAssetUrl ?? storedPaths.originalUrl;
  const thumbnailPreviewUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(thumbnailPreviewSvg)}`;

  return (
    <section
      className={`rounded-[28px] border border-black/5 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] ${className ?? ""}`}
    >
      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand">
        Buyer preview check
      </p>
      <h2 className="mt-3 text-2xl font-semibold text-ink">What buyers will see first</h2>
      <p className="mt-3 text-sm leading-7 text-ink-soft">
        Check the preview pages, cover image, and delivery summary before you publish.
      </p>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <article className="rounded-[1.4rem] bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-soft">
            Preview set
          </p>
          <p className="mt-2 text-base font-semibold text-ink">
            {previewIncluded ? "Ready" : "Still needed"}
          </p>
          <p className="mt-1 text-sm leading-6 text-ink-soft">
            {previewAssets.length} preview page{previewAssets.length === 1 ? "" : "s"} ready to open.
          </p>
        </article>

        <article className="rounded-[1.4rem] bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-soft">
            Thumbnail
          </p>
          <p className="mt-2 text-base font-semibold text-ink">
            {thumbnailIncluded ? "Ready" : "Still needed"}
          </p>
          <p className="mt-1 text-sm leading-6 text-ink-soft">
            Used in browse and storefront cards.
          </p>
        </article>

        <article className="rounded-[1.4rem] bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-soft">
            Delivery
          </p>
          <p className="mt-2 text-base font-semibold text-ink">Version {versionNumber}</p>
          <p className="mt-1 text-sm leading-6 text-ink-soft">
            Protected file delivery after purchase.
          </p>
        </article>
      </div>

      <div className="mt-5 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-ink">Preview pages</p>
            <p className="mt-1 text-sm leading-6 text-ink-soft">
              These are the public pages buyers can open before purchase.
            </p>
          </div>
          <p className="text-xs uppercase tracking-[0.18em] text-ink-soft">{format}</p>
        </div>

        <div className="mt-4 grid gap-2.5">
          {previewAssets.map((asset) => (
            <div
              key={asset.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-[1rem] border border-slate-200 bg-white px-4 py-3"
            >
              <div>
                <p className="text-sm font-semibold text-ink">{asset.label}</p>
                <p className="mt-1 text-xs leading-5 text-ink-soft">{asset.pageRangeLabel}</p>
              </div>
              <Link
                className="inline-flex rounded-full bg-brand-soft px-4 py-2 text-xs font-semibold text-brand transition hover:bg-brand/15"
                href={asset.previewUrl}
                target="_blank"
              >
                Open preview
              </Link>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-ink">Thumbnail preview</p>
            <p className="mt-1 text-sm leading-6 text-ink-soft">
              This is the cover image buyers will notice first.
            </p>
          </div>
          <a
            className="inline-flex rounded-full bg-brand px-4 py-2 text-xs font-semibold text-white transition hover:bg-brand-700"
            href={thumbnailPreviewUrl}
            rel="noreferrer"
            target="_blank"
          >
            Open thumbnail
          </a>
        </div>
        <div className="mt-4 rounded-[24px] border border-slate-200 bg-white p-3">
          <img
            alt={`${title} thumbnail preview`}
            className="h-auto w-full rounded-[18px] border border-slate-100 object-cover"
            decoding="async"
            loading="lazy"
            sizes="(min-width: 768px) 560px, 100vw"
            src={thumbnailPreviewUrl}
          />
        </div>
        <p className="mt-3 text-xs leading-5 text-ink-soft">
          This opens safely even before the listing is saved, so you can judge the cover look right away.
        </p>
      </div>

      <div className="mt-5 rounded-[1.5rem] border border-slate-200 bg-white px-5 py-4 text-sm leading-6 text-ink-soft">
        <span className="font-semibold text-ink">After purchase:</span> buyers receive the full file from{" "}
        <span className="break-all">{protectedOriginalUrl}</span>.
      </div>

      <div className="mt-5 rounded-[1.5rem] bg-slate-950 px-5 py-4 text-sm leading-6 text-white/80">
        <span className="font-semibold text-white">Current buyer summary:</span>{" "}
        {summary || "Add a stronger description so buyers understand what is included and why it is worth opening."}
      </div>
    </section>
  );
}
