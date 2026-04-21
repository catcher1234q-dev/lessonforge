export type ExtractedPdfText = {
  textContent: string;
  pageCount: number;
};

const DEFAULT_MAX_PAGES = 6;
const DEFAULT_MAX_CHARACTERS = 16_000;

function normalizeExtractedText(value: string, maxCharacters: number) {
  return value
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxCharacters);
}

export async function extractPdfText(input: {
  bytes: Uint8Array;
  maxPages?: number;
  maxCharacters?: number;
}): Promise<ExtractedPdfText> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loadingTask = pdfjs.getDocument({
    data: input.bytes,
    disableWorker: true,
    isEvalSupported: false,
    useSystemFonts: true,
  } as never);

  const document = await loadingTask.promise;
  const maxPages = Math.max(1, input.maxPages ?? DEFAULT_MAX_PAGES);
  const maxCharacters = Math.max(500, input.maxCharacters ?? DEFAULT_MAX_CHARACTERS);
  const pageCount = document.numPages;
  const textParts: string[] = [];

  try {
    const pagesToScan = Math.min(pageCount, maxPages);

    for (let pageNumber = 1; pageNumber <= pagesToScan; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ");

      if (pageText.trim()) {
        textParts.push(pageText.trim());
      }

      page.cleanup?.();

      if (textParts.join(" ").length >= maxCharacters) {
        break;
      }
    }
  } finally {
    document.cleanup?.();
    document.destroy?.();
    loadingTask.destroy?.();
  }

  return {
    textContent: normalizeExtractedText(textParts.join(" "), maxCharacters),
    pageCount,
  };
}
