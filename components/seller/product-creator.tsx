"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { ArrowRight, FileUp, Lock, WandSparkles } from "lucide-react";
import Link from "next/link";

import { trackFunnelEvent } from "@/lib/analytics/events";
import { normalizePlanKey, planConfig } from "@/lib/config/plans";
import { ProductAssetPanel } from "@/components/seller/product-asset-panel";
import {
  getAiUpgradeMessage,
  getLockedFeatureMessage,
} from "@/lib/lessonforge/plan-enforcement";
import { buildSellerPlanCheckoutHref } from "@/lib/stripe/seller-plan-billing";
import { canAffordAiAction, getAiCreditCost } from "@/lib/services/ai/credits";
import type {
  AdminAiSettings,
  ConnectedSeller,
  ProductRecord,
  SellerProfileDraft,
} from "@/types";

const standardsScanCost = getAiCreditCost("standardsScan");

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
}) {
  const normalized = [
    input.sellerId,
    input.provider,
    input.title.trim().toLowerCase(),
    input.excerpt.trim().toLowerCase().replace(/\s+/g, " "),
  ].join("::");

  return `standards-scan-${normalized.slice(0, 180)}`;
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

export function ProductCreator() {
  const [seller, setSeller] = useState<ConnectedSeller | null>(null);
  const [profile, setProfile] = useState<SellerProfileDraft | null>(null);
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
  const [provider, setProvider] = useState<"openai" | "gemini">("openai");
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
  const currentPlanKey = normalizePlanKey(profile?.sellerPlanKey);
  const currentPlan = planConfig[currentPlanKey];
  const canRunStandardsScan =
    availableCredits === null ? true : canAffordAiAction(availableCredits, "standardsScan");
  const aiKillSwitchEnabled = aiSettings?.aiKillSwitchEnabled ?? false;
  const connectedAccountId = seller?.accountId || profile?.stripeAccountId || null;
  const estimatedRemainingCredits =
    availableCredits === null ? null : Math.max(0, availableCredits - standardsScanCost);
  const canSaveWithoutAi = status !== "Published";
  const saveBlockedByAi =
    !canSaveWithoutAi && (aiKillSwitchEnabled || !canRunStandardsScan);
  const saveBlocked = saveBlockedByAi;
  const priceCentsPreview = Math.round(Number(price) * 100);
  const publishReadinessItems = [
    {
      label: "Title added",
      complete: title.trim().length > 0,
      help: "Add a title that names the grade, topic, and resource type.",
    },
    {
      label: "Useful description",
      complete:
        fullDescription.trim().length >= 40 ||
        shortDescription.trim().length >= 20,
      help: "Write enough detail for another teacher to know if it fits their class.",
    },
    {
      label: "Price set",
      complete: Number.isFinite(priceCentsPreview) && priceCentsPreview >= 100,
      help: "Set a valid price before publishing.",
    },
    {
      label: "File attached",
      complete: files.length > 0,
      help: "Make sure the buyer will receive the resource file.",
    },
    {
      label: "Preview added",
      complete: previewIncluded,
      help: "Add a preview so buyers know what they are getting.",
    },
    {
      label: "Thumbnail added",
      complete: thumbnailIncluded,
      help: "Add a cover image so the listing looks ready in browse pages.",
    },
    {
      label: "Rights confirmed",
      complete: rightsConfirmed,
      help: "Confirm you own or have rights to sell this content.",
    },
  ];
  const missingPublishItems = publishReadinessItems.filter((item) => !item.complete);
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

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFiles = Array.from(event.target.files ?? []);
    setFiles(nextFiles);

    if (!title && nextFiles[0]) {
      const normalized = nextFiles[0].name
        .replace(/\.[^/.]+$/, "")
        .replace(/[-_]/g, " ");
      setTitle(normalized.replace(/\b\w/g, (character) => character.toUpperCase()));
    }
  }

  async function handleSave() {
    if (!title.trim()) {
      setMessage("Add a title before saving the product.");
      return;
    }

    const priceCents = Math.round(Number(price) * 100);
    if (!Number.isFinite(priceCents) || priceCents < 100) {
      setMessage("Set a valid price of at least $1.00.");
      return;
    }

    if (status === "Published" && missingPublishItems.length > 0) {
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
    let suggestedStandard = "Standards pending seller review";

    if (!aiKillSwitchEnabled && canRunStandardsScan) {
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
          excerpt,
          provider,
          idempotencyKey: buildStandardsScanCacheKey({
            sellerId,
            provider,
            title,
            excerpt,
          }),
        }),
      });

      const mappingPayload = (await mappingResponse.json()) as {
        mapping?: { suggestedStandard: string };
        availableCredits?: number;
        error?: string;
      };

      if (!mappingResponse.ok || !mappingPayload.mapping) {
        if (!canSaveWithoutAi) {
          setMessage(mappingPayload.error || "Unable to run the AI standards scan.");
          setIsSaving(false);
          return;
        }
      } else {
        suggestedStandard = mappingPayload.mapping.suggestedStandard;
        setAvailableCredits(mappingPayload.availableCredits ?? null);
      }
    }

    const nextProduct: ProductRecord = {
      id: `upload-${Date.now()}`,
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
      isPurchasable: Boolean(connectedAccountId) && status !== "Draft",
      productStatus: status,
      createdPath,
      licenseType,
      previewIncluded,
      thumbnailIncluded,
      rightsConfirmed,
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
        hasPreview: previewIncluded,
        hasThumbnail: thumbnailIncluded,
      },
    );

    setTitle("");
    setShortDescription("");
    setFullDescription("");
    setNotes("");
    setPrice("12");
    setFiles([]);
    setStatus("Draft");
    setCreatedPath("Manual upload");
    setPreviewIncluded(false);
    setThumbnailIncluded(false);
    setRightsConfirmed(false);
    setSavedProduct({
      id: savedProductRecord.id,
      title: savedProductRecord.title,
      productStatus: savedProductRecord.productStatus ?? "Draft",
      isPurchasable: Boolean(savedProductRecord.isPurchasable),
    });
    setMessage(
      `${savedProductRecord.title} was saved as ${savedProductRecord.productStatus}.${suggestedStandard === "Standards pending seller review" ? " AI standards scan was skipped for this save." : ""}${connectedAccountId ? "" : " Connect Stripe before published products can sell."}`,
    );
    setIsSaving(false);
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
      <section className="rounded-[32px] border border-black/5 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand">
          First listing
        </p>
        <h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl leading-tight text-ink sm:text-5xl">
          Create one clear resource buyers can trust.
        </h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-ink-soft">
          Start with a classroom resource you already understand well. Save it
          as a draft first, then add the preview, thumbnail, and rights check
          when you are ready to publish.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            {
              title: "Upload",
              body: "Choose one file or resource set that is ready for another teacher to open.",
            },
            {
              title: "Explain",
              body: "Add the title, grade, subject, price, and a buyer-facing summary.",
            },
            {
              title: "Publish",
              body: "Add preview, thumbnail, and rights confirmation before going live.",
            },
          ].map((step) => (
            <div
              key={step.title}
              className="rounded-[1.35rem] border border-ink/5 bg-surface-subtle px-4 py-4 text-sm leading-6 text-ink-soft"
            >
              <p className="font-semibold text-ink">{step.title}</p>
              <p className="mt-1">{step.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 rounded-[1.35rem] border border-sky-100 bg-sky-50/80 p-4">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-sky-800">
            Start here
          </p>
          <p className="mt-2 text-base font-semibold text-ink">
            A draft is safe. It does not need to be perfect.
          </p>
          <p className="mt-2 text-sm leading-6 text-ink-soft">
            Upload the file, add the title, subject, grade band, and price, then save. Come back for buyer-ready checks only when the listing is close to going live.
          </p>
        </div>
        <div className="mt-5 rounded-[1.5rem] border border-emerald-100 bg-emerald-50/80 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800">
              <FileUp className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-800">
                Unlimited uploads
              </p>
              <p className="mt-2 text-base font-semibold text-ink">
                You can keep uploading products. AI tools are limited by your plan.
              </p>
              <p className="mt-2 text-sm leading-6 text-ink-soft">
                Quality still matters: clear previews, accurate descriptions, and original or properly licensed files help buyers trust your listings.
              </p>
            </div>
          </div>
        </div>
        {isCreatorReady ? (
          <p className="sr-only" data-testid="seller-creator-ready">
            Creator ready
          </p>
        ) : null}
        <p className="mt-3 text-sm text-ink-soft">
          {availableCredits !== null
            ? `${availableCredits} AI credits remaining in the current cycle.`
            : "AI credits will appear here after the first server-side scan."}
        </p>
        <p className="mt-2 text-sm text-ink-soft">
          Current AI plan: {formatPlanLabel(currentPlanKey)}
        </p>
        <p className="mt-2 text-sm text-ink-soft">
          Uploads are unlimited. {listingUsage ? `${listingUsage.current} listing${listingUsage.current === 1 ? "" : "s"} tracked for this seller.` : "AI credits are the plan-based limit."}
        </p>
        {aiKillSwitchEnabled ? (
          <div className="mt-4 rounded-[1.25rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
            AI is currently paused by admin controls. You can still finish the listing details, but the standards scan is disabled until AI is turned back on.
          </div>
        ) : null}
        <details className="mt-5 rounded-[1.25rem] border border-ink/5 bg-surface-subtle p-4">
          <summary className="cursor-pointer text-sm font-semibold text-ink">
            Open AI readiness
          </summary>
          <div className="mt-3">
          <p className="text-sm font-semibold text-ink">AI readiness for this listing</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[1rem] bg-white px-4 py-3 text-sm text-ink-soft">
              Scan cost
              <p className="mt-1 text-lg font-semibold text-ink">
                {standardsScanCost} credits
              </p>
            </div>
            <div className="rounded-[1rem] bg-white px-4 py-3 text-sm text-ink-soft">
              Plan allowance
              <p className="mt-1 text-lg font-semibold text-ink">
                {currentPlan.availableCredits} available
              </p>
            </div>
            <div className="rounded-[1rem] bg-white px-4 py-3 text-sm text-ink-soft">
              After this scan
              <p className="mt-1 text-lg font-semibold text-ink">
                {estimatedRemainingCredits !== null ? estimatedRemainingCredits : "Pending"}
              </p>
            </div>
          </div>
          <p className="mt-3 text-sm leading-6 text-ink-soft">
            {availableCredits === null
              ? "We will create the seller subscription balance from the current plan on the first AI action."
              : aiKillSwitchEnabled
                ? "AI is disabled globally right now, so the standards scan cannot run even if this seller still has credits remaining."
                : canRunStandardsScan
                ? estimatedRemainingCredits !== null && estimatedRemainingCredits <= standardsScanCost
                  ? "This scan will work, but the balance is getting tight. Consider upgrading if you plan to run more AI actions right away."
                  : "This plan has enough room for the standards scan and more listing optimization work afterward."
                : "This seller has run out of credits for another standards scan on the current plan. Upgrade to continue optimizing this listing."}
          </p>
          {!aiKillSwitchEnabled && !canRunStandardsScan ? (
            <Link
              className="mt-4 inline-flex items-center justify-center rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
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
                    reason: "ai_credits",
                    targetPlan: "basic",
                  },
                })
              }
            >
              Upgrade Plan
            </Link>
          ) : null}
          </div>
        </details>

        <div className="mt-6 grid gap-4">
          <label className="block">
            <span className="text-sm font-semibold text-ink">Resource files</span>
            <span className="mt-1 block text-sm leading-6 text-ink-soft">
              Pick a resource that is already useful on its own: a worksheet, slide deck, assessment, warm up, exit ticket, or lesson pack.
            </span>
            <input
              className="mt-2 block w-full text-sm text-ink-soft"
              data-testid="seller-creator-files"
              multiple
              onChange={handleFileChange}
              type="file"
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-ink">Title</span>
            <span className="mt-1 block text-sm leading-6 text-ink-soft">
              A strong title names the grade, topic, and resource type so teachers can scan it quickly.
            </span>
            <input
              className="mt-2 w-full rounded-[1.25rem] border border-ink/10 bg-surface-subtle px-4 py-3 text-sm text-ink outline-none transition focus:border-brand"
              data-testid="seller-creator-title"
              onChange={(event) => setTitle(event.target.value)}
              placeholder="5th Grade Fraction Exit Ticket Pack"
              value={title}
            />
            {similarTitleWarning ? (
              <div className="mt-3 rounded-[1rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">
                <p className="font-semibold">Possible duplicate title</p>
                <p className="mt-1">{similarTitleWarning}</p>
                <p className="mt-1 text-amber-900">
                  Avoid duplicate listings. Clear, distinct resources are easier for buyers to trust.
                </p>
              </div>
            ) : null}
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold text-ink">Subject</span>
              <select
                className="mt-2 w-full rounded-[1.25rem] border border-ink/10 bg-surface-subtle px-4 py-3 text-sm text-ink outline-none transition focus:border-brand"
                data-testid="seller-creator-subject"
                onChange={(event) => setSubject(event.target.value)}
                value={subject}
              >
                <option>Math</option>
                <option>ELA</option>
                <option>Science</option>
                <option>Social Studies</option>
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-ink">Grade band</span>
              <select
                className="mt-2 w-full rounded-[1.25rem] border border-ink/10 bg-surface-subtle px-4 py-3 text-sm text-ink outline-none transition focus:border-brand"
                data-testid="seller-creator-grade-band"
                onChange={(event) => setGradeBand(event.target.value)}
              value={gradeBand}
            >
              <option>K-12</option>
              <option>K-5</option>
              <option>6-8</option>
              <option>9-12</option>
            </select>
          </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold text-ink">Price</span>
              <input
                className="mt-2 w-full rounded-[1.25rem] border border-ink/10 bg-surface-subtle px-4 py-3 text-sm text-ink outline-none transition focus:border-brand"
                data-testid="seller-creator-price"
                onChange={(event) => setPrice(event.target.value)}
                type="number"
                value={price}
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-ink">License</span>
              <select
                className="mt-2 w-full rounded-[1.25rem] border border-ink/10 bg-surface-subtle px-4 py-3 text-sm text-ink outline-none transition focus:border-brand"
                data-testid="seller-creator-license"
                onChange={(event) => setLicenseType(event.target.value)}
                value={licenseType}
              >
                <option>Single classroom</option>
                <option>Multiple classroom</option>
              </select>
            </label>
          </div>

          <div className="rounded-[1.35rem] border border-black/5 bg-surface-subtle p-4">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-700">
              Buyer-facing detail
            </p>
            <p className="mt-2 text-base font-semibold text-ink">
              Explain what the buyer gets and why it is worth opening.
            </p>
            <p className="mt-2 text-sm leading-6 text-ink-soft">
              Keep this practical: what is included, when a teacher should use it, and what problem it solves in class.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold text-ink">Resource type</span>
              <select
                className="mt-2 w-full rounded-[1.25rem] border border-ink/10 bg-surface-subtle px-4 py-3 text-sm text-ink outline-none transition focus:border-brand"
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
              <span className="text-sm font-semibold text-ink">Creation path</span>
              <select
                className="mt-2 w-full rounded-[1.25rem] border border-ink/10 bg-surface-subtle px-4 py-3 text-sm text-ink outline-none transition focus:border-brand"
                data-testid="seller-creator-created-path"
                onChange={(event) => setCreatedPath(event.target.value as ProductRecord["createdPath"])}
                value={createdPath}
              >
                <option>Manual upload</option>
                <option>Manual from scratch</option>
                <option>AI assisted</option>
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-ink">Product status</span>
              <select
                className="mt-2 w-full rounded-[1.25rem] border border-ink/10 bg-surface-subtle px-4 py-3 text-sm text-ink outline-none transition focus:border-brand"
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

          <label className="block">
            <span className="text-sm font-semibold text-ink">Short description</span>
            <textarea
              className="mt-2 min-h-24 w-full rounded-[1.25rem] border border-ink/10 bg-surface-subtle px-4 py-3 text-sm text-ink outline-none transition focus:border-brand"
              data-testid="seller-creator-short-description"
              onChange={(event) => setShortDescription(event.target.value)}
              placeholder="One quick summary buyers can scan in search and on the product page."
              value={shortDescription}
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-ink">Full description</span>
            <textarea
              className="mt-2 min-h-32 w-full rounded-[1.25rem] border border-ink/10 bg-surface-subtle px-4 py-3 text-sm text-ink outline-none transition focus:border-brand"
              data-testid="seller-creator-full-description"
              onChange={(event) => setFullDescription(event.target.value)}
              placeholder="Explain what is included, how teachers should use it, and what makes the listing trustworthy. This is required before publishing."
              value={fullDescription}
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-ink">Notes for the listing</span>
            <textarea
              className="mt-2 min-h-32 w-full rounded-[1.25rem] border border-ink/10 bg-surface-subtle px-4 py-3 text-sm text-ink outline-none transition focus:border-brand"
              data-testid="seller-creator-notes"
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Summarize what is included, classroom use, and what makes the resource trustworthy."
              value={notes}
            />
          </label>

          <div className="rounded-[1.35rem] border border-black/5 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-700">
                  Full listing optimization
                </p>
                <p className="mt-2 text-base font-semibold text-ink">
                  Title rewrite, description rewrite, and keyword suggestions in one premium workflow.
                </p>
                <p className="mt-2 text-sm leading-6 text-ink-soft">
                  {premiumAccess?.fullListingOptimization.unlocked
                    ? "This plan unlocks the full optimization view so you can sharpen the listing before buyers ever open it."
                    : getLockedFeatureMessage()}
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
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-soft">
                  Title rewrite
                </p>
                <p className="mt-2 text-sm font-semibold text-ink">
                  {optimizationPreview.titleRewrite}
                </p>
              </div>
              <div className={`rounded-[1rem] border border-slate-200 bg-slate-50 p-4 ${premiumAccess?.fullListingOptimization.unlocked ? "" : "blur-[2px]"}`}>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-soft">
                  Description rewrite
                </p>
                <p className="mt-2 text-sm leading-6 text-ink-soft">
                  {optimizationPreview.descriptionRewrite}
                </p>
              </div>
              <div className={`rounded-[1rem] border border-slate-200 bg-slate-50 p-4 ${premiumAccess?.fullListingOptimization.unlocked ? "" : "blur-[2px]"}`}>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-soft">
                  Keyword suggestions
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {optimizationPreview.keywords.map((keyword) => (
                    <span
                      key={keyword}
                      className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink-soft"
                    >
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
            ) : (
              <p className="mt-4 text-sm leading-6 text-ink-soft">
                Optimization guidance is available for this plan. Use it after the draft has enough buyer-facing detail to improve.
              </p>
            )}
          </div>

          <div className="rounded-[1.35rem] border border-brand/10 bg-brand-soft/30 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand">
                  Listing readiness
                </p>
                <p className="mt-2 text-base font-semibold text-ink">
                  {missingPublishItems.length === 0
                    ? "This listing has the basics needed to publish."
                    : "Finish these checks before publishing."}
                </p>
                <p className="mt-2 text-sm leading-6 text-ink-soft">
                  Drafts can stay unfinished. Published listings need enough detail for buyers to know what they are getting.
                </p>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-brand">
                {publishReadinessItems.length - missingPublishItems.length}/{publishReadinessItems.length} ready
              </span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {publishReadinessItems.map((item) => (
                <div
                  key={item.label}
                  className={`rounded-[1rem] border px-4 py-3 text-sm leading-6 ${
                    item.complete
                      ? "border-emerald-100 bg-white text-emerald-950"
                      : "border-amber-100 bg-amber-50/80 text-amber-950"
                  }`}
                >
                  <p className="font-semibold">
                    {item.complete ? "Done: " : "Missing: "}
                    {item.label}
                  </p>
                  <p className="mt-1 text-ink-soft">{item.help}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-[1rem] border border-ink/5 bg-white px-4 py-3 text-sm leading-6 text-ink-soft">
              Low-effort or repeated listings may be reviewed and may perform worse in discovery. Start with one strong resource before uploading many at once.
            </div>
          </div>

          <div className="rounded-[1.25rem] border border-amber-100 bg-amber-50/80 p-4">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-amber-800">
              Buyer-ready check
            </p>
            <p className="mt-2 text-base font-semibold text-ink">
              Use these checks when the listing is getting close to publish.
            </p>
            <p className="mt-2 text-sm leading-6 text-ink-soft">
              Published listings need a preview, a thumbnail, and a rights-to-sell confirmation so buyers know what they are getting.
            </p>
            <div className="mt-3 space-y-3 text-sm text-ink-soft">
              <label className="flex items-start gap-3">
                <input
                  checked={previewIncluded}
                  className="mt-1 h-4 w-4 accent-brand"
                  data-testid="seller-creator-preview-included"
                  onChange={(event) => setPreviewIncluded(event.target.checked)}
                  type="checkbox"
                />
                <span>I added a preview for buyers. No preview, no publish.</span>
              </label>
              <label className="flex items-start gap-3">
                <input
                  checked={thumbnailIncluded}
                  className="mt-1 h-4 w-4 accent-brand"
                  data-testid="seller-creator-thumbnail-included"
                  onChange={(event) => setThumbnailIncluded(event.target.checked)}
                  type="checkbox"
                />
                <span>I added a thumbnail for the product card and detail page.</span>
              </label>
              <label className="flex items-start gap-3">
                <input
                  checked={rightsConfirmed}
                  className="mt-1 h-4 w-4 accent-brand"
                  data-testid="seller-creator-rights-confirmed"
                  onChange={(event) => setRightsConfirmed(event.target.checked)}
                  type="checkbox"
                />
                <span>I confirm I own or have rights to sell this content.</span>
              </label>
            </div>
          </div>

          <div>
            <span className="text-sm font-semibold text-ink">Standards scan provider</span>
            <div className="mt-2 flex gap-3">
              {(["openai", "gemini"] as const).map((option) => (
                <button
                  key={option}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    provider === option
                      ? "bg-brand text-white"
                      : "bg-surface-subtle text-ink-soft"
                  }`}
                  data-testid={`seller-creator-provider-${option}`}
                  onClick={() => setProvider(option)}
                  type="button"
                >
                  {option === "openai" ? "OpenAI" : "Gemini"}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button
            className="inline-flex items-center justify-center gap-2 rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
            data-testid="seller-creator-save"
            disabled={isSaving || saveBlocked || !isCreatorReady}
            onClick={() => void handleSave()}
            type="button"
          >
            {isSaving
              ? "Saving listing"
              : saveBlockedByAi && aiKillSwitchEnabled
                ? "AI temporarily disabled"
              : saveBlockedByAi && !canRunStandardsScan
                ? "Insufficient AI credits"
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
          <div className="mt-6 rounded-[1.5rem] border border-emerald-100 bg-emerald-50/80 p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-800">
              Listing saved
            </p>
            <p className="mt-2 text-base font-semibold text-ink">
              {savedProduct.title} is saved.{" "}
              {savedProduct.productStatus === "Draft"
                ? "The next step is finishing the buyer-facing details and preview checks."
                : savedProduct.productStatus === "Pending review"
                  ? "The next step is watching review status from the seller dashboard."
                  : savedProduct.isPurchasable
                    ? "The next step is watching the dashboard for buyer activity and earnings."
                    : "The listing is published, but payouts still need to be connected before it can sell."}
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {(savedProduct.productStatus === "Draft"
                ? [
                    "Add stronger descriptions, preview pages, and a cover image if you want to move beyond draft.",
                    "Use the seller dashboard to find the listing again and keep improving it.",
                    "You can also create another listing right away if you are batching uploads.",
                  ]
                : savedProduct.productStatus === "Pending review"
                  ? [
                      "The listing is now in the review queue.",
                      "Use the seller dashboard to check status and respond if changes are requested.",
                      "You can create another listing while this one is waiting.",
                    ]
                  : savedProduct.isPurchasable
                    ? [
                        "The listing is live and ready for buyers.",
                        "Use the seller dashboard to watch sales, earnings, and listing health.",
                        "Create another listing if you want to keep building the store.",
                      ]
                    : [
                        "The listing is published, but payouts still need to be connected.",
                        "Finish Stripe setup before this listing can move into buyer checkout.",
                        "After payouts are connected, use the seller dashboard to track sales and earnings.",
                      ]).map((detail) => (
                <div
                  key={detail}
                  className="rounded-[1rem] border border-white/70 bg-white/80 px-4 py-3 text-sm leading-6 text-ink-soft"
                >
                  {detail}
                </div>
              ))}
            </div>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Link
                className="inline-flex items-center justify-center rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
                href={
                  savedProduct.productStatus === "Draft"
                    ? "/sell/dashboard?view=needs-action"
                    : "/sell/dashboard"
                }
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
          <p className="mt-5 text-sm leading-6 text-ink-soft" data-testid="seller-creator-message">
            {message}
          </p>
        ) : null}
      </section>

      <aside className="space-y-6">
        <section className="rounded-[24px] bg-slate-950 p-5 text-white shadow-[0_24px_80px_rgba(15,23,42,0.15)]">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white">
            <FileUp className="h-5 w-5" />
          </div>
          <h2 className="mt-4 text-lg font-semibold">Listing flow</h2>
          <div className="mt-3 space-y-2 text-sm leading-6 text-white/75">
            <p>Draft first so you can work safely.</p>
            <p>Move to review after preview, thumbnail, and rights checks are done.</p>
            <p>Published buyer-ready products can appear in browse, storefront, and checkout.</p>
          </div>
        </section>

        <section className="rounded-[24px] border border-black/5 bg-white p-5 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <h2 className="text-lg font-semibold text-ink">Good first product</h2>
          <div className="mt-3 space-y-3 text-sm leading-6 text-ink-soft">
            <p>
              Choose a resource with a clear classroom use, not your biggest bundle. A focused first listing is easier to finish and easier for buyers to understand.
            </p>
            <p>
              If you are not ready to publish, save a draft and return from the seller dashboard.
            </p>
          </div>
        </section>

        <section className="rounded-[24px] border border-black/5 bg-white p-5 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand">
            <WandSparkles className="h-5 w-5" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-ink">Payout status</h2>
          <p className="mt-2 text-sm leading-6 text-ink-soft">
            {seller
              ? `Payouts connected for ${seller.displayName || profile?.displayName || seller.email || "this seller"}. Published products can become sellable.`
              : "No connected Stripe account yet. Products can still be drafted or sent to review."}
          </p>
        </section>

        <section className="rounded-[24px] border border-black/5 bg-white p-5 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-700">
                Earnings motivation
              </p>
              <h2 className="mt-2 text-lg font-semibold text-ink">
                Better optimization can increase visibility and sales
              </h2>
            </div>
            {!premiumAccess?.revenueInsights.unlocked ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">
                <Lock className="h-3.5 w-3.5" />
                Locked on Starter
              </span>
            ) : null}
          </div>
          <div className="mt-4 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-soft">
              Estimated monthly revenue
            </p>
            <p className={`mt-2 text-3xl font-semibold text-ink ${premiumAccess?.revenueInsights.unlocked ? "" : "blur-[4px]"}`}>
              {formatUsd(estimatedMonthlyRevenueCents)}
            </p>
            <p className="mt-2 text-sm leading-6 text-ink-soft">
              {premiumAccess?.revenueInsights.unlocked
                ? "Use this estimate as a simple planning target while you tighten the listing and move toward publish-ready quality."
                : "Upgrade to see performance insights and improve results."}
            </p>
          </div>
          {!premiumAccess?.revenueInsights.unlocked ? (
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
                      reason: "revenue_insights",
                      targetPlan: "basic",
                    },
                  })
                }
              >
                Upgrade Plan
              </Link>
              <button
                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:border-slate-300"
                onClick={() =>
                  void (async () => {
                    setMessage("Upgrade to see performance insights and improve results.");
                    await trackMonetizationEvent({
                      eventType: "locked_feature_clicked",
                      source: "seller_creator",
                      planKey: currentPlanKey,
                      metadata: {
                        feature: "revenue_insights",
                      },
                    });
                  })()
                }
                type="button"
              >
                Why this is locked
              </button>
            </div>
          ) : null}
        </section>

        <ProductAssetPanel
          assetVersionNumber={1}
          format={files.length ? inferFormatFromFiles(files) : "Uploaded Resource"}
          gradeBand={gradeBand}
          previewIncluded={previewIncluded}
          productId={title ? `draft-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}` : "draft-product"}
          subject={subject}
          summary={fullDescription || shortDescription || notes}
          thumbnailIncluded={thumbnailIncluded}
          title={title || "Untitled resource"}
        />
      </aside>
    </div>
  );
}
