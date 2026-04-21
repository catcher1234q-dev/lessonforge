"use client";

import { renderPdfPreviewImages } from "@/lib/lessonforge/pdf-preview-client";

export type PreviewImageDraft = {
  id: string;
  pageNumber: number;
  file: File;
  objectUrl: string;
};

const DEFAULT_PREVIEW_PAGE_COUNT = 4;

export async function buildPdfPreviewImageDrafts(input: {
  file: File;
  maxPages?: number;
}) {
  const previewFiles = await renderPdfPreviewImages({
    file: input.file,
    maxPages: input.maxPages ?? DEFAULT_PREVIEW_PAGE_COUNT,
  });

  return previewFiles.map<PreviewImageDraft>((file, index) => ({
    id: `preview-page-${index + 1}`,
    pageNumber: index + 1,
    objectUrl: URL.createObjectURL(file),
    file,
  }));
}

export function revokePreviewImageDrafts(previewImages: PreviewImageDraft[]) {
  for (const previewImage of previewImages) {
    URL.revokeObjectURL(previewImage.objectUrl);
  }
}
