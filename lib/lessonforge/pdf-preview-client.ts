"use client";

const MAX_RENDER_WIDTH = 1400;

function baseName(fileName: string) {
  return fileName.replace(/\.[^.]+$/, "") || "preview";
}

function blobFromCanvas(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
        return;
      }

      reject(new Error("Unable to render preview pages from that PDF."));
    }, "image/jpeg", 0.92);
  });
}

export async function renderPdfPreviewImages(input: {
  file: File;
  maxPages: number;
}) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const bytes = new Uint8Array(await input.file.arrayBuffer());
  const loadingTask = pdfjs.getDocument({
    data: bytes,
    disableWorker: true,
    isEvalSupported: false,
    useSystemFonts: true,
  } as any);

  const pdfDocument = await loadingTask.promise;
  const previewFiles: File[] = [];

  try {
    const pageCount = Math.min(pdfDocument.numPages, input.maxPages);

    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
      const page = await pdfDocument.getPage(pageNumber);
      const firstViewport = page.getViewport({ scale: 1 });
      const scale = Math.max(1, Math.min(2, MAX_RENDER_WIDTH / firstViewport.width));
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error("Unable to prepare preview rendering.");
      }

      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);

      await page.render({
        canvasContext: context,
        canvas,
        viewport,
      } as any).promise;

      const blob = await blobFromCanvas(canvas);
      previewFiles.push(
        new File([blob], `${baseName(input.file.name)}-page-${pageNumber}.jpg`, {
          type: "image/jpeg",
          lastModified: input.file.lastModified,
        }),
      );

      page.cleanup?.();
      canvas.width = 0;
      canvas.height = 0;
    }
  } finally {
    pdfDocument.cleanup?.();
    pdfDocument.destroy?.();
    loadingTask.destroy?.();
  }

  return previewFiles;
}
