"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Lock, WandSparkles } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { aiActionCosts, normalizePlanKey, planConfig } from "@/lib/config/plans";
import { getSellerModerationGuidance } from "@/lib/lessonforge/moderation-guidance";
import {
  getAiUpgradeMessage,
  getLockedFeatureMessage,
} from "@/lib/lessonforge/plan-enforcement";
import {
  getProductAssetHealthStatus,
  getProductPublishBlockers,
} from "@/lib/lessonforge/product-validation";
import {
  getSellerRemediationFocusLabel,
  type SellerRemediationFocus,
} from "@/lib/lessonforge/remediation-focus";
import { ProductAssetPanel } from "@/components/seller/product-asset-panel";
import { buildSellerPlanCheckoutHref } from "@/lib/stripe/seller-plan-billing";
import type { AdminAiSettings, ProductRecord, SellerProfileDraft } from "@/types";

function buildOptimizationPreview(input: {
  title: string;
  notes: string;
  subject: string;
  gradeBand: string;
}) {
  const workingTitle = input.title.trim() || `${input.gradeBand} ${input.subject} resource`;

  return {
    titleRewrite: `${workingTitle} | Clearer classroom fit`,
    descriptionRewrite: `Help buyers trust this listing faster with a tighter promise: ${input.notes.trim() || `Classroom-ready ${input.subject.toLowerCase()} support for ${input.gradeBand}.`}`,
    keywords: [input.subject, input.gradeBand, "buyer clarity", "teacher-ready", "easy to assign"],
  };
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

async function trackMonetizationEvent(input: {
  eventType: "ai_credit_limit_hit" | "locked_feature_clicked" | "upgrade_click";
  source: "seller_editor";
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
    // Tracking should not block the seller recovery flow.
  }
}

export function ProductEditor({ product }: { product: ProductRecord }) {
  const searchParams = useSearchParams();
  const [title, setTitle] = useState(product.title);
  const [subject, setSubject] = useState(product.subject);
  const [gradeBand, setGradeBand] = useState(product.gradeBand);
  const [price, setPrice] = useState(String((product.priceCents ?? 0) / 100 || 12));
  const [notes, setNotes] = useState(product.summary);
  const [licenseType, setLicenseType] = useState(
    product.licenseType ?? "Single classroom",
  );
  const [createdPath, setCreatedPath] = useState<ProductRecord["createdPath"]>(
    product.createdPath ?? "Manual upload",
  );
  const [previewIncluded, setPreviewIncluded] = useState(product.previewIncluded ?? false);
  const [thumbnailIncluded, setThumbnailIncluded] = useState(product.thumbnailIncluded ?? false);
  const [rightsConfirmed, setRightsConfirmed] = useState(product.rightsConfirmed ?? false);
  const [isEditorReady, setIsEditorReady] = useState(false);
  const [profile, setProfile] = useState<SellerProfileDraft | null>(null);
  const [subscription, setSubscription] = useState<{
    availableCredits: number;
    planKey: "starter" | "basic" | "pro";
  } | null>(null);
  const [aiSettings, setAiSettings] = useState<AdminAiSettings | null>(null);
  const [premiumAccess, setPremiumAccess] = useState<{
    fullListingOptimization: { unlocked: boolean; upgradePlanKey: "starter" | "basic" | "pro" };
    revenueInsights: { unlocked: boolean; upgradePlanKey: "starter" | "basic" | "pro" };
  } | null>(null);
  const moderationGuidance = getSellerModerationGuidance(product);
  const focusedSection = searchParams.get("focus") as SellerRemediationFocus | null;
  const focusedLabel = getSellerRemediationFocusLabel(focusedSection);
  const liveProduct: ProductRecord = {
    ...product,
    title,
    subject,
    gradeBand,
    summary: notes,
    fullDescription: notes.trim() || product.fullDescription || product.summary,
    licenseType,
    createdPath,
    previewIncluded,
    thumbnailIncluded,
    rightsConfirmed,
  };
  const liveBlockers = getProductPublishBlockers(liveProduct);
  const liveAssetHealth = getProductAssetHealthStatus(liveProduct);
  const liveChecklist = [
    {
      id: "preview",
      label: "Preview pages ready",
      done: previewIncluded,
    },
    {
      id: "thumbnail",
      label: "Thumbnail ready",
      done: thumbnailIncluded,
    },
    {
      id: "rights",
      label: "Rights confirmed",
      done: rightsConfirmed,
    },
  ] as const;
  const currentPlanKey = normalizePlanKey(profile?.sellerPlanKey);
  const lowAiCredits =
    Boolean(subscription) &&
    !aiSettings?.aiKillSwitchEnabled &&
    (subscription?.availableCredits ?? 0) <= aiActionCosts.standardsScan;
  const optimizationPreview = buildOptimizationPreview({
    title,
    notes,
    subject,
    gradeBand,
  });
  const projectedRecoveredRevenueCents = Math.max(
    1500,
    Math.round(
      (Number(price || 0) * 100) *
        Math.max(
          2,
          [
            title.trim().length > 0,
            notes.trim().length > 0,
            previewIncluded,
            thumbnailIncluded,
            rightsConfirmed,
          ].filter(Boolean).length,
        ),
    ),
  );

  useEffect(() => {
    setIsEditorReady(true);
  }, []);

  useEffect(() => {
    const sellerId = product.sellerId;
    const sellerEmail = product.sellerId;

    if (!sellerId || !sellerEmail) {
      return;
    }

    void (async () => {
      const [profilesResponse, aiResponse] = await Promise.all([
        fetch("/api/lessonforge/seller-profile"),
        fetch(
          `/api/lessonforge/seller-ai?sellerId=${encodeURIComponent(sellerId)}&sellerEmail=${encodeURIComponent(sellerEmail)}&sellerPlanKey=${encodeURIComponent(currentPlanKey)}`,
        ),
      ]);

      const profilesPayload = (await profilesResponse.json()) as {
        profiles?: SellerProfileDraft[];
      };
      const aiPayload = (await aiResponse.json()) as {
        aiSettings?: AdminAiSettings;
        subscription?: {
          availableCredits: number;
          planKey: "starter" | "basic" | "pro";
        } | null;
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

      if (profilesResponse.ok) {
        const matchedProfile = profilesPayload.profiles?.find(
          (entry) => entry.email === sellerEmail,
        );
        setProfile(
          matchedProfile
            ? {
                ...matchedProfile,
                sellerPlanKey: normalizePlanKey(matchedProfile.sellerPlanKey),
              }
            : null,
        );
      }

      if (aiResponse.ok) {
        setAiSettings(aiPayload.aiSettings ?? null);
        setSubscription(aiPayload.subscription ?? null);
        setPremiumAccess(aiPayload.premiumAccess ?? null);
      }
    })();
  }, [currentPlanKey, product.sellerId]);

  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="rounded-[32px] border border-black/5 bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand">
          Product remediation
        </p>
        <h1 className="mt-4 font-[family-name:var(--font-display)] text-5xl leading-tight text-ink">
          Update the listing and send it back through review.
        </h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-ink-soft">
          This editor is for seller fixes after moderation feedback. Adjust the
          listing details, keep what works, and resubmit without starting over.
        </p>
        <div className="mt-6 rounded-[1.5rem] border border-amber-100 bg-amber-50/80 p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-amber-800">
            Start here
          </p>
          <p className="mt-2 text-base font-semibold text-ink">
            Fix the blocked area first, then send the listing back to review.
          </p>
          <p className="mt-2 text-sm leading-6 text-ink-soft">
            Read the moderation note first, update only the blocked detail, preview, thumbnail,
            or rights step, then resubmit when the live blocker list is clear.
          </p>
        </div>
        {isEditorReady ? (
          <p className="sr-only" data-testid="seller-editor-ready">
            Editor ready
          </p>
        ) : null}
        {moderationGuidance ? (
          <div
            className="mt-6 rounded-[1.25rem] border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-950"
            data-testid="seller-editor-guidance"
          >
            <p className="font-semibold">{moderationGuidance.headline}</p>
            <p className="mt-2">{moderationGuidance.summary}</p>
            <div className="mt-3 space-y-1">
              {moderationGuidance.priorityActions.map((action) => (
                <p key={action}>{action}</p>
              ))}
            </div>
          </div>
        ) : null}
        {focusedLabel ? (
          <div
            className="mt-4 rounded-[1.25rem] border border-brand/20 bg-brand-soft/40 px-5 py-4 text-sm leading-6 text-ink"
            data-testid="seller-editor-focus-banner"
          >
            <p className="font-semibold">Focus next fix: {focusedLabel}</p>
            <p className="mt-1">
              This remediation link opened the editor at the highest-priority seller fix for this listing.
            </p>
          </div>
        ) : null}
        {(lowAiCredits || !premiumAccess?.fullListingOptimization.unlocked) ? (
          <div className="mt-5 rounded-[1.25rem] border border-brand/15 bg-brand-soft/35 px-5 py-4 text-sm leading-6 text-ink">
            <p className="font-semibold text-ink">Upgrade to grow faster</p>
            <p className="mt-1">
              {lowAiCredits
                ? getAiUpgradeMessage()
                : "Unlock more listings and better tools."}
            </p>
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
                    source: "seller_editor",
                    planKey: currentPlanKey,
                    metadata: {
                      reason: lowAiCredits ? "ai_credits" : "premium_recovery_tools",
                      targetPlan: "basic",
                      productId: product.id,
                    },
                  })
                }
              >
                Upgrade Plan
              </Link>
              <Link
                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:border-slate-300"
                href="/sell/dashboard"
              >
                Open seller dashboard
              </Link>
            </div>
          </div>
        ) : null}
        <form
          action={`/sell/products/${product.id}/save`}
          className="mt-4"
          method="post"
        >
          <div
            className="rounded-[1.25rem] border border-ink/10 bg-surface-subtle px-5 py-4 text-sm leading-6 text-ink"
            data-testid="seller-editor-live-progress"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-ink">Live remediation progress</p>
                <p className="text-ink-soft">
                  Asset health: {liveAssetHealth}
                </p>
              </div>
              <p className="text-sm font-medium text-ink-soft">
                {liveChecklist.filter((item) => item.done).length}/{liveChecklist.length} core checks ready
              </p>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {liveChecklist.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-[1rem] px-4 py-3 ${
                    item.done
                      ? "bg-emerald-50 text-emerald-800"
                      : "bg-white text-ink-soft"
                  }`}
                  data-testid={`seller-editor-progress-${item.id}`}
                >
                  <p className="font-semibold">{item.label}</p>
                  <p className="mt-1 text-sm">
                    {item.done ? "Resolved" : "Still blocking review"}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-3 space-y-1 text-ink-soft">
              {liveBlockers.length ? (
                liveBlockers.map((blocker) => (
                  <p key={blocker} data-testid="seller-editor-live-blocker">
                    {blocker}
                  </p>
                ))
              ) : (
                <p data-testid="seller-editor-live-ready">
                  Core remediation blockers are cleared. This listing is ready to go back into review.
                </p>
              )}
            </div>
          </div>

          <div className="mt-6 grid gap-4">
          <label
            className={`block rounded-[1.25rem] ${
              focusedSection === "details" ? "ring-2 ring-brand/30 ring-offset-2" : ""
            }`}
            data-testid="seller-editor-details-section"
          >
            <span className="text-sm font-semibold text-ink">Title</span>
            <input
              className="mt-2 w-full rounded-[1.25rem] border border-ink/10 bg-surface-subtle px-4 py-3 text-sm text-ink outline-none transition focus:border-brand"
              data-testid="seller-editor-title"
              name="title"
              onChange={(event) => setTitle(event.target.value)}
              required
              value={title}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold text-ink">Subject</span>
              <select
                className="mt-2 w-full rounded-[1.25rem] border border-ink/10 bg-surface-subtle px-4 py-3 text-sm text-ink outline-none transition focus:border-brand"
                data-testid="seller-editor-subject"
                name="subject"
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
                data-testid="seller-editor-grade-band"
                name="gradeBand"
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
                data-testid="seller-editor-price"
                min="1"
                name="price"
                onChange={(event) => setPrice(event.target.value)}
                type="number"
                value={price}
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-ink">License</span>
              <select
                className="mt-2 w-full rounded-[1.25rem] border border-ink/10 bg-surface-subtle px-4 py-3 text-sm text-ink outline-none transition focus:border-brand"
                data-testid="seller-editor-license"
                name="licenseType"
                onChange={(event) => setLicenseType(event.target.value)}
                value={licenseType}
              >
                <option>Single classroom</option>
                <option>Multiple classroom</option>
              </select>
            </label>
          </div>

          <label className="block">
            <span className="text-sm font-semibold text-ink">Creation path</span>
            <select
              className="mt-2 w-full rounded-[1.25rem] border border-ink/10 bg-surface-subtle px-4 py-3 text-sm text-ink outline-none transition focus:border-brand"
              data-testid="seller-editor-created-path"
              name="createdPath"
              onChange={(event) => setCreatedPath(event.target.value as ProductRecord["createdPath"])}
              value={createdPath}
            >
              <option>Manual upload</option>
              <option>Manual from scratch</option>
              <option>AI assisted</option>
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-ink">Listing notes</span>
            <textarea
              className="mt-2 min-h-32 w-full rounded-[1.25rem] border border-ink/10 bg-surface-subtle px-4 py-3 text-sm text-ink outline-none transition focus:border-brand"
              data-testid="seller-editor-notes"
              name="notes"
              onChange={(event) => setNotes(event.target.value)}
              value={notes}
            />
          </label>

          <div className="rounded-[1.5rem] border border-black/5 bg-surface-subtle p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-700">
              Buyer-ready checks
            </p>
            <p className="mt-2 text-base font-semibold text-ink">
              Clear only the checks still blocking review.
            </p>
            <p className="mt-2 text-sm leading-7 text-ink-soft">
              You do not need to rebuild the whole listing. You only need to fix what is still blocking approval.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <label
              className={`flex items-start gap-3 rounded-[1.25rem] border border-ink/10 bg-surface-subtle px-4 py-4 text-sm text-ink ${
                focusedSection === "preview" ? "ring-2 ring-brand/30 ring-offset-2" : ""
              }`}
              data-testid="seller-editor-preview-section"
            >
              <input
                checked={previewIncluded}
                className="mt-1 h-4 w-4 rounded border border-ink/20 text-brand focus:ring-brand"
                data-testid="seller-editor-preview-included"
                name="previewIncluded"
                onChange={(event) => setPreviewIncluded(event.target.checked)}
                type="checkbox"
              />
              <span>
                <span className="block font-semibold">Preview pages ready</span>
                <span className="mt-1 block text-ink-soft">
                  Required before publish or resubmission approval.
                </span>
              </span>
            </label>

            <label
              className={`flex items-start gap-3 rounded-[1.25rem] border border-ink/10 bg-surface-subtle px-4 py-4 text-sm text-ink ${
                focusedSection === "thumbnail" ? "ring-2 ring-brand/30 ring-offset-2" : ""
              }`}
              data-testid="seller-editor-thumbnail-section"
            >
              <input
                checked={thumbnailIncluded}
                className="mt-1 h-4 w-4 rounded border border-ink/20 text-brand focus:ring-brand"
                data-testid="seller-editor-thumbnail-included"
                name="thumbnailIncluded"
                onChange={(event) => setThumbnailIncluded(event.target.checked)}
                type="checkbox"
              />
              <span>
                <span className="block font-semibold">Thumbnail ready</span>
                <span className="mt-1 block text-ink-soft">
                  Needed for browse cards and seller storefront polish.
                </span>
              </span>
            </label>

            <label
              className={`flex items-start gap-3 rounded-[1.25rem] border border-ink/10 bg-surface-subtle px-4 py-4 text-sm text-ink ${
                focusedSection === "rights" ? "ring-2 ring-brand/30 ring-offset-2" : ""
              }`}
              data-testid="seller-editor-rights-section"
            >
              <input
                checked={rightsConfirmed}
                className="mt-1 h-4 w-4 rounded border border-ink/20 text-brand focus:ring-brand"
                data-testid="seller-editor-rights-confirmed"
                name="rightsConfirmed"
                onChange={(event) => setRightsConfirmed(event.target.checked)}
                type="checkbox"
              />
              <span>
                <span className="block font-semibold">Rights confirmed</span>
                <span className="mt-1 block text-ink-soft">
                  Seller confirms they own or can sell this content.
                </span>
              </span>
            </label>
          </div>
          </div>

          <div className="mt-8 rounded-[1.5rem] border border-emerald-100 bg-emerald-50/80 p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-800">
              Next step
            </p>
            <p className="mt-2 text-sm leading-7 text-ink-soft">
              Save as draft if you still need time. Save and resubmit when the blockers are cleared and you want admin to review again.
            </p>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:border-slate-300"
              data-testid="seller-editor-save-draft"
              name="nextStatus"
              type="submit"
              value="Draft"
            >
              Save as draft
            </button>
            <button
              className="inline-flex items-center justify-center gap-2 rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
              data-testid="seller-editor-save-resubmit"
              name="nextStatus"
              type="submit"
              value="Pending review"
            >
              Save and resubmit
              <ArrowRight className="h-4 w-4" />
            </button>
            <Link
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:border-slate-300"
              href="/sell/dashboard"
              data-testid="seller-editor-cancel"
            >
              Cancel
            </Link>
          </div>

        </form>
      </section>

      <aside className="space-y-6">
        <section className="rounded-[28px] bg-slate-950 p-6 text-white shadow-[0_24px_80px_rgba(15,23,42,0.15)]">
          <h2 className="text-xl font-semibold">Moderation feedback</h2>
          <p className="mt-4 text-sm leading-6 text-white/75">
            Status: {product.productStatus || "Draft"}
          </p>
          <p className="mt-3 text-sm leading-6 text-white/75">
            {product.moderationFeedback ||
              "No seller-facing moderation note is attached to this listing yet."}
          </p>
        </section>

        <section className="rounded-[28px] border border-black/5 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <h2 className="text-xl font-semibold text-ink">Resubmission path</h2>
          <div className="mt-4 space-y-2.5 text-sm leading-6 text-ink-soft">
            <p>Fix the specific blocker called out in moderation feedback first.</p>
            <p>Keep the listing clear enough that admin does not have to guess what changed.</p>
            <p>Use “Save and resubmit” only after the live progress box shows the blockers are cleared.</p>
          </div>
        </section>

        <section className="rounded-[28px] border border-black/5 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-700">
                AI and plan status
              </p>
              <h2 className="mt-2 text-xl font-semibold text-ink">
                Recovery tools for this listing
              </h2>
            </div>
            {!premiumAccess?.fullListingOptimization.unlocked ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">
                <Lock className="h-3.5 w-3.5" />
                Basic and Pro
              </span>
            ) : null}
          </div>
          <p className="mt-3 text-sm leading-6 text-ink-soft">
            {subscription
              ? `${planConfig[subscription.planKey].label} plan · ${subscription.availableCredits} AI credits remaining`
              : `Starter plan tools load here after the first seller-side AI action.`}
          </p>
          <p className="mt-2 text-sm leading-6 text-ink-soft">
            {lowAiCredits
              ? "This balance is tight for another standards scan or optimization pass."
              : aiSettings?.aiKillSwitchEnabled
                ? "AI is paused right now by admin controls."
                : "AI-assisted recovery tools are available from the current plan."}
          </p>
        </section>

        <section className="rounded-[28px] border border-black/5 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-ink">Full listing optimization</h2>
              <p className="mt-2 text-sm leading-6 text-ink-soft">
                Title rewrite, description rewrite, and keyword suggestions in one stronger paid workflow.
              </p>
            </div>
            {!premiumAccess?.fullListingOptimization.unlocked ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">
                <Lock className="h-3.5 w-3.5" />
                Locked on Starter
              </span>
            ) : (
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
                Included
              </span>
            )}
          </div>
          <div className="mt-4 space-y-3">
            <div className={`rounded-[1rem] bg-surface-subtle px-4 py-4 ${premiumAccess?.fullListingOptimization.unlocked ? "" : "blur-[2px]"}`}>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-soft">Title rewrite</p>
              <p className="mt-2 text-sm font-semibold text-ink">{optimizationPreview.titleRewrite}</p>
            </div>
            <div className={`rounded-[1rem] bg-surface-subtle px-4 py-4 ${premiumAccess?.fullListingOptimization.unlocked ? "" : "blur-[2px]"}`}>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-soft">Description rewrite</p>
              <p className="mt-2 text-sm leading-6 text-ink-soft">{optimizationPreview.descriptionRewrite}</p>
            </div>
            <div className={`rounded-[1rem] bg-surface-subtle px-4 py-4 ${premiumAccess?.fullListingOptimization.unlocked ? "" : "blur-[2px]"}`}>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-soft">Keyword suggestions</p>
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
                className="inline-flex items-center justify-center rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
                href={buildSellerPlanCheckoutHref({
                  planKey: "basic",
                  returnTo: "/sell/dashboard?focus=plan",
                })}
                onClick={() =>
                  void trackMonetizationEvent({
                    eventType: "upgrade_click",
                    source: "seller_editor",
                    planKey: currentPlanKey,
                    metadata: {
                      reason: "full_listing_optimization",
                      targetPlan: "basic",
                      productId: product.id,
                    },
                  })
                }
              >
                Upgrade to Basic
              </Link>
              <button
                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:border-slate-300"
                onClick={() =>
                  void trackMonetizationEvent({
                    eventType: "locked_feature_clicked",
                    source: "seller_editor",
                    planKey: currentPlanKey,
                    metadata: {
                      feature: "full_listing_optimization",
                      productId: product.id,
                    },
                  })
                }
                type="button"
              >
                {getLockedFeatureMessage()}
              </button>
            </div>
          ) : null}
        </section>

        <section className="rounded-[28px] border border-black/5 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-ink">Performance insights</h2>
              <p className="mt-2 text-sm leading-6 text-ink-soft">
                Better optimization can increase visibility and sales after the listing is back live.
              </p>
            </div>
            {!premiumAccess?.revenueInsights.unlocked ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">
                <Lock className="h-3.5 w-3.5" />
                Locked on Starter
              </span>
            ) : null}
          </div>
          <div className="mt-4 rounded-[1rem] bg-surface-subtle px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-soft">
              Estimated monthly revenue
            </p>
            <p className={`mt-2 text-3xl font-semibold text-ink ${premiumAccess?.revenueInsights.unlocked ? "" : "blur-[4px]"}`}>
              {formatCurrency(projectedRecoveredRevenueCents)}
            </p>
            <p className="mt-2 text-sm leading-6 text-ink-soft">
              {premiumAccess?.revenueInsights.unlocked
                ? "Use this as a simple benchmark while you tighten the listing and move it back toward buyer-ready quality."
                : "Upgrade to see performance insights and improve results."}
            </p>
          </div>
          {!premiumAccess?.revenueInsights.unlocked ? (
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <Link
                className="inline-flex items-center justify-center rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
                href={buildSellerPlanCheckoutHref({
                  planKey: "basic",
                  returnTo: "/sell/dashboard?focus=plan",
                })}
                onClick={() =>
                  void trackMonetizationEvent({
                    eventType: "upgrade_click",
                    source: "seller_editor",
                    planKey: currentPlanKey,
                    metadata: {
                      reason: "revenue_insights",
                      targetPlan: "basic",
                      productId: product.id,
                    },
                  })
                }
              >
                Upgrade Plan
              </Link>
              <button
                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:border-slate-300"
                onClick={() =>
                  void trackMonetizationEvent({
                    eventType: "locked_feature_clicked",
                    source: "seller_editor",
                    planKey: currentPlanKey,
                    metadata: {
                      feature: "revenue_insights",
                      productId: product.id,
                    },
                  })
                }
                type="button"
              >
                Unlock more listings and better tools
              </button>
            </div>
          ) : null}
        </section>

        <ProductAssetPanel
          assetVersionNumber={product.assetVersionNumber}
          format={product.format}
          gradeBand={gradeBand}
          originalAssetUrl={product.originalAssetUrl}
          previewAssetUrls={product.previewAssetUrls}
          previewIncluded={previewIncluded}
          productId={product.id}
          subject={subject}
          summary={notes}
          thumbnailIncluded={thumbnailIncluded}
          title={title}
        />
      </aside>
    </div>
  );
}
