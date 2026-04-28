"use client";

import { useEffect, useId, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { AlertCircle, ArrowRight, CheckCircle2, FileUp, Lock } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { trackFunnelEvent } from "@/lib/analytics/events";
import { ProductImageGalleryManager } from "@/components/seller/product-image-gallery-manager";
import { normalizePlanKey, planConfig } from "@/lib/config/plans";
import { ProductAssetPanel } from "@/components/seller/product-asset-panel";
import {
  MIN_PRODUCT_INTERIOR_PREVIEW_IMAGES,
  normalizeProductGallery,
} from "@/lib/lessonforge/product-gallery";
import {
  getAiUpgradeMessage,
  getLockedFeatureMessage,
} from "@/lib/lessonforge/plan-enforcement";
import {
  getListingAssistFieldPlan,
  getSellerCreateStep1AiUiState,
  STEP_1_AI_BUTTON_LABEL,
} from "@/lib/lessonforge/seller-create-ai-ui";
import { buildSellerPlanCheckoutHref } from "@/lib/stripe/seller-plan-billing";
import { canAffordAiAction, getAiCreditCost } from "@/lib/services/ai/credits";
import type {
  AdminAiSettings,
  AIProviderResult,
  ConnectedSeller,
  ProductGalleryImage,
  ProductRecord,
  SellerProfileDraft,
} from "@/types";

const standardsScanCost = getAiCreditCost("standardsScan");
const SELLER_FLOW_AI_PROVIDER = "gemini" as const;

type CreatorAiAction = "autofill" | "title" | "description" | "tags" | "standards";
type ListingAssistAction = "autofill" | "title" | "description" | "tags";
type AiFieldKey =
  | "title"
  | "shortDescription"
  | "fullDescription"
  | "subject"
  | "gradeBand"
  | "tags"
  | "standards";
type AiFieldStatus = "filled" | "suggested";
type ListingAssistResponse = {
  provider: "openai" | "gemini";
  status: "success" | "partial";
  message: string;
  title: string;
  shortDescription: string;
  fullDescription: string;
  subject: string;
  gradeBand: string;
  tags: string[];
};

type SellerAiUploadPayload = {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  textContent?: string;
  base64Data?: string;
};

type SellerAiUploadResult =
  | { status: "ready"; upload: SellerAiUploadPayload }
  | { status: "error"; message: string };

const AI_GENERIC_FAILURE_MESSAGE = "AI could not finish this right now. Try again.";
const AI_TEMPORARY_UNAVAILABLE_MESSAGE = "AI is temporarily unavailable right now.";
const AI_ONBOARDING_REQUIRED_MESSAGE = "Finish seller onboarding before using Fill with AI.";
const AI_UPLOAD_REQUIRED_MESSAGE = "Upload a resource before using Fill with AI.";
const AI_STANDARDS_UPLOAD_REQUIRED_MESSAGE = "Upload a resource before scanning standards.";

const AI_BINARY_UPLOAD_LIMIT_BYTES = 4_500_000;
const AI_TEXT_UPLOAD_LIMIT_BYTES = 1_000_000;
const AI_TEXT_CONTENT_LIMIT = 16_000;

function canUseTextExtraction(file: File) {
  return (
    file.type.startsWith("text/") ||
    [
      "application/json",
      "application/ld+json",
      "text/csv",
      "application/csv",
      "application/xml",
      "text/xml",
    ].includes(file.type) ||
    /\.(txt|md|csv|json|xml)$/i.test(file.name)
  );
}

function canUseBinaryUpload(file: File) {
  return (
    file.type === "application/pdf" ||
    file.type.startsWith("image/") ||
    /\.(pdf|png|jpg|jpeg|webp)$/i.test(file.name)
  );
}

function encodeBase64(bytes: Uint8Array) {
  let binary = "";

  for (let index = 0; index < bytes.length; index += 0x8000) {
    const chunk = bytes.subarray(index, index + 0x8000);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

async function buildSellerAiUploadPayload(file?: File): Promise<SellerAiUploadResult> {
  try {
    if (!file) {
      return {
        status: "error",
        message: AI_UPLOAD_REQUIRED_MESSAGE,
      };
    }

    if (canUseTextExtraction(file)) {
      if (file.size > AI_TEXT_UPLOAD_LIMIT_BYTES) {
        return {
          status: "error",
          message: "That file is too large for AI help right now.",
        };
      }

      const textContent = (await file.text()).trim().slice(0, AI_TEXT_CONTENT_LIMIT);

      if (!textContent) {
        return {
          status: "error",
          message: "We could not read enough text from that upload.",
        };
      }

      return {
        status: "ready",
        upload: {
          fileName: file.name,
          mimeType: file.type || "text/plain",
          sizeBytes: file.size,
          textContent,
        },
      };
    }

    if (canUseBinaryUpload(file)) {
      if (file.size > AI_BINARY_UPLOAD_LIMIT_BYTES) {
        return {
          status: "error",
          message: "That file is too large for AI help right now.",
        };
      }

      const bytes = new Uint8Array(await file.arrayBuffer());

      return {
        status: "ready",
        upload: {
          fileName: file.name,
          mimeType:
            file.type ||
            (file.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/jpeg"),
          sizeBytes: file.size,
          base64Data: encodeBase64(bytes),
        },
      };
    }

    return {
      status: "error",
      message: "That file type is not supported for AI help yet.",
    };
  } catch {
    return {
      status: "error",
      message: "We could not read that file for AI help.",
    };
  }
}

async function readJsonSafely<T>(response: Response): Promise<T | null> {
  const contentType = response.headers.get("content-type") || "";

  if (!contentType.toLowerCase().includes("application/json")) {
    return null;
  }

  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function formatPlanLabel(planKey: NonNullable<SellerProfileDraft["sellerPlanKey"]>) {
  return planConfig[normalizePlanKey(planKey)].label;
}

function inferFormatFromFiles(files: File[]) {
  const extension = files[0]?.name.split(".").pop()?.toLowerCase();

  switch (extension) {
    case "pdf":
      return "PDF Resource";
    case "ppt":
    case "pptx":
      return "Slide Deck";
    case "doc":
    case "docx":
      return "Lesson Document";
    case "xlsx":
      return "Spreadsheet";
    default:
      return "Uploaded Resource";
  }
}

function buildConnectedSeller(profile: SellerProfileDraft): ConnectedSeller | null {
  if (!profile.stripeAccountId) {
    return null;
  }

  return {
    accountId: profile.stripeAccountId,
    email: profile.email,
    displayName: profile.displayName || profile.storeName || "Seller",
  };
}

function buildFallbackProfile(viewer?: {
  name?: string;
  email?: string;
}): SellerProfileDraft {
  const email = viewer?.email || "";
  const displayName = viewer?.name || "";

  return {
    displayName,
    email,
    storeName: displayName || "Seller",
    storeHandle: email.split("@")[0]?.replace(/[^a-z0-9-]+/gi, "-") || "seller",
    primarySubject: "Math",
    tagline: "",
    sellerPlanKey: "starter",
    onboardingCompleted: false,
  };
}

function buildStandardsScanCacheKey(input: {
  sellerId: string;
  provider: "openai" | "gemini";
  title: string;
  excerpt: string;
  uploadSignature?: string;
}) {
  const normalized = [
    input.sellerId,
    input.provider,
    input.title.trim().toLowerCase(),
    input.excerpt.trim().toLowerCase().replace(/\s+/g, " "),
    input.uploadSignature?.trim().toLowerCase() || "",
  ].join("::");

  return `standards-scan-${normalized.slice(0, 180)}`;
}

function buildListingAssistCacheKey(input: {
  sellerId: string;
  provider: "openai" | "gemini";
  action: ListingAssistAction;
  fileNames: string[];
  title: string;
  excerpt: string;
  uploadSignature?: string;
}) {
  const normalized = [
    input.sellerId,
    input.provider,
    input.action,
    input.fileNames.join("|").toLowerCase(),
    input.title.trim().toLowerCase(),
    input.excerpt.trim().toLowerCase().replace(/\s+/g, " "),
    input.uploadSignature?.trim().toLowerCase() || "",
  ].join("::");

  return `listing-assist-${normalized.slice(0, 180)}`;
}

function normalizeUploadedTitle(fileName?: string) {
  if (!fileName) {
    return "";
  }

  return fileName
    .replace(/\.[^/.]+$/, "")
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function buildOptimizationPreview(input: {
  title: string;
  shortDescription: string;
  fullDescription: string;
  subject: string;
  gradeBand: string;
}) {
  const workingTitle = input.title.trim() || `${input.gradeBand} ${input.subject} resource`;
  const firstSentence =
    input.shortDescription.trim() ||
    input.fullDescription.trim() ||
    `Ready-to-teach ${input.subject.toLowerCase()} support for ${input.gradeBand}.`;

  return {
    titleRewrite: `${workingTitle.replace(/\bpack\b/i, "").trim()} | Ready for faster classroom use`,
    descriptionRewrite: `Help teachers open this resource faster with a clearer promise: ${firstSentence}`,
    keywords: [
      input.subject,
      input.gradeBand,
      "printable resource",
      "teacher-friendly",
      "classroom ready",
    ],
  };
}

function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

async function trackMonetizationEvent(input: {
  eventType: "ai_credit_limit_hit" | "locked_feature_clicked" | "upgrade_click";
  source: "seller_creator";
  planKey: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    await fetch("/api/lessonforge/monetization-events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
      keepalive: true,
    });
  } catch {
    // Quietly fail. Monetization tracking should never block seller work.
  }
}

function normalizeListingTitle(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getSimilarTitleWarning(title: string, existingTitles: string[]) {
  const normalizedTitle = normalizeListingTitle(title);

  if (normalizedTitle.length < 8) {
    return null;
  }

  const titleWords = new Set(
    normalizedTitle.split(" ").filter((word) => word.length > 2),
  );

  for (const existingTitle of existingTitles) {
    const normalizedExisting = normalizeListingTitle(existingTitle);

    if (!normalizedExisting || normalizedExisting === normalizedTitle) {
      if (normalizedExisting === normalizedTitle) {
        return `You already have a listing titled "${existingTitle}". Make sure this one is clearly different before publishing.`;
      }

      continue;
    }

    const existingWords = new Set(
      normalizedExisting.split(" ").filter((word) => word.length > 2),
    );
    const overlap = Array.from(titleWords).filter((word) =>
      existingWords.has(word),
    ).length;
    const similarity = overlap / Math.max(titleWords.size, 1);

    if (titleWords.size >= 3 && similarity >= 0.8) {
      return `This title is very close to "${existingTitle}". Clear, distinct listings are easier for buyers to trust.`;
    }
  }

  return null;
}

type PublishReadinessKey =
  | "title"
  | "description"
  | "price"
  | "file"
  | "preview"
  | "thumbnail"
  | "rights";

function getPublishFieldClassName(isMissing: boolean) {
  return isMissing
    ? "border-red-300 bg-red-50/40 focus:border-red-400"
    : "border-ink/10 bg-white focus:border-brand";
}

function getFieldClassName(input: { isMissing: boolean; isAiUpdated?: boolean }) {
  if (input.isMissing) {
    return "border-red-300 bg-red-50/40 focus:border-red-400";
  }

  if (input.isAiUpdated) {
    return "border-brand/30 bg-brand-soft/25 focus:border-brand";
  }

  return "border-ink/10 bg-white focus:border-brand";
}

function isWeakTitleValue(value: string, uploadedTitle: string) {
  const normalized = value.trim();

  return !normalized || normalized === uploadedTitle || normalized.length < 12;
}

function hasUsableShortDescription(value: string) {
  return value.trim().length >= 20;
}

function hasUsableFullDescription(value: string) {
  return value.trim().length >= 60;
}

function createDraftProductId() {
  return `upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function ProductCreator() {
  const router = useRouter();
  const fileInputId = useId();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [seller, setSeller] = useState<ConnectedSeller | null>(null);
  const [profile, setProfile] = useState<SellerProfileDraft | null>(null);
  const [draftProductId, setDraftProductId] = useState(() => createDraftProductId());
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("Math");
  const [gradeBand, setGradeBand] = useState("K-12");
  const [price, setPrice] = useState("12");
  const [resourceType, setResourceType] = useState("Lesson plan");
  const [shortDescription, setShortDescription] = useState("");
  const [fullDescription, setFullDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [licenseType, setLicenseType] = useState("Single classroom");
  const [createdPath, setCreatedPath] = useState<ProductRecord["createdPath"]>("Manual upload");
  const [status, setStatus] = useState<NonNullable<ProductRecord["productStatus"]>>("Draft");
  const [previewIncluded, setPreviewIncluded] = useState(false);
  const [thumbnailIncluded, setThumbnailIncluded] = useState(false);
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [imageGallery, setImageGallery] = useState<ProductGalleryImage[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [savedProduct, setSavedProduct] = useState<{
    id: string;
    title: string;
    productStatus: NonNullable<ProductRecord["productStatus"]>;
    isPurchasable: boolean;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreatorReady, setIsCreatorReady] = useState(false);
  const [availableCredits, setAvailableCredits] = useState<number | null>(null);
  const [aiSettings, setAiSettings] = useState<AdminAiSettings | null>(null);
  const [listingUsage, setListingUsage] = useState<{
    planKey: "starter" | "basic" | "pro";
    limit: number;
    current: number;
    remaining: number;
    reached: boolean;
  } | null>(null);
  const [premiumAccess, setPremiumAccess] = useState<{
    fullListingOptimization: { unlocked: boolean; upgradePlanKey: "starter" | "basic" | "pro" };
    revenueInsights: { unlocked: boolean; upgradePlanKey: "starter" | "basic" | "pro" };
  } | null>(null);
  const [existingSellerTitles, setExistingSellerTitles] = useState<string[]>([]);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [standardsResult, setStandardsResult] = useState<AIProviderResult | null>(null);
  const [aiFeedback, setAiFeedback] = useState<{
    state: "loading" | "success" | "error";
    action: CreatorAiAction | "finish";
    message: string;
  } | null>(null);
  const [aiUpdatedFields, setAiUpdatedFields] = useState<
    Partial<Record<AiFieldKey, AiFieldStatus>>
  >({});
  const [showAiReviewNotice, setShowAiReviewNotice] = useState(false);
  const [aiUploadReadiness, setAiUploadReadiness] = useState<{
    state: "idle" | "checking" | "ready" | "error";
    message: string | null;
  }>({
    state: "idle",
    message: null,
  });

  useEffect(() => {
    const normalizedGallery = normalizeProductGallery(draftProductId, imageGallery);
    setThumbnailIncluded(normalizedGallery.length > 0);
    setPreviewIncluded(normalizedGallery.length > MIN_PRODUCT_INTERIOR_PREVIEW_IMAGES);
  }, [draftProductId, imageGallery]);
  const currentPlanKey = normalizePlanKey(profile?.sellerPlanKey);
  const currentPlan = planConfig[currentPlanKey];
  const canRunStandardsScan =
    availableCredits === null ? true : canAffordAiAction(availableCredits, "standardsScan");
  const canRunDescriptionRewrite =
    availableCredits === null ? true : canAffordAiAction(availableCredits, "descriptionRewrite");
  const aiKillSwitchEnabled = aiSettings?.aiKillSwitchEnabled ?? false;
  const connectedAccountId = seller?.accountId || profile?.stripeAccountId || null;
  const hasAnyAiCreditsRemaining = availableCredits === null ? true : availableCredits > 0;
  const canSaveWithoutAi = status !== "Published";
  const saveBlockedByAi =
    !canSaveWithoutAi && (aiKillSwitchEnabled || !canRunStandardsScan);
  const saveBlocked = saveBlockedByAi;
  const priceCentsPreview = Math.round(Number(price) * 100);
  const publishReadinessItems = [
    {
      key: "title" as PublishReadinessKey,
      label: "Add title",
      complete: title.trim().length > 0,
      help: "Add a title that names the grade, topic, and resource type.",
      targetId: "publish-target-title",
    },
    {
      key: "description" as PublishReadinessKey,
      label: "Add description",
      complete:
        fullDescription.trim().length >= 40 ||
        shortDescription.trim().length >= 20,
      help: "Write enough detail for another teacher to know if it fits their class.",
      targetId: "publish-target-description",
    },
    {
      key: "price" as PublishReadinessKey,
      label: "Set price",
      complete: Number.isFinite(priceCentsPreview) && priceCentsPreview >= 100,
      help: "Set a valid price before publishing.",
      targetId: "publish-target-price",
    },
    {
      key: "file" as PublishReadinessKey,
      label: "Attach file",
      complete: files.length > 0,
      help: "Make sure the buyer will receive the resource file.",
      targetId: "publish-target-file",
    },
    {
      key: "preview" as PublishReadinessKey,
      label: "Add preview",
      complete: previewIncluded,
      help: "Add a preview so buyers know what they are getting.",
      targetId: "publish-target-preview",
    },
    {
      key: "thumbnail" as PublishReadinessKey,
      label: "Add thumbnail",
      complete: thumbnailIncluded,
      help: "Add a cover image so the listing looks ready in browse pages.",
      targetId: "publish-target-thumbnail",
    },
    {
      key: "rights" as PublishReadinessKey,
      label: "Confirm rights",
      complete: rightsConfirmed,
      help: "Confirm you own or have rights to sell this content.",
      targetId: "publish-target-rights",
    },
  ];
  const missingPublishItems = publishReadinessItems.filter((item) => !item.complete);
  const missingPublishKeys = new Set(missingPublishItems.map((item) => item.key));
  const similarTitleWarning = getSimilarTitleWarning(title, existingSellerTitles);
  const optimizationPreview = buildOptimizationPreview({
    title,
    shortDescription,
    fullDescription,
    subject,
    gradeBand,
  });
  const estimatedMonthlyRevenueCents = Math.round(
    Number(price || 0) *
      100 *
      Math.max(
        2,
        [
          title.trim().length > 0,
          shortDescription.trim().length > 0,
          fullDescription.trim().length > 0,
          previewIncluded,
          thumbnailIncluded,
        ].filter(Boolean).length + 1,
      ),
  );
  const uploadStepReady = files.length > 0 && title.trim().length > 0;
  const detailsStepReady =
    subject.trim().length > 0 &&
    gradeBand.trim().length > 0 &&
    (shortDescription.trim().length > 0 || fullDescription.trim().length > 0);
  const publishStepReady = missingPublishItems.length === 0;
  const currentAiAction = aiFeedback?.state === "loading" ? aiFeedback.action : null;
  const uploadedTitle = normalizeUploadedTitle(files[0]?.name);
  const step1AiUiState = getSellerCreateStep1AiUiState({
    aiUploadReadinessState: aiUploadReadiness.state,
    aiKillSwitchEnabled,
    hasAnyAiCreditsRemaining,
    currentAiAction,
  });

  function markAiUpdated(nextFields: Partial<Record<AiFieldKey, AiFieldStatus>>) {
    if (Object.keys(nextFields).length === 0) {
      return;
    }

    setAiUpdatedFields((current) => ({
      ...current,
      ...nextFields,
    }));
  }

  function clearAiField(field: AiFieldKey) {
    setAiUpdatedFields((current) => {
      if (!(field in current)) {
        return current;
      }

      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function renderAiFieldNote(field: AiFieldKey) {
    const status = aiUpdatedFields[field];

    if (!status) {
      return null;
    }

    return (
      <span className="mt-2 inline-flex rounded-full bg-brand-soft px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand">
        {status === "filled" ? "Filled by AI" : "Suggested by AI"}
      </span>
    );
  }

  function scrollToPublishTarget(targetId: string) {
    const target = document.getElementById(targetId);

    if (!target) {
      return;
    }

    target.scrollIntoView({ behavior: "smooth", block: "center" });

    window.setTimeout(() => {
      const focusTarget = target.querySelector<HTMLElement>(
        "input, textarea, select, button",
      );
      focusTarget?.focus();
    }, 180);
  }

  function focusFirstMissingPublishItem() {
    const firstMissing = missingPublishItems[0];

    if (!firstMissing) {
      return;
    }

    scrollToPublishTarget(firstMissing.targetId);
  }

  async function runListingAssist(
    action: ListingAssistAction,
    options?: { quiet?: boolean },
  ) {
    const sellerId = profile?.email || seller?.email;
    const sellerEmail = profile?.email || seller?.email;

    if (!sellerId || !sellerEmail) {
      if (!options?.quiet) {
        setAiFeedback({
          state: "error",
          action,
          message: AI_ONBOARDING_REQUIRED_MESSAGE,
        });
      }
      return null;
    }

    if (files.length === 0) {
      if (!options?.quiet) {
        setAiFeedback({
          state: "error",
          action,
          message: AI_UPLOAD_REQUIRED_MESSAGE,
        });
      }
      return null;
    }

    const uploadResult = await buildSellerAiUploadPayload(files[0]);

    if (uploadResult.status !== "ready") {
      if (!options?.quiet) {
        setAiFeedback({
          state: "error",
          action,
          message: uploadResult.message,
        });
      }
      return null;
    }
    const upload = uploadResult.upload;
    const uploadSignature = `${upload.fileName}:${upload.sizeBytes}:${upload.mimeType}`;

    if (aiKillSwitchEnabled) {
      if (!options?.quiet) {
        setAiFeedback({
          state: "error",
          action,
          message: AI_TEMPORARY_UNAVAILABLE_MESSAGE,
        });
      }
      return null;
    }

    if (
      (action === "autofill" || action === "description") &&
      !canRunDescriptionRewrite
    ) {
      if (!options?.quiet) {
        setAiFeedback({
          state: "error",
          action,
          message: getAiUpgradeMessage(),
        });
      }
      return null;
    }

    if (!options?.quiet) {
      setAiFeedback({
        state: "loading",
        action,
        message:
          action === "autofill"
            ? "AI is scanning your file…"
            : action === "description"
              ? "AI is writing your description…"
              : "AI is filling your listing…",
      });
    }

    try {
      const response = await fetch("/api/lessonforge/ai/listing-assist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sellerId,
          sellerEmail,
          sellerPlanKey: currentPlanKey,
          provider: SELLER_FLOW_AI_PROVIDER,
          action,
          fileNames: files.map((file) => file.name),
          upload,
          title,
          excerpt: `${shortDescription} ${fullDescription} ${notes}`.trim(),
          subject,
          gradeBand,
          idempotencyKey: buildListingAssistCacheKey({
            sellerId,
            provider: SELLER_FLOW_AI_PROVIDER,
            action,
            fileNames: files.map((file) => file.name),
            title,
            excerpt: `${shortDescription} ${fullDescription} ${notes}`.trim(),
            uploadSignature,
          }),
        }),
      });

      const payload = (await readJsonSafely<{
        suggestion?: ListingAssistResponse;
        availableCredits?: number;
        error?: string;
      }>(response)) ?? { error: AI_GENERIC_FAILURE_MESSAGE };

      if (!response.ok || !payload.suggestion) {
        if (!options?.quiet) {
          setAiFeedback({
            state: "error",
            action,
            message: payload.error || AI_GENERIC_FAILURE_MESSAGE,
          });
        }
        return null;
      }

      setAvailableCredits(payload.availableCredits ?? null);
      if (!options?.quiet) {
        setAiFeedback({
          state: "success",
          action,
          message: "Filled by AI",
        });
      }

      return {
        suggestion: payload.suggestion,
        availableCredits: payload.availableCredits ?? null,
      };
    } catch {
      if (!options?.quiet) {
        setAiFeedback({
          state: "error",
          action,
          message: AI_GENERIC_FAILURE_MESSAGE,
        });
      }
      return null;
    }
  }

  async function runStandardsScan(
    _mode: "auto" | "manual",
    options?: { quiet?: boolean },
  ) {
    const sellerId = profile?.email || seller?.email;
    const sellerEmail = profile?.email || seller?.email;

    if (!sellerId || !sellerEmail) {
      if (!options?.quiet) {
        setAiFeedback({
          state: "error",
          action: "standards",
          message: AI_ONBOARDING_REQUIRED_MESSAGE,
        });
      }
      return null;
    }

    if (files.length === 0) {
      if (!options?.quiet) {
        setAiFeedback({
          state: "error",
          action: "standards",
          message: AI_STANDARDS_UPLOAD_REQUIRED_MESSAGE,
        });
      }
      return null;
    }

    const uploadResult = await buildSellerAiUploadPayload(files[0]);

    if (uploadResult.status !== "ready") {
      if (!options?.quiet) {
        setAiFeedback({
          state: "error",
          action: "standards",
          message: uploadResult.message,
        });
      }
      return null;
    }
    const upload = uploadResult.upload;
    const uploadSignature = `${upload.fileName}:${upload.sizeBytes}:${upload.mimeType}`;

    if (aiKillSwitchEnabled) {
      if (!options?.quiet) {
        setAiFeedback({
          state: "error",
          action: "standards",
          message: AI_TEMPORARY_UNAVAILABLE_MESSAGE,
        });
      }
      return null;
    }

    if (!canRunStandardsScan) {
      if (!options?.quiet) {
        setAiFeedback({
          state: "error",
          action: "standards",
          message: getAiUpgradeMessage(),
        });
      }
      return null;
    }

    if (!options?.quiet) {
      setAiFeedback({
        state: "loading",
        action: "standards",
        message: "AI is scanning your file…",
      });
    }

    try {
      const response = await fetch("/api/lessonforge/ai/standards-scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sellerId,
          sellerEmail,
          sellerPlanKey: currentPlanKey,
          title: title || normalizeUploadedTitle(files[0]?.name),
          upload,
          excerpt: `${shortDescription} ${fullDescription} ${notes} ${files.map((file) => file.name).join(" ")}`.trim(),
          provider: SELLER_FLOW_AI_PROVIDER,
          idempotencyKey: buildStandardsScanCacheKey({
            sellerId,
            provider: SELLER_FLOW_AI_PROVIDER,
            title: title || normalizeUploadedTitle(files[0]?.name),
            excerpt: `${shortDescription} ${fullDescription} ${notes} ${files.map((file) => file.name).join(" ")}`.trim(),
            uploadSignature,
          }),
        }),
      });

      const payload = (await readJsonSafely<{
        mapping?: AIProviderResult;
        availableCredits?: number;
        error?: string;
      }>(response)) ?? { error: "Standards scan failed. Try again." };

      if (!response.ok || !payload.mapping) {
        if (!options?.quiet) {
          setAiFeedback({
            state: "error",
            action: "standards",
            message: payload.error || "Standards scan failed. Try again.",
          });
        }
        return null;
      }

      setStandardsResult(payload.mapping);
      setAvailableCredits(payload.availableCredits ?? null);
      if (payload.mapping.status === "success") {
        setSubject((current) =>
          current === "Math" || !current.trim() ? payload.mapping?.subject || current : current,
        );
      }
      if (!options?.quiet) {
        setAiFeedback({
          state: payload.mapping.status === "success" ? "success" : "error",
          action: "standards",
          message:
            payload.mapping.status === "success"
              ? "Standards scanned"
              : payload.mapping.message,
        });
      }

      return payload.mapping;
    } catch {
      if (!options?.quiet) {
        setAiFeedback({
          state: "error",
          action: "standards",
          message: "Standards scan failed. Try again.",
        });
      }
      return null;
    }
  }

  function applyListingAssistSuggestion(
    suggestion: ListingAssistResponse,
    action: ListingAssistAction,
    options?: { mode?: "upload" | "helper" | "manual" },
  ) {
    const mode = options?.mode ?? "upload";
    const fieldPlan = getListingAssistFieldPlan({
      action,
      mode,
      current: {
        title,
        shortDescription,
        fullDescription,
        subject,
        gradeBand,
        suggestedTags,
      },
      uploadedTitle,
      suggestion,
    });

    if (fieldPlan.nextValues.title !== undefined) {
      setTitle(fieldPlan.nextValues.title);
    }

    if (fieldPlan.nextValues.shortDescription !== undefined) {
      setShortDescription(fieldPlan.nextValues.shortDescription);
    }

    if (fieldPlan.nextValues.fullDescription !== undefined) {
      setFullDescription(fieldPlan.nextValues.fullDescription);
    }

    if (fieldPlan.nextValues.subject !== undefined) {
      setSubject(fieldPlan.nextValues.subject);
    }

    if (fieldPlan.nextValues.gradeBand !== undefined) {
      setGradeBand(fieldPlan.nextValues.gradeBand);
    }

    if (fieldPlan.nextValues.tags !== undefined) {
      setSuggestedTags(fieldPlan.nextValues.tags);
    }

    markAiUpdated(fieldPlan.nextUpdatedFields);
    return fieldPlan.nextUpdatedFields;
  }

  async function handleAiFinishListing() {
    setAiFeedback({
      state: "loading",
      action: "finish",
      message: "AI is scanning your file…",
    });

    const summary: string[] = [];
    const assistResult = await runListingAssist("autofill", { quiet: true });

    if (!assistResult?.suggestion) {
      setAiFeedback({
        state: "error",
        action: "finish",
        message: AI_GENERIC_FAILURE_MESSAGE,
      });
      return;
    }

    setAiFeedback({
      state: "loading",
      action: "finish",
      message: "AI is filling your listing…",
    });

    const updatedFields = applyListingAssistSuggestion(assistResult.suggestion, "autofill", {
      mode: "helper",
    });

    const nextShortDescription =
      (updatedFields.shortDescription ? assistResult.suggestion.shortDescription : shortDescription).trim();
    const nextFullDescription =
      (updatedFields.fullDescription ? assistResult.suggestion.fullDescription : fullDescription).trim();
    const missingDescriptionAfterFill =
      !hasUsableShortDescription(nextShortDescription) ||
      !hasUsableFullDescription(nextFullDescription);

    if (missingDescriptionAfterFill) {
      const descriptionResult = await runListingAssist("description", { quiet: true });

      if (descriptionResult?.suggestion) {
        const retriedFields = applyListingAssistSuggestion(descriptionResult.suggestion, "description", {
          mode: "manual",
        });

        if (retriedFields.shortDescription || retriedFields.fullDescription) {
          summary.push("Description filled");
        }
      }
    }

    if (updatedFields.title) {
      summary.push("Title filled");
    }

    if (
      (updatedFields.shortDescription || updatedFields.fullDescription) &&
      !summary.includes("Description filled")
    ) {
      summary.push("Description filled");
    }

    if (updatedFields.tags) {
      summary.push("Tags suggested");
    }

    if (
      !standardsResult ||
      standardsResult.provider !== SELLER_FLOW_AI_PROVIDER ||
      standardsResult.status !== "success"
    ) {
      const standardsMapping = await runStandardsScan("manual", { quiet: true });

      if (standardsMapping?.status === "success") {
        markAiUpdated({ standards: "suggested" });
        summary.push("Standards scanned");
      } else if (standardsMapping?.message) {
        summary.push(standardsMapping.message);
      }
    }

    setShowAiReviewNotice(summary.length > 0);
    setAiFeedback({
      state:
        assistResult.suggestion.status === "partial" || summary.length === 0
          ? "error"
          : "success",
      action: "finish",
      message:
        summary.length > 0
          ? `${assistResult.suggestion.status === "success" && summary.includes("Description filled") ? "Filled by AI" : "AI filled part of your listing."} ${summary.join(" • ")}`
          : "AI filled part of your listing.",
    });
  }

  useEffect(() => {
    void (async () => {
      const response = await fetch("/api/session/viewer");
      const payload = (await response.json()) as {
        viewer?: { role?: string; name?: string; email?: string };
      };

      if (!response.ok) {
        return;
      }

      const profilesResponse = await fetch("/api/lessonforge/seller-profile");
      const profilesPayload = (await profilesResponse.json()) as {
        profiles?: SellerProfileDraft[];
      };
      const matchedProfile = profilesPayload.profiles?.find(
        (entry) => entry.email === payload.viewer?.email,
      );
      const normalizedProfile = matchedProfile
        ? {
            ...matchedProfile,
            sellerPlanKey: normalizePlanKey(matchedProfile.sellerPlanKey),
          }
        : null;
      const fallbackProfile = buildFallbackProfile(
        payload.viewer?.role === "seller" ? payload.viewer : undefined,
      );

      setProfile(normalizedProfile ?? fallbackProfile);
      setSeller(buildConnectedSeller(normalizedProfile ?? fallbackProfile));
    })();
  }, []);

  useEffect(() => {
    setIsCreatorReady(true);
  }, []);

  useEffect(() => {
    const sellerId = profile?.email || seller?.email;
    const sellerEmail = profile?.email || seller?.email;
    const sellerPlanKey = normalizePlanKey(profile?.sellerPlanKey);

    if (!sellerId || !sellerEmail) {
      return;
    }

    void (async () => {
      const response = await fetch(
        `/api/lessonforge/seller-ai?sellerId=${encodeURIComponent(sellerId)}&sellerEmail=${encodeURIComponent(sellerEmail)}&sellerPlanKey=${encodeURIComponent(sellerPlanKey)}`,
      );
      const payload = (await response.json()) as {
        aiSettings?: AdminAiSettings;
        subscription?: { availableCredits?: number } | null;
        listingUsage?: {
          planKey: "starter" | "basic" | "pro";
          limit: number;
          current: number;
          remaining: number;
          reached: boolean;
        };
        premiumAccess?: {
          fullListingOptimization: {
            unlocked: boolean;
            upgradePlanKey: "starter" | "basic" | "pro";
          };
          revenueInsights: {
            unlocked: boolean;
            upgradePlanKey: "starter" | "basic" | "pro";
          };
        };
      };

      if (response.ok) {
        setAiSettings(payload.aiSettings ?? null);
        setAvailableCredits(payload.subscription?.availableCredits ?? null);
        setListingUsage(payload.listingUsage ?? null);
        setPremiumAccess(payload.premiumAccess ?? null);
      }
    })();
  }, [profile?.email, profile?.sellerPlanKey, seller?.email]);

  useEffect(() => {
    const sellerId = profile?.email || seller?.email;

    if (!sellerId) {
      return;
    }

    void (async () => {
      try {
        const response = await fetch("/api/lessonforge/products");
        const payload = (await response.json()) as { products?: ProductRecord[] };

        if (!response.ok) {
          return;
        }

        setExistingSellerTitles(
          (payload.products ?? [])
            .filter((product) => product.sellerId === sellerId)
            .map((product) => product.title)
            .filter(Boolean),
        );
      } catch {
        // Duplicate guidance should never block creating a listing.
      }
    })();
  }, [profile?.email, seller?.email]);

  useEffect(() => {
    let cancelled = false;

    if (files.length === 0) {
      setAiUploadReadiness({
        state: "idle",
        message: null,
      });
      return;
    }

    setAiUploadReadiness({
      state: "checking",
      message: "Checking your uploaded file for AI…",
    });

    void (async () => {
      const uploadResult = await buildSellerAiUploadPayload(files[0]);

      if (cancelled) {
        return;
      }

      if (uploadResult.status === "ready") {
        setAiUploadReadiness({
          state: "ready",
          message: "AI reads your uploaded file and fills the rest of your listing.",
        });
        return;
      }

      setAiUploadReadiness({
        state: "error",
        message: uploadResult.message,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [files]);

  function applySelectedFiles(nextFiles: File[]) {
    setFiles(nextFiles);
    setStandardsResult(null);
    setSuggestedTags([]);
    setAiUpdatedFields({});
    setShowAiReviewNotice(false);
    setAiUploadReadiness({
      state: nextFiles.length > 0 ? "checking" : "idle",
      message: nextFiles.length > 0 ? "Checking your uploaded file for AI…" : null,
    });

    if (!title && nextFiles[0]) {
      setTitle(normalizeUploadedTitle(nextFiles[0].name));
    }

    if (nextFiles.length > 0) {
      setAiFeedback(null);
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    applySelectedFiles(Array.from(event.target.files ?? []));
  }

  function handleFileDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    applySelectedFiles(Array.from(event.dataTransfer.files ?? []));
  }

  async function handleSave(nextStatusOverride?: NonNullable<ProductRecord["productStatus"]>) {
    const effectiveStatus = nextStatusOverride ?? status;

    if (!title.trim()) {
      setMessage("Add a title before saving the product.");
      return;
    }

    const priceCents = Math.round(Number(price) * 100);
    if (!Number.isFinite(priceCents) || priceCents < 100) {
      setMessage("Set a valid price of at least $1.00.");
      return;
    }

    if (effectiveStatus === "Published" && missingPublishItems.length > 0) {
      setMessage(
        `Finish these publish checks first: ${missingPublishItems
          .map((item) => item.label.toLowerCase())
          .join(", ")}.`,
      );
      return;
    }

    setIsSaving(true);
    setMessage(null);

    const excerpt = `${notes} ${files.map((file) => file.name).join(" ")}`.trim();
    const sellerId = profile?.email || seller?.email;
    const sellerEmail = profile?.email || seller?.email;

    if (!sellerId || !sellerEmail) {
      setMessage("Finish seller onboarding before using server-side AI actions.");
      setIsSaving(false);
      return;
    }

    if (aiKillSwitchEnabled && !canSaveWithoutAi) {
      setMessage("AI is temporarily unavailable because the admin kill switch is enabled.");
      setIsSaving(false);
      return;
    }

    if (availableCredits !== null && !canRunStandardsScan && !canSaveWithoutAi) {
      setMessage(getAiUpgradeMessage());
      await trackMonetizationEvent({
        eventType: "ai_credit_limit_hit",
        source: "seller_creator",
        planKey: currentPlanKey,
        metadata: {
          availableCredits,
          standardsScanCost,
        },
      });
      setIsSaving(false);
      return;
    }
    let suggestedStandard =
      standardsResult?.status === "success" && standardsResult.suggestedStandard
        ? standardsResult.suggestedStandard
        : "Standards pending seller review";
    const uploadResult = await buildSellerAiUploadPayload(files[0]);
    const upload = uploadResult.status === "ready" ? uploadResult.upload : null;
    const uploadSignature = upload ? `${upload.fileName}:${upload.sizeBytes}:${upload.mimeType}` : "";

    if ((!standardsResult || standardsResult.status !== "success") && !aiKillSwitchEnabled && canRunStandardsScan) {
      const mappingResponse = await fetch("/api/lessonforge/ai/standards-scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sellerId,
          sellerEmail,
          sellerPlanKey: normalizePlanKey(profile?.sellerPlanKey),
          title,
          upload: upload ?? undefined,
          excerpt,
          provider: SELLER_FLOW_AI_PROVIDER,
          idempotencyKey: buildStandardsScanCacheKey({
            sellerId,
            provider: SELLER_FLOW_AI_PROVIDER,
            title,
            excerpt,
            uploadSignature,
          }),
        }),
      });

      const mappingPayload = (await mappingResponse.json()) as {
        mapping?: AIProviderResult;
        availableCredits?: number;
        error?: string;
      };

      if (!mappingResponse.ok || !mappingPayload.mapping) {
        if (!canSaveWithoutAi) {
          setMessage(mappingPayload.error || "Unable to run the AI standards scan.");
          setIsSaving(false);
          return;
        }
      } else if (mappingPayload.mapping.status === "success") {
        suggestedStandard = mappingPayload.mapping.suggestedStandard;
        setStandardsResult(mappingPayload.mapping);
        setAvailableCredits(mappingPayload.availableCredits ?? null);
      } else {
        setStandardsResult(mappingPayload.mapping);
        setAvailableCredits(mappingPayload.availableCredits ?? null);
      }
    }

    const normalizedGallery = normalizeProductGallery(draftProductId, imageGallery);
    const nextProduct: ProductRecord = {
      id: draftProductId,
      title: title.trim(),
      subject,
      gradeBand,
      standardsTag: suggestedStandard,
      updatedAt: "Saved just now",
      format: inferFormatFromFiles(files),
      summary:
        notes.trim() ||
        `Prepared through the dedicated seller creation flow with ${files.length ? files.map((file) => file.name).join(", ") : "manual details only"}.`,
      demoOnly: false,
      resourceType,
      shortDescription: shortDescription.trim() || undefined,
      fullDescription: fullDescription.trim() || undefined,
      sellerName: seller?.displayName || profile?.displayName || undefined,
      sellerHandle: profile?.storeHandle ? `@${profile.storeHandle}` : undefined,
      sellerId: profile?.email || seller?.email || `seller-${Date.now()}`,
      sellerStripeAccountId: connectedAccountId ?? undefined,
      priceCents,
      isPurchasable: Boolean(connectedAccountId) && effectiveStatus !== "Draft",
      productStatus: effectiveStatus,
      createdPath,
      licenseType,
      previewIncluded: normalizedGallery.length > MIN_PRODUCT_INTERIOR_PREVIEW_IMAGES,
      thumbnailIncluded: normalizedGallery.length > 0,
      rightsConfirmed,
      imageGallery: normalizedGallery,
      fileTypes: files.length ? files.map((file) => file.name.split(".").pop()?.toUpperCase() || "FILE") : ["PDF"],
      includedItems: ["Teacher-facing guide", "Student resource pages"],
    };

    const response = await fetch("/api/lessonforge/products", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        product: nextProduct,
      }),
    });

    const payload = (await response.json()) as { error?: string; product?: ProductRecord };

    if (!response.ok || !payload.product) {
      if ((payload as { listingUsage?: typeof listingUsage }).listingUsage) {
        setListingUsage((payload as { listingUsage?: typeof listingUsage }).listingUsage ?? null);
      }
      setMessage(payload.error || "Unable to save the product.");
      setIsSaving(false);
      return;
    }
    const savedProductRecord = payload.product;
    trackFunnelEvent(
      savedProductRecord.productStatus === "Published"
        ? "seller_listing_published"
        : "seller_listing_saved_draft",
      {
        productId: savedProductRecord.id,
        subject,
        resourceType,
        status: savedProductRecord.productStatus ?? "Draft",
        hasPreview: normalizedGallery.length > MIN_PRODUCT_INTERIOR_PREVIEW_IMAGES,
        hasThumbnail: normalizedGallery.length > 0,
      },
    );

    setSavedProduct({
      id: savedProductRecord.id,
      title: savedProductRecord.title,
      productStatus: savedProductRecord.productStatus ?? "Draft",
      isPurchasable: Boolean(savedProductRecord.isPurchasable),
    });
    setMessage("Product saved successfully. Opening your saved product…");
    setIsSaving(false);
    const editSearchParams = new URLSearchParams();
    editSearchParams.set("listingUpdate", "saved");
    editSearchParams.set("listingTitle", savedProductRecord.title);
    if (suggestedStandard === "Standards pending seller review") {
      editSearchParams.set("aiStatus", "skipped");
    }
    if (!connectedAccountId) {
      editSearchParams.set("billingStatus", "connect-required");
    }
    router.push(`/sell/products/${savedProductRecord.id}/edit?${editSearchParams.toString()}`);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(340px,0.92fr)]">
      <section className="rounded-[28px] border border-black/5 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand">
          Create listing
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl leading-tight text-ink sm:text-4xl">
          Upload your resource, review the details, and publish when it looks ready.
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-ink-soft sm:text-base">
          Keep the first pass simple. Upload the file first, let AI build the listing if you want, then review everything before publishing.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {[
            {
              title: "1. Upload resource",
              body: "Upload your file, then let AI fill the rest.",
              ready: uploadStepReady,
            },
            {
              title: "2. Review details",
              body: "Check the subject, grade, and description.",
              ready: detailsStepReady,
            },
            {
              title: "3. Publish listing",
              body: "Finish preview, thumbnail, and rights checks.",
              ready: publishStepReady,
            },
          ].map((step) => (
            <div
              key={step.title}
              className={`rounded-[1.2rem] border px-4 py-4 text-sm leading-6 ${
                step.ready
                  ? "border-emerald-100 bg-emerald-50/70 text-emerald-950"
                  : "border-black/5 bg-surface-subtle text-ink-soft"
              }`}
            >
              <p className="font-semibold text-ink">{step.title}</p>
              <p className="mt-1">{step.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.14em]">
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-800">
            Unlimited uploads
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-ink-soft">
            AI tools limited by plan
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-ink-soft">
            Drafts are safe
          </span>
        </div>

        {isCreatorReady ? (
          <p className="sr-only" data-testid="seller-creator-ready">
            Creator ready
          </p>
        ) : null}

        {aiKillSwitchEnabled ? (
          <div className="mt-4 rounded-[1rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
            AI is temporarily paused. You can still finish the listing details and save a draft.
          </div>
        ) : null}

        <div className="mt-6 space-y-4">
          <section className="rounded-[22px] border border-black/5 bg-surface-subtle p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand">
                  Step 1
                </p>
                <h2 className="mt-1 text-xl font-semibold text-ink">Upload resource</h2>
                <p className="mt-1 text-sm leading-6 text-ink-soft">
                  Start with one classroom-ready file and a clear title.
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-soft text-brand">
                <FileUp className="h-4 w-4" />
              </div>
            </div>

            <div className="mt-4 grid gap-4">
              <div className="block">
                <span className="text-sm font-semibold text-ink">Resource files</span>
                <div
                  className={`mt-2 rounded-[1rem] border px-4 py-4 ${
                    missingPublishKeys.has("file")
                      ? "border-red-300 bg-red-50/40"
                      : "border-ink/10 bg-white"
                  }`}
                  id="publish-target-file"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={handleFileDrop}
                >
                  <input
                    ref={fileInputRef}
                    accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip"
                    className="sr-only"
                    data-testid="seller-creator-files"
                    id={fileInputId}
                    multiple
                    onChange={handleFileChange}
                    type="file"
                  />
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-ink">
                        Drag files here or choose them from your device
                      </p>
                      <p className="mt-1 text-sm leading-6 text-ink-soft">
                        PDFs, images, slide decks, documents, spreadsheets, and zipped resource packs are supported.
                      </p>
                    </div>
                    <button
                      className="inline-flex items-center justify-center rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
                      onClick={() => fileInputRef.current?.click()}
                      type="button"
                    >
                      Choose file
                    </button>
                  </div>

                  {files.length > 0 ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {files.map((file) => (
                        <span
                          key={`${file.name}-${file.size}`}
                          className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-ink-soft"
                        >
                          {file.name}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
                {missingPublishKeys.has("file") ? (
                  <span className="mt-2 block text-xs font-semibold text-red-600">
                    Required to publish
                  </span>
                ) : null}
                <span className="mt-2 block text-xs leading-5 text-ink-soft">
                  Upload a worksheet, slide deck, assessment, lesson page, or pack that already works in class.
                </span>
              </div>

              {files.length > 0 || aiFeedback ? (
                <div className="rounded-[1rem] border border-brand/10 bg-brand-soft/30 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand">
                        Fill listing with AI
                      </p>
                      <p className="mt-1 text-sm leading-6 text-ink-soft">
                        AI reads your uploaded file and fills the rest of your listing.
                      </p>
                    </div>
                    {step1AiUiState.showButton ? (
                      <button
                        className="rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-brand disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={step1AiUiState.buttonDisabled}
                        onClick={() => {
                          void handleAiFinishListing();
                        }}
                        type="button"
                      >
                        {STEP_1_AI_BUTTON_LABEL}
                      </button>
                    ) : (
                      <span className="rounded-full bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-brand">
                        {aiUploadReadiness.state === "checking"
                          ? "Checking file"
                          : aiUploadReadiness.state === "error"
                            ? "File not ready"
                            : "Upload first"}
                      </span>
                    )}
                  </div>

                  {aiUploadReadiness.message ? (
                    <div className="mt-3 rounded-[0.95rem] bg-white px-4 py-3 text-sm leading-6 text-ink">
                      {aiUploadReadiness.message}
                    </div>
                  ) : null}

                  {step1AiUiState.showZeroCreditsMessage ? (
                    <div className="mt-3 rounded-[0.95rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
                      <p className="font-semibold">{step1AiUiState.zeroCreditsTitle}</p>
                      <p className="mt-1">{step1AiUiState.zeroCreditsResetMessage}</p>
                      <p className="mt-1">{getAiUpgradeMessage()}</p>
                    </div>
                  ) : null}

                  {aiFeedback ? (
                    <div
                      className={`mt-3 rounded-[0.95rem] px-4 py-3 text-sm leading-6 ${
                        aiFeedback.state === "loading"
                          ? "bg-white text-ink"
                          : aiFeedback.state === "success"
                            ? "bg-emerald-50 text-emerald-900"
                            : "bg-red-50 text-red-900"
                      }`}
                    >
                      {aiFeedback.message}
                    </div>
                  ) : null}

                  {showAiReviewNotice ? (
                    <div className="mt-3 rounded-[0.95rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
                      AI can make mistakes. Review before publishing.
                    </div>
                  ) : null}

                  {(title || shortDescription || fullDescription || suggestedTags.length > 0 || standardsResult) ? (
                    <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.14em]">
                      {title ? (
                        <span className="rounded-full bg-white px-3 py-1 text-ink-soft">
                          Title ready
                        </span>
                      ) : null}
                      {shortDescription || fullDescription ? (
                        <span className="rounded-full bg-white px-3 py-1 text-ink-soft">
                          Description ready
                        </span>
                      ) : null}
                      {suggestedTags.length > 0 ? (
                        <span className="rounded-full bg-white px-3 py-1 text-ink-soft">
                          Tags generated
                        </span>
                      ) : null}
                      {standardsResult?.status === "success" ? (
                        <span className="rounded-full bg-white px-3 py-1 text-ink-soft">
                          Standards scanned
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}

              <label className="block">
                <span className="text-sm font-semibold text-ink">Title</span>
                <input
                  className={`mt-2 w-full rounded-[1rem] border px-4 py-3 text-sm text-ink outline-none transition ${getFieldClassName({
                    isMissing: missingPublishKeys.has("title"),
                    isAiUpdated: Boolean(aiUpdatedFields.title),
                  })}`}
                  data-testid="seller-creator-title"
                  id="publish-target-title"
                  onChange={(event) => {
                    setTitle(event.target.value);
                    clearAiField("title");
                  }}
                  placeholder="5th Grade Fraction Exit Ticket Pack"
                  value={title}
                />
                {missingPublishKeys.has("title") ? (
                  <span className="mt-2 block text-xs font-semibold text-red-600">
                    Required to publish
                  </span>
                ) : null}
                {renderAiFieldNote("title")}
              </label>

              {similarTitleWarning ? (
                <div className="rounded-[1rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">
                  <p className="font-semibold">Possible duplicate title</p>
                  <p className="mt-1">{similarTitleWarning}</p>
                </div>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-semibold text-ink">Subject</span>
                  <select
                    className={`mt-2 w-full rounded-[1rem] border px-4 py-3 text-sm text-ink outline-none transition ${getFieldClassName({
                      isMissing: false,
                      isAiUpdated: Boolean(aiUpdatedFields.subject),
                    })}`}
                    data-testid="seller-creator-subject"
                    onChange={(event) => {
                      setSubject(event.target.value);
                      clearAiField("subject");
                    }}
                    value={subject}
                  >
                    <option>Math</option>
                    <option>ELA</option>
                    <option>Science</option>
                    <option>Social Studies</option>
                  </select>
                  {renderAiFieldNote("subject")}
                </label>

                <label className="block">
                  <span className="text-sm font-semibold text-ink">Grade band</span>
                  <select
                    className={`mt-2 w-full rounded-[1rem] border px-4 py-3 text-sm text-ink outline-none transition ${getFieldClassName({
                      isMissing: false,
                      isAiUpdated: Boolean(aiUpdatedFields.gradeBand),
                    })}`}
                    data-testid="seller-creator-grade-band"
                    onChange={(event) => {
                      setGradeBand(event.target.value);
                      clearAiField("gradeBand");
                    }}
                    value={gradeBand}
                  >
                    <option>K-12</option>
                    <option>K-5</option>
                    <option>6-8</option>
                    <option>9-12</option>
                  </select>
                  {renderAiFieldNote("gradeBand")}
                </label>
              </div>
            </div>
          </section>

          <section className="rounded-[22px] border border-black/5 bg-surface-subtle p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand">
                  Step 2
                </p>
                <h2 className="mt-1 text-xl font-semibold text-ink">Review details</h2>
                <p className="mt-1 text-sm leading-6 text-ink-soft">
                  Review what AI filled in, or enter the listing details yourself.
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-semibold text-ink">Resource type</span>
                  <select
                    className="mt-2 w-full rounded-[1rem] border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-brand"
                    data-testid="seller-creator-resource-type"
                    onChange={(event) => setResourceType(event.target.value)}
                    value={resourceType}
                  >
                    <option>Lesson plan</option>
                    <option>Worksheet</option>
                    <option>Assessment</option>
                    <option>Quiz</option>
                    <option>Project</option>
                    <option>Slide deck</option>
                    <option>Warm up</option>
                    <option>Exit ticket</option>
                    <option>Study guide</option>
                    <option>Unit plan</option>
                    <option>Lab</option>
                    <option>Graphic organizer</option>
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm font-semibold text-ink">Price</span>
                  <input
                    className={`mt-2 w-full rounded-[1rem] border px-4 py-3 text-sm text-ink outline-none transition ${getPublishFieldClassName(
                      missingPublishKeys.has("price"),
                    )}`}
                    data-testid="seller-creator-price"
                    id="publish-target-price"
                    onChange={(event) => setPrice(event.target.value)}
                    type="number"
                    value={price}
                  />
                  {missingPublishKeys.has("price") ? (
                    <span className="mt-2 block text-xs font-semibold text-red-600">
                      Required to publish
                    </span>
                  ) : null}
                </label>
              </div>

              <label className="block" id="publish-target-description">
                <span className="text-sm font-semibold text-ink">Short description</span>
                <textarea
                  className={`mt-2 min-h-24 w-full rounded-[1rem] border px-4 py-3 text-sm text-ink outline-none transition ${getFieldClassName({
                    isMissing: missingPublishKeys.has("description"),
                    isAiUpdated: Boolean(aiUpdatedFields.shortDescription),
                  })}`}
                  data-testid="seller-creator-short-description"
                  onChange={(event) => {
                    setShortDescription(event.target.value);
                    clearAiField("shortDescription");
                  }}
                  placeholder="One quick summary buyers can scan."
                  value={shortDescription}
                />
                {renderAiFieldNote("shortDescription")}
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-ink">Full description</span>
                <textarea
                  className={`mt-2 min-h-28 w-full rounded-[1rem] border px-4 py-3 text-sm text-ink outline-none transition ${getFieldClassName({
                    isMissing: missingPublishKeys.has("description"),
                    isAiUpdated: Boolean(aiUpdatedFields.fullDescription),
                  })}`}
                  data-testid="seller-creator-full-description"
                  onChange={(event) => {
                    setFullDescription(event.target.value);
                    clearAiField("fullDescription");
                  }}
                  placeholder="Explain what is included, how teachers use it, and why it is useful."
                  value={fullDescription}
                />
                {missingPublishKeys.has("description") ? (
                  <span className="mt-2 block text-xs font-semibold text-red-600">
                    Required to publish
                  </span>
                ) : null}
                {renderAiFieldNote("fullDescription")}
              </label>

              <div className="grid gap-4 lg:grid-cols-2">
                <section
                  className={`rounded-[1rem] border p-4 ${
                    aiUpdatedFields.tags
                      ? "border-brand/20 bg-brand-soft/20"
                      : "border-black/5 bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-ink">Suggested tags</p>
                      <p className="mt-1 text-sm leading-6 text-ink-soft">
                        AI adds browse terms here after Fill listing with AI runs.
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {suggestedTags.length > 0 ? (
                      suggestedTags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-ink-soft"
                        >
                          {tag}
                        </span>
                      ))
                    ) : (
                      <p className="text-sm leading-6 text-ink-soft">No tags generated yet.</p>
                    )}
                  </div>
                  {renderAiFieldNote("tags")}
                </section>

                <section
                  className={`rounded-[1rem] border p-4 ${
                    aiUpdatedFields.standards
                      ? "border-brand/20 bg-brand-soft/20"
                      : "border-black/5 bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-ink">Standards</p>
                      <p className="mt-1 text-sm leading-6 text-ink-soft">
                        {standardsResult?.status === "success"
                          ? "Standards scanned from your file"
                          : "AI will suggest standards here when confidence is high."}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 space-y-2 text-sm leading-6 text-ink-soft">
                    <p>
                      <span className="font-semibold text-ink">Suggested standard:</span>{" "}
                      {standardsResult?.status === "success"
                        ? standardsResult.suggestedStandard
                        : "Could not confidently match standards yet"}
                    </p>
                    <p>
                      <span className="font-semibold text-ink">Confidence:</span>{" "}
                      {standardsResult?.status === "success"
                        ? standardsResult.confidence
                        : "Pending"}
                    </p>
                    <p>
                      <span className="font-semibold text-ink">Reason:</span>{" "}
                      {standardsResult?.status === "success"
                        ? standardsResult.rationale
                        : standardsResult?.message || "AI will explain the match here."}
                    </p>
                  </div>
                  {renderAiFieldNote("standards")}
                </section>
              </div>
            </div>
          </section>

          <section className="rounded-[22px] border border-brand/10 bg-brand-soft/30 p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand">
                  Step 3
                </p>
                <h2 className="mt-1 text-xl font-semibold text-ink">Review and publish</h2>
                <p className="mt-1 text-sm leading-6 text-ink-soft">Finish the missing items to publish.</p>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-brand">
                Completed {publishReadinessItems.length - missingPublishItems.length} of {publishReadinessItems.length}
              </span>
            </div>

            {missingPublishItems.length > 0 ? (
              <div className="mt-4 rounded-[1rem] border border-red-200 bg-white p-4">
                <p className="text-lg font-semibold text-ink">You still need to finish</p>
                <div className="mt-3 space-y-2">
                  {missingPublishItems.map((item) => (
                    <button
                      key={item.key}
                      className="flex w-full items-start gap-3 rounded-[0.95rem] border border-red-200 bg-red-50/70 px-3 py-3 text-left transition hover:border-red-300"
                      onClick={() => scrollToPublishTarget(item.targetId)}
                      type="button"
                    >
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                      <span>
                        <span className="block text-sm font-semibold text-ink">{item.label}</span>
                        <span className="mt-0.5 block text-sm leading-6 text-ink-soft">
                          {item.help}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
                <button
                  className="mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
                  onClick={focusFirstMissingPublishItem}
                  type="button"
                >
                  Finish listing
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="mt-4 rounded-[1rem] border border-emerald-200 bg-white p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
                  <div>
                    <p className="text-lg font-semibold text-ink">Ready to publish</p>
                    <p className="mt-1 text-sm leading-6 text-ink-soft">
                      Your listing is ready for buyers.
                    </p>
                  </div>
                </div>
                <button
                  className="mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
                  onClick={() => {
                    setStatus("Published");
                    void handleSave("Published");
                  }}
                  type="button"
                >
                  Publish
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            )}

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-semibold text-ink">License</span>
                <select
                  className="mt-2 w-full rounded-[1rem] border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-brand"
                  data-testid="seller-creator-license"
                  onChange={(event) => setLicenseType(event.target.value)}
                  value={licenseType}
                >
                  <option>Single classroom</option>
                  <option>Multiple classroom</option>
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-ink">Product status</span>
                <select
                  className="mt-2 w-full rounded-[1rem] border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-brand"
                  data-testid="seller-creator-status"
                  onChange={(event) => setStatus(event.target.value as NonNullable<ProductRecord["productStatus"]>)}
                  value={status}
                >
                  <option>Draft</option>
                  <option>Pending review</option>
                  <option>Published</option>
                </select>
              </label>
            </div>

            <div className="mt-4 space-y-4">
              <div id="publish-target-thumbnail">
                <div id="publish-target-preview">
                  <ProductImageGalleryManager
                    onChange={setImageGallery}
                    productId={draftProductId}
                    gradeLabel={gradeBand}
                    subjectLabel={subject}
                    value={imageGallery}
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div
                  className={`rounded-[1rem] border p-4 text-sm leading-6 ${
                    missingPublishKeys.has("thumbnail")
                      ? "border-red-300 bg-red-50/40"
                      : "border-black/5 bg-white"
                  }`}
                >
                  <p className="font-semibold text-ink">Cover image</p>
                  <p className="mt-1 text-ink-soft">
                    {thumbnailIncluded
                      ? "Ready. The first image is now the marketplace thumbnail."
                      : "Add a cover image before publishing."}
                  </p>
                </div>

                <div
                  className={`rounded-[1rem] border p-4 text-sm leading-6 ${
                    missingPublishKeys.has("preview")
                      ? "border-red-300 bg-red-50/40"
                      : "border-black/5 bg-white"
                  }`}
                >
                  <p className="font-semibold text-ink">Interior preview images</p>
                  <p className="mt-1 text-ink-soft">
                    {previewIncluded
                      ? "Ready. Buyers will see watermarked preview images on the product page."
                      : "Add at least two real interior preview images before publishing."}
                  </p>
                </div>
              </div>

              <label
                className={`rounded-[1rem] border p-4 text-sm leading-6 ${
                  missingPublishKeys.has("rights")
                    ? "border-red-300 bg-red-50/40"
                    : "border-black/5 bg-white"
                }`}
                id="publish-target-rights"
              >
                <span className="flex items-start gap-3">
                  <input
                    checked={rightsConfirmed}
                    className="mt-1 h-4 w-4 accent-brand"
                    data-testid="seller-creator-rights-confirmed"
                    onChange={(event) => setRightsConfirmed(event.target.checked)}
                    type="checkbox"
                  />
                  <span>
                    <span className="block font-semibold text-ink">Rights confirmed</span>
                    <span className="mt-1 block text-ink-soft">Required to publish</span>
                  </span>
                </span>
              </label>
            </div>
          </section>

          <details className="rounded-[22px] border border-black/5 bg-white p-4">
            <summary className="cursor-pointer text-sm font-semibold text-ink">
              Optional settings
            </summary>
            <div className="mt-4 grid gap-4">
              <label className="block">
                <span className="text-sm font-semibold text-ink">Notes</span>
                <textarea
                  className="mt-2 min-h-24 w-full rounded-[1rem] border border-ink/10 bg-surface-subtle px-4 py-3 text-sm text-ink outline-none transition focus:border-brand"
                  data-testid="seller-creator-notes"
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Optional notes about what is included or how you use it."
                  value={notes}
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-semibold text-ink">Creation path</span>
                  <select
                    className="mt-2 w-full rounded-[1rem] border border-ink/10 bg-surface-subtle px-4 py-3 text-sm text-ink outline-none transition focus:border-brand"
                    data-testid="seller-creator-created-path"
                    onChange={(event) => setCreatedPath(event.target.value as ProductRecord["createdPath"])}
                    value={createdPath}
                  >
                    <option>Manual upload</option>
                    <option>Manual from scratch</option>
                    <option>AI assisted</option>
                  </select>
                </label>

              </div>

              <details className="rounded-[18px] border border-black/5 bg-surface-subtle p-4">
                <summary className="cursor-pointer text-sm font-semibold text-ink">
                  AI and plan details
                </summary>
                <div className="mt-4 space-y-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-[1rem] bg-white px-4 py-3 text-sm text-ink-soft">
                      Scan cost
                      <p className="mt-1 text-lg font-semibold text-ink">{standardsScanCost} credits</p>
                    </div>
                    <div className="rounded-[1rem] bg-white px-4 py-3 text-sm text-ink-soft">
                      Current plan
                      <p className="mt-1 text-lg font-semibold text-ink">{formatPlanLabel(currentPlanKey)}</p>
                    </div>
                    <div className="rounded-[1rem] bg-white px-4 py-3 text-sm text-ink-soft">
                      Credits left
                      <p className="mt-1 text-lg font-semibold text-ink">
                        {availableCredits ?? "Pending"}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-[1rem] border border-black/5 bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-ink">AI filled details for you</p>
                        <p className="mt-1 text-sm leading-6 text-ink-soft">
                          Premium plans can use the stronger optimization view before publishing.
                        </p>
                      </div>
                      {premiumAccess?.fullListingOptimization.unlocked ? (
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
                          Included in your plan
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">
                          <Lock className="h-3.5 w-3.5" />
                          Basic and Pro
                        </span>
                      )}
                    </div>

                    <div className={`mt-4 grid gap-3 ${premiumAccess?.fullListingOptimization.unlocked ? "sm:grid-cols-3" : ""}`}>
                      <div className={`rounded-[1rem] border border-slate-200 bg-slate-50 p-4 ${premiumAccess?.fullListingOptimization.unlocked ? "" : "blur-[2px]"}`}>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-soft">Title rewrite</p>
                        <p className="mt-2 text-sm font-semibold text-ink">{optimizationPreview.titleRewrite}</p>
                      </div>
                      <div className={`rounded-[1rem] border border-slate-200 bg-slate-50 p-4 ${premiumAccess?.fullListingOptimization.unlocked ? "" : "blur-[2px]"}`}>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-soft">Description rewrite</p>
                        <p className="mt-2 text-sm leading-6 text-ink-soft">{optimizationPreview.descriptionRewrite}</p>
                      </div>
                      <div className={`rounded-[1rem] border border-slate-200 bg-slate-50 p-4 ${premiumAccess?.fullListingOptimization.unlocked ? "" : "blur-[2px]"}`}>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-soft">Keyword suggestions</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {optimizationPreview.keywords.map((keyword) => (
                            <span key={keyword} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink-soft">
                              {keyword}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {!premiumAccess?.fullListingOptimization.unlocked ? (
                      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                        <Link
                          className="inline-flex items-center justify-center rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
                          href={buildSellerPlanCheckoutHref({
                            planKey: "basic",
                            returnTo: "/sell/dashboard?focus=plan",
                          })}
                          onClick={() =>
                            void trackMonetizationEvent({
                              eventType: "upgrade_click",
                              source: "seller_creator",
                              planKey: currentPlanKey,
                              metadata: {
                                reason: "full_listing_optimization",
                                targetPlan: "basic",
                              },
                            })
                          }
                        >
                          Upgrade to Basic
                        </Link>
                        <button
                          className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:border-slate-300"
                          onClick={() =>
                            void (async () => {
                              setMessage(getLockedFeatureMessage());
                              await trackMonetizationEvent({
                                eventType: "locked_feature_clicked",
                                source: "seller_creator",
                                planKey: currentPlanKey,
                                metadata: {
                                  feature: "full_listing_optimization",
                                },
                              });
                            })()
                          }
                          type="button"
                        >
                          See why this is locked
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </details>

              <details className="rounded-[18px] border border-black/5 bg-surface-subtle p-4">
                <summary className="cursor-pointer text-sm font-semibold text-ink">
                  Revenue insight
                </summary>
                <div className="mt-4">
                  <div className="rounded-[1.2rem] border border-slate-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-soft">
                      Estimated monthly revenue
                    </p>
                    <p className={`mt-2 text-3xl font-semibold text-ink ${premiumAccess?.revenueInsights.unlocked ? "" : "blur-[4px]"}`}>
                      {formatUsd(estimatedMonthlyRevenueCents)}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-ink-soft">
                      {premiumAccess?.revenueInsights.unlocked
                        ? "Use this as a rough planning target while you improve the listing."
                        : "Upgrade to see performance insights and improve results."}
                    </p>
                  </div>
                </div>
              </details>
            </div>
          </details>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            className="inline-flex items-center justify-center gap-2 rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
            data-testid="seller-creator-save"
            disabled={isSaving || saveBlocked || !isCreatorReady || (status === "Published" && missingPublishItems.length > 0)}
            onClick={() => {
              if (status === "Published" && missingPublishItems.length > 0) {
                focusFirstMissingPublishItem();
                return;
              }

              void handleSave();
            }}
            type="button"
          >
            {isSaving
              ? "Saving listing"
              : saveBlockedByAi && aiKillSwitchEnabled
                ? "AI temporarily disabled"
              : saveBlockedByAi && !canRunStandardsScan
                ? "Insufficient AI credits"
                : status === "Published" && missingPublishItems.length > 0
                  ? "Finish listing"
                : status === "Published"
                  ? "Publish listing"
                  : "Save listing draft"}
            <ArrowRight className="h-4 w-4" />
          </button>
          <Link
            className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:border-slate-300"
            href="/sell/dashboard"
            data-testid="seller-creator-return-dashboard"
          >
            Return to dashboard
          </Link>
        </div>

        {savedProduct ? (
          <div className="mt-5 rounded-[1.35rem] border border-emerald-100 bg-emerald-50/80 p-4">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-800">
              Listing saved
            </p>
            <p className="mt-2 text-base font-semibold text-ink">
              {savedProduct.title} is saved.
            </p>
            <p className="mt-2 text-sm leading-6 text-ink-soft">
              {savedProduct.productStatus === "Draft"
                ? "Next, tighten the description and finish the preview checks."
                : savedProduct.productStatus === "Pending review"
                  ? "Next, watch the seller dashboard for review status."
                  : savedProduct.isPurchasable
                    ? "Next, watch the seller dashboard for buyer activity and earnings."
                    : "Next, finish Stripe setup before this listing can sell."}
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <Link
                className="inline-flex items-center justify-center rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
                href={savedProduct.productStatus === "Draft" ? "/sell/dashboard?view=needs-action" : "/sell/dashboard"}
              >
                Open seller dashboard
              </Link>
              <Link
                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:border-slate-300"
                href={seller ? "/sell/products/new" : "/sell/onboarding"}
              >
                {seller ? "Create another listing" : "Finish payout setup"}
              </Link>
            </div>
          </div>
        ) : null}

        {message ? (
          <p className="mt-4 text-sm leading-6 text-ink-soft" data-testid="seller-creator-message">
            {message}
          </p>
        ) : null}
      </section>

      <aside className="space-y-4">
        <section className="rounded-[24px] bg-slate-950 p-5 text-white shadow-[0_20px_60px_rgba(15,23,42,0.15)]">
          <h2 className="text-lg font-semibold">Quick guide</h2>
          <div className="mt-3 space-y-2 text-sm leading-6 text-white/75">
            <p>Upload your file first.</p>
            <p>Review the title, description, and price.</p>
            <p>Publish only after preview, thumbnail, and rights checks are done.</p>
          </div>
          <p className="mt-4 text-xs uppercase tracking-[0.14em] text-white/55">
            {availableCredits !== null
              ? `${availableCredits} AI credits left`
              : "AI credits appear after the first scan"}{" "}
            · {formatPlanLabel(currentPlanKey)}
          </p>
        </section>

        <ProductAssetPanel
          assetVersionNumber={1}
          format={files.length ? inferFormatFromFiles(files) : "Uploaded Resource"}
          gradeBand={gradeBand}
          imageGallery={imageGallery}
          localFiles={files}
          previewIncluded={previewIncluded}
          productId={draftProductId}
          subject={subject}
          summary={fullDescription || shortDescription || notes}
          thumbnailIncluded={thumbnailIncluded}
          title={title || "Untitled resource"}
        />

        <details className="rounded-[22px] border border-black/5 bg-white p-4 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
          <summary className="cursor-pointer text-sm font-semibold text-ink">
            Seller guidance
          </summary>
          <div className="mt-4 space-y-4">
            <div className="rounded-[1rem] bg-slate-50 px-4 py-3 text-sm leading-6 text-ink-soft">
              Choose a focused first product instead of your biggest bundle.
            </div>
            <div className="rounded-[1rem] bg-slate-50 px-4 py-3 text-sm leading-6 text-ink-soft">
              {seller
                ? `Payouts connected for ${seller.displayName || profile?.displayName || seller.email || "this seller"}.`
                : "No connected Stripe account yet. Products can still be drafted or sent to review."}
            </div>
            <div className="rounded-[1rem] bg-slate-50 px-4 py-3 text-sm leading-6 text-ink-soft">
              Low-effort or repeated listings may be reviewed and may perform worse in discovery.
            </div>
          </div>
        </details>
      </aside>
    </div>
  );
}
