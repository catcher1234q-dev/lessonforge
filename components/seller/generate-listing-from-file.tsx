"use client";

import {
  startTransition,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { CheckCircle2, RefreshCw, Sparkles, Wand2 } from "lucide-react";

import {
  buildPdfPreviewImageDrafts,
  revokePreviewImageDrafts,
  type PreviewImageDraft,
} from "@/lib/lessonforge/file-preview-images";
import {
  generateThumbnailOptions,
  revokeGeneratedThumbnailOptions,
  type GeneratedThumbnailOption,
} from "@/lib/lessonforge/thumbnail-generator";
import type { AIProviderResult, ProductGalleryImage, SellerProfileDraft } from "@/types";

type GeneratedListingSuggestion = {
  titleOptions: string[];
  shortDescription: string;
  fullDescriptionOptions: string[];
  tags: string[];
  subject: string;
  gradeBand: string;
  standardsTag: string;
  standardsConfidence: string;
  standardsRationale: string;
};

type StoredOriginalFile = {
  storagePath: string;
  pointer: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
};

type GenerateListingFromFileProps = {
  productId: string;
  file: File | null;
  sellerId?: string;
  sellerEmail?: string;
  sellerPlanKey?: SellerProfileDraft["sellerPlanKey"];
  currentTitle: string;
  currentDescription: string;
  onApplySelection: (input: {
    title: string;
    shortDescription: string;
    fullDescription: string;
    subject: string;
    gradeBand: string;
    tags: string[];
    standardsResult: AIProviderResult | null;
    pageCount: number;
    imageGallery: ProductGalleryImage[];
    originalAssetUrl: string;
    fileTypes: string[];
    includedItems: string[];
    previewLabels: string[];
    previewPages: number[];
  }) => void;
};

function buildStandardsResult(suggestion: GeneratedListingSuggestion): AIProviderResult | null {
  if (!suggestion.standardsTag) {
    return null;
  }

  return {
    provider: "gemini",
    status: "success",
    message: "Generated from file.",
    subject: suggestion.subject,
    suggestedStandard: suggestion.standardsTag,
    rationale:
      suggestion.standardsRationale || "Gemini found a strong standards match in the uploaded file.",
    confidence: suggestion.standardsConfidence || "High",
  };
}

function selectionKey(input: {
  titleIndex: number;
  descriptionIndex: number;
  thumbnailId: string | null;
}) {
  return `${input.titleIndex}:${input.descriptionIndex}:${input.thumbnailId ?? "none"}`;
}

function buildIncludedItems(pageCount: number) {
  return [
    `Original PDF resource (${pageCount} page${pageCount === 1 ? "" : "s"})`,
    "Teacher-facing listing summary",
    "Real preview pages pulled from the uploaded file",
  ];
}

function isPdfFile(file: File | null) {
  if (!file) {
    return false;
  }

  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

export function GenerateListingFromFile({
  productId,
  file,
  sellerId,
  sellerEmail,
  sellerPlanKey,
  currentTitle,
  currentDescription,
  onApplySelection,
}: GenerateListingFromFileProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<GeneratedListingSuggestion | null>(null);
  const [storedFile, setStoredFile] = useState<StoredOriginalFile | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [previewDrafts, setPreviewDrafts] = useState<PreviewImageDraft[]>([]);
  const [thumbnailOptions, setThumbnailOptions] = useState<GeneratedThumbnailOption[]>([]);
  const [selectedTitleIndex, setSelectedTitleIndex] = useState(0);
  const [selectedDescriptionIndex, setSelectedDescriptionIndex] = useState(0);
  const [selectedThumbnailId, setSelectedThumbnailId] = useState<string | null>(null);
  const [textVariationSeed, setTextVariationSeed] = useState(0);
  const [thumbnailVariationSeed, setThumbnailVariationSeed] = useState(0);
  const [appliedSelection, setAppliedSelection] = useState<string | null>(null);
  const autoApplyRef = useRef(false);

  useEffect(() => {
    return () => {
      revokePreviewImageDrafts(previewDrafts);
      revokeGeneratedThumbnailOptions(thumbnailOptions);
    };
  }, [previewDrafts, thumbnailOptions]);

  useEffect(() => {
    autoApplyRef.current = false;
    setSuggestion(null);
    setStoredFile(null);
    setPageCount(0);
    setSelectedTitleIndex(0);
    setSelectedDescriptionIndex(0);
    setSelectedThumbnailId(null);
    setTextVariationSeed(0);
    setThumbnailVariationSeed(0);
    setAppliedSelection(null);
    setMessage(null);
    revokePreviewImageDrafts(previewDrafts);
    setPreviewDrafts([]);
    revokeGeneratedThumbnailOptions(thumbnailOptions);
    setThumbnailOptions([]);
  }, [file]);

  const selectedTitle =
    suggestion?.titleOptions[selectedTitleIndex] ??
    suggestion?.titleOptions[0] ??
    currentTitle;
  const selectedDescription =
    suggestion?.fullDescriptionOptions[selectedDescriptionIndex] ??
    suggestion?.fullDescriptionOptions[0] ??
    currentDescription;
  const pdfReady = isPdfFile(file);
  const activeThumbnail =
    thumbnailOptions.find((option) => option.id === selectedThumbnailId) ?? thumbnailOptions[0] ?? null;
  const currentSelection = useMemo(
    () =>
      selectionKey({
        titleIndex: selectedTitleIndex,
        descriptionIndex: selectedDescriptionIndex,
        thumbnailId: activeThumbnail?.id ?? null,
      }),
    [activeThumbnail?.id, selectedDescriptionIndex, selectedTitleIndex],
  );

  useEffect(() => {
    let cancelled = false;

    async function regenerateThumbnailChoices() {
      if (!suggestion || previewDrafts.length === 0) {
        return;
      }

      revokeGeneratedThumbnailOptions(thumbnailOptions);
      setThumbnailOptions([]);
      setSelectedThumbnailId(null);

      try {
        const nextOptions = await generateThumbnailOptions({
          title: selectedTitle,
          subject: suggestion.subject,
          gradeBand: suggestion.gradeBand,
          previewPages: previewDrafts,
          variantSeed: thumbnailVariationSeed,
        });

        if (cancelled) {
          revokeGeneratedThumbnailOptions(nextOptions);
          return;
        }

        startTransition(() => {
          setThumbnailOptions(nextOptions);
          setSelectedThumbnailId(nextOptions[0]?.id ?? null);
        });
      } catch (error) {
        if (!cancelled) {
          setMessage(
            error instanceof Error
              ? error.message
              : "We could not build thumbnail choices from that PDF.",
          );
        }
      }
    }

    void regenerateThumbnailChoices();

    return () => {
      cancelled = true;
    };
  }, [previewDrafts, selectedTitle, suggestion, thumbnailVariationSeed]);

  useEffect(() => {
    if (!suggestion || !storedFile || !activeThumbnail || previewDrafts.length === 0) {
      return;
    }

    if (autoApplyRef.current) {
      return;
    }

    autoApplyRef.current = true;
    void applySelection();
  }, [activeThumbnail, previewDrafts.length, storedFile, suggestion]);

  async function generateListing() {
    if (!file || !sellerId || !sellerEmail || !sellerPlanKey) {
      setMessage("Finish seller onboarding and add a PDF before generating a listing.");
      return;
    }

    if (!pdfReady) {
      setMessage("Generate Listing From File currently supports PDF uploads only.");
      return;
    }

    setIsGenerating(true);
    setMessage("Reading the PDF, generating listing options, and building thumbnail choices…");

    try {
      const [previewPages, response] = await Promise.all([
        buildPdfPreviewImageDrafts({ file, maxPages: 4 }),
        (async () => {
          const formData = new FormData();
          formData.set("productId", productId);
          formData.set("sellerId", sellerId);
          formData.set("sellerEmail", sellerEmail);
          formData.set("sellerPlanKey", sellerPlanKey);
          formData.set("currentTitle", currentTitle);
          formData.set("currentDescription", currentDescription);
          formData.set("variationSeed", String(textVariationSeed));
          formData.set("file", file);

          const nextResponse = await fetch("/api/lessonforge/ai/generate-listing", {
            method: "POST",
            body: formData,
          });
          const payload = (await nextResponse.json()) as {
            error?: string;
            suggestion?: GeneratedListingSuggestion;
            storedFile?: StoredOriginalFile;
            pageCount?: number;
          };

          if (!nextResponse.ok || !payload.suggestion || !payload.storedFile) {
            throw new Error(payload.error || "We could not generate a listing from that PDF.");
          }

          return payload;
        })(),
      ]);

      revokePreviewImageDrafts(previewDrafts);
      setPreviewDrafts(previewPages);
      setSuggestion(response.suggestion ?? null);
      setStoredFile(response.storedFile ?? null);
      setPageCount(response.pageCount ?? 0);
      setSelectedTitleIndex(0);
      setSelectedDescriptionIndex(0);
      setAppliedSelection(null);
      setMessage("Review the generated thumbnails, titles, and descriptions before publishing.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "We could not generate a listing from that PDF.",
      );
    } finally {
      setIsGenerating(false);
    }
  }

  async function applySelection() {
    if (!suggestion || !storedFile || !activeThumbnail || previewDrafts.length === 0) {
      return;
    }

    setIsApplying(true);
    setMessage("Applying the selected thumbnail and listing details…");

    try {
      const formData = new FormData();
      formData.set("productId", productId);
      formData.set("coverImage", activeThumbnail.file);
      previewDrafts.slice(0, 4).forEach((page) => {
        formData.append("previewImages", page.file);
      });

      const response = await fetch("/api/lessonforge/generated-listing-assets", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as {
        error?: string;
        images?: ProductGalleryImage[];
      };

      if (!response.ok || !payload.images) {
        throw new Error(payload.error || "We could not save the generated thumbnail choice.");
      }

      onApplySelection({
        title: selectedTitle,
        shortDescription: suggestion.shortDescription,
        fullDescription: selectedDescription,
        subject: suggestion.subject,
        gradeBand: suggestion.gradeBand,
        tags: suggestion.tags,
        standardsResult: buildStandardsResult(suggestion),
        pageCount,
        imageGallery: payload.images,
        originalAssetUrl: storedFile.pointer,
        fileTypes: ["PDF"],
        includedItems: buildIncludedItems(pageCount),
        previewLabels: previewDrafts.slice(0, 4).map((page) => `Preview page ${page.pageNumber}`),
        previewPages: previewDrafts.slice(0, 4).map((page) => page.pageNumber),
      });
      setAppliedSelection(currentSelection);
      setMessage("Generated listing applied. You can still edit every field below before publishing.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "We could not apply the generated listing details.",
      );
    } finally {
      setIsApplying(false);
    }
  }

  return (
    <section className="rounded-[1rem] border border-brand/10 bg-brand-soft/30 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand">
            Generate Listing From File
          </p>
          <p className="mt-1 text-sm leading-6 text-ink-soft">
            Upload one PDF, generate marketplace-ready listing options, and choose the thumbnail
            that best fits the real pages in your resource.
          </p>
        </div>
        <button
          className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-brand disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isGenerating || !pdfReady}
          onClick={() => {
            void generateListing();
          }}
          type="button"
        >
          {isGenerating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {isGenerating ? "Generating" : "Generate listing from file"}
        </button>
      </div>

      <div className="mt-3 rounded-[0.95rem] bg-white px-4 py-3 text-sm leading-6 text-ink-soft">
        {file
          ? pdfReady
            ? "PDF only for the first release. The generated thumbnails use real pages from the uploaded PDF."
            : "This first release only supports PDF uploads. PPTX and image files can still use the normal manual listing flow."
          : "Upload a PDF in Step 1 to unlock generated listing options."}
      </div>

      {message ? (
        <p className="mt-3 text-sm leading-6 text-ink-soft">{message}</p>
      ) : null}

      {suggestion ? (
        <div className="mt-4 space-y-4 rounded-[1rem] border border-black/5 bg-white p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-ink">Review generated options</p>
              <p className="mt-1 text-sm leading-6 text-ink-soft">
                Choose the thumbnail first, then the title and description you want to edit.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-ink transition hover:border-slate-300"
                disabled={isGenerating || !pdfReady}
                onClick={() => {
                  setTextVariationSeed((current) => current + 1);
                  void generateListing();
                }}
                type="button"
              >
                <RefreshCw className="h-4 w-4" />
                Regenerate text
              </button>
              <button
                className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-ink transition hover:border-slate-300"
                disabled={previewDrafts.length === 0}
                onClick={() => {
                  setThumbnailVariationSeed((current) => current + 1);
                }}
                type="button"
              >
                <Wand2 className="h-4 w-4" />
                Regenerate thumbnails
              </button>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-ink">1. Choose a thumbnail</p>
            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              {thumbnailOptions.map((option) => {
                const isSelected = option.id === (selectedThumbnailId ?? thumbnailOptions[0]?.id);
                return (
                  <button
                    key={option.id}
                    className={`rounded-[1rem] border p-3 text-left transition ${
                      isSelected
                        ? "border-brand bg-brand-soft/25"
                        : "border-black/5 bg-surface-subtle hover:border-brand/30"
                    }`}
                    onClick={() => setSelectedThumbnailId(option.id)}
                    type="button"
                  >
                    <img
                      alt={option.label}
                      className="aspect-[4/3] w-full rounded-[0.85rem] object-cover"
                      loading="lazy"
                      src={option.objectUrl}
                    />
                    <p className="mt-3 text-sm font-semibold text-ink">{option.label}</p>
                    <p className="mt-1 text-xs leading-5 text-ink-soft">
                      Uses page{option.pageNumbers.length === 1 ? "" : "s"} {option.pageNumbers.join(", ")} from the uploaded PDF.
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <p className="text-sm font-semibold text-ink">2. Choose a title</p>
              <div className="mt-3 space-y-2">
                {suggestion.titleOptions.map((option, index) => (
                  <button
                    key={`${option}-${index}`}
                    className={`w-full rounded-[0.95rem] border px-4 py-3 text-left text-sm leading-6 transition ${
                      index === selectedTitleIndex
                        ? "border-brand bg-brand-soft/25 text-ink"
                        : "border-black/5 bg-surface-subtle text-ink-soft hover:border-brand/30"
                    }`}
                    onClick={() => setSelectedTitleIndex(index)}
                    type="button"
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-ink">3. Choose a full description</p>
              <div className="mt-3 space-y-2">
                {suggestion.fullDescriptionOptions.map((option, index) => (
                  <button
                    key={`description-${index}`}
                    className={`w-full rounded-[0.95rem] border px-4 py-3 text-left text-sm leading-6 transition ${
                      index === selectedDescriptionIndex
                        ? "border-brand bg-brand-soft/25 text-ink"
                        : "border-black/5 bg-surface-subtle text-ink-soft hover:border-brand/30"
                    }`}
                    onClick={() => setSelectedDescriptionIndex(index)}
                    type="button"
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-[0.95rem] border border-black/5 bg-surface-subtle p-4">
              <p className="text-sm font-semibold text-ink">Short description</p>
              <p className="mt-2 text-sm leading-6 text-ink-soft">{suggestion.shortDescription}</p>
            </div>
            <div className="rounded-[0.95rem] border border-black/5 bg-surface-subtle p-4">
              <p className="text-sm font-semibold text-ink">Generated suggestions</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink-soft">
                  {suggestion.subject}
                </span>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink-soft">
                  {suggestion.gradeBand}
                </span>
                {suggestion.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink-soft"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              {suggestion.standardsTag ? (
                <p className="mt-3 text-sm leading-6 text-ink-soft">
                  Standards suggestion: <span className="font-semibold text-ink">{suggestion.standardsTag}</span> ({suggestion.standardsConfidence})
                </p>
              ) : (
                <p className="mt-3 text-sm leading-6 text-ink-soft">
                  Standards stayed blank because confidence was not high enough.
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm leading-6 text-ink-soft">
              {appliedSelection === currentSelection ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Using these selections
                </span>
              ) : (
                <span>Select a new option, then apply it to the editable listing fields below.</span>
              )}
            </div>
            <button
              className="inline-flex items-center justify-center gap-2 rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isApplying || !activeThumbnail}
              onClick={() => {
                void applySelection();
              }}
              type="button"
            >
              {isApplying ? "Applying selection" : "Use selected options"}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
