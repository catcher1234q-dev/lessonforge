"use client";

import { useEffect, useState } from "react";
import { ArrowRight, BadgeDollarSign, CheckCircle2, FilePlus2, ShieldCheck, Store } from "lucide-react";
import Link from "next/link";

import { trackFunnelEvent } from "@/lib/analytics/events";
import { normalizePlanKey, planConfig, type PlanKey } from "@/lib/config/plans";
import { buildSellerPlanCheckoutHref } from "@/lib/stripe/seller-plan-billing";
import type { ConnectedSeller, SellerProfileDraft } from "@/types";

const defaultProfile: SellerProfileDraft = {
  displayName: "",
  email: "",
  storeName: "",
  storeHandle: "",
  primarySubject: "Math",
  tagline: "",
  sellerPlanKey: "starter",
  onboardingCompleted: false,
};

function buildSavedProfile(profile: SellerProfileDraft) {
  return {
    ...profile,
    onboardingCompleted: Boolean(
      profile.displayName && profile.email && profile.storeName && profile.storeHandle,
    ),
  };
}

function buildFallbackProfile(viewer?: {
  name?: string;
  email?: string;
}): SellerProfileDraft {
  const email = viewer?.email || "";
  const displayName = viewer?.name || "";

  return {
    ...defaultProfile,
    displayName,
    email,
    storeName: displayName,
    storeHandle: email.split("@")[0]?.replace(/[^a-z0-9-]+/gi, "-") || "",
  };
}

function formatPrice(monthlyPriceUsd: number) {
  return monthlyPriceUsd === 0 ? "$0/month" : `$${monthlyPriceUsd}/month`;
}

function buildConnectedSellerFromProfile(profile: SellerProfileDraft): ConnectedSeller | null {
  if (profile.paypalMerchantId) {
    return {
      accountId: profile.paypalMerchantId,
      displayName: profile.displayName || profile.storeName || "Seller",
      email: profile.email,
      provider: "paypal",
      status:
        profile.paypalPayoutsEnabled && profile.paypalConsentGranted
          ? "connected"
          : "setup_incomplete",
      payoutsEnabled: profile.paypalPayoutsEnabled,
    };
  }

  if (profile.stripeAccountId) {
    return {
      accountId: profile.stripeAccountId,
      displayName: profile.displayName || profile.storeName || "Seller",
      email: profile.email,
      provider: "stripe",
      status:
        profile.stripeChargesEnabled && profile.stripePayoutsEnabled
          ? "connected"
          : "setup_incomplete",
      chargesEnabled: profile.stripeChargesEnabled,
      payoutsEnabled: profile.stripePayoutsEnabled,
    };
  }

  return null;
}

function getSellerConnectionProviderLabel(
  connectedSeller: ConnectedSeller | null,
  profile: SellerProfileDraft,
) {
  if (connectedSeller?.provider === "stripe" || profile.stripeAccountId) {
    return "Stripe";
  }

  return "PayPal";
}

export function SellerOnboardingForm() {
  const [profile, setProfile] = useState<SellerProfileDraft>(defaultProfile);
  const [selectedPlanKey, setSelectedPlanKey] = useState<PlanKey>("starter");
  const [connectedSeller, setConnectedSeller] = useState<ConnectedSeller | null>(null);
  const [hasListings, setHasListings] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [returnState, setReturnState] = useState<"connected" | "refresh" | "complete" | null>(null);
  const selectedPlan = planConfig[normalizePlanKey(selectedPlanKey)];
  const payoutProviderLabel = getSellerConnectionProviderLabel(connectedSeller, profile);
  const profileBasicsComplete = Boolean(
    profile.displayName.trim() &&
      profile.email.trim() &&
      profile.storeName.trim() &&
      profile.storeHandle.trim(),
  );
  const payoutsConnected = connectedSeller?.status === "connected";
  const payoutsStarted = Boolean(profile.paypalMerchantId || profile.stripeAccountId || connectedSeller);
  const setupSteps = [
    {
      label: "Store profile",
      status: profileBasicsComplete ? "Complete" : "Needed",
      detail: "Your store is set",
      icon: Store,
      ready: profileBasicsComplete,
    },
    {
      label: "Payout setup",
      status: payoutsConnected ? "Connected" : payoutsStarted ? "In progress" : "Next",
      detail: "Payments are connected",
      icon: ShieldCheck,
      ready: payoutsConnected,
    },
    {
      label: "First listing",
      status: profileBasicsComplete && payoutsConnected ? "Ready" : "After setup",
      detail: "Create your first product",
      icon: FilePlus2,
      ready: profileBasicsComplete && payoutsConnected,
    },
  ];
  const listingCta = hasListings
    ? {
        title: "You’re live",
        detail: "Keep building from your seller dashboard.",
        href: "/sell/dashboard",
        label: "Go to Dashboard",
        helper: null,
      }
    : {
        title: "Create your first listing",
        detail: "Start selling in minutes",
        href: "/sell/products/new",
        label: "Create Listing",
        helper: "AI helps fill this for you",
      };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const planBilling = params.get("planBilling");
    const targetPlan = normalizePlanKey(params.get("targetPlan"));

    void (async () => {
      try {
        const response = await fetch("/api/session/viewer");
        const payload = response.ok
          ? ((await response.json()) as {
              signedIn?: boolean;
              viewer?: { role?: string; name?: string; email?: string };
            })
          : {};

        if (!response.ok || !payload.signedIn || !payload.viewer?.email) {
          return;
        }

        const profilesResponse = await fetch("/api/lessonforge/seller-profile");
        const profilesPayload = profilesResponse.ok
          ? ((await profilesResponse.json()) as {
              profiles?: SellerProfileDraft[];
            })
          : { profiles: [] };
        const matchedProfile = profilesPayload.profiles?.find(
          (entry) => entry.email === payload.viewer?.email,
        );
        const baseProfile = matchedProfile
          ? {
              ...matchedProfile,
              sellerPlanKey: normalizePlanKey(matchedProfile.sellerPlanKey),
            }
          : buildFallbackProfile(payload.viewer);
        setSelectedPlanKey(normalizePlanKey(baseProfile.sellerPlanKey));

        let nextProfile = baseProfile;

        if (baseProfile.paypalMerchantId || baseProfile.stripeAccountId) {
          const connectResponse = await fetch(
            baseProfile.paypalMerchantId ? "/api/paypal/connect" : "/api/stripe/connect",
          );
          const connectPayload = connectResponse.ok
            ? ((await connectResponse.json()) as {
                profile?: SellerProfileDraft;
              })
            : { profile: undefined };

          if (connectPayload.profile) {
            nextProfile = {
              ...connectPayload.profile,
              sellerPlanKey: normalizePlanKey(connectPayload.profile.sellerPlanKey),
            };
          }
        }

        setProfile(nextProfile);
        setConnectedSeller(buildConnectedSellerFromProfile(nextProfile));

        const productsResponse = await fetch("/api/lessonforge/products").catch(() => null);
        if (productsResponse?.ok) {
          const productsPayload = (await productsResponse.json()) as {
            products?: Array<{ sellerId?: string }>;
          };
          const sellerId = nextProfile.email || payload.viewer?.email;
          setHasListings(
            Boolean(
              sellerId &&
                productsPayload.products?.some(
                  (product) => product.sellerId === sellerId,
                ),
            ),
          );
        }

        if (nextProfile.paypalMerchantId || nextProfile.stripeAccountId) {
          if (
            (nextProfile.paypalMerchantId &&
              nextProfile.paypalPayoutsEnabled &&
              nextProfile.paypalConsentGranted) ||
            (!nextProfile.paypalMerchantId &&
              nextProfile.stripeChargesEnabled &&
              nextProfile.stripePayoutsEnabled)
          ) {
            setReturnState("connected");
            setMessage(
              `${nextProfile.displayName || "Seller"} finished payout setup. Your seller account is ready for the dashboard and product flow.`,
            );
          } else {
            setReturnState("refresh");
            setMessage(
              `${nextProfile.displayName || "Seller"} still needs to finish payout onboarding before payouts can go live.`,
            );
          }
        } else if (planBilling === "success") {
          setMessage(
            `${planConfig[targetPlan].label} checkout finished. Your paid seller plan should appear after the billing sync completes.`,
          );
        } else if (planBilling === "cancelled") {
          setMessage(
            `${planConfig[targetPlan].label} checkout was cancelled. Your seller profile is still saved here, and you can reopen paid plan checkout when you are ready.`,
          );
        }
      } catch (error) {
        setConnectedSeller(null);
        setMessage(
          error instanceof Error
            ? error.message
            : "Seller onboarding could not load right now.",
        );
      }
    })();
  }, []);

  function updateProfile<K extends keyof SellerProfileDraft>(
    key: K,
    value: SellerProfileDraft[K],
  ) {
    setProfile((current) => ({ ...current, [key]: value }));
  }

  async function handleSaveProfile(nextProfileInput?: SellerProfileDraft) {
    const nextProfile = buildSavedProfile({
      ...(nextProfileInput ?? profile),
      sellerPlanKey: selectedPlanKey,
    });

    try {
      setIsSaving(true);
      const response = await fetch("/api/lessonforge/seller-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          profile: nextProfile,
        }),
      });
      const payload = (await response.json()) as {
        profile?: SellerProfileDraft;
        error?: string;
      };

      if (!response.ok || !payload.profile) {
        throw new Error(payload.error || "Unable to save seller profile.");
      }

      const savedProfile = {
        ...payload.profile,
        sellerPlanKey: normalizePlanKey(payload.profile.sellerPlanKey),
      };

      setProfile(savedProfile);
      if (savedProfile.sellerPlanKey === "starter") {
        setSelectedPlanKey((current) => (current === "starter" ? "starter" : current));
      } else {
        setSelectedPlanKey(normalizePlanKey(savedProfile.sellerPlanKey));
      }
      setConnectedSeller(buildConnectedSellerFromProfile(savedProfile));
      trackFunnelEvent("seller_profile_saved", {
        selectedPlan: selectedPlanKey,
        savedPlan: savedProfile.sellerPlanKey,
        hasStoreHandle: Boolean(savedProfile.storeHandle),
      });
      setMessage(
        selectedPlanKey === "starter"
          ? "Seller profile saved. You can keep refining it before launch."
          : "Seller profile saved. Paid plans only become active after checkout is completed, so your account stays on Starter until billing is completed.",
      );
      return savedProfile;
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to save seller profile.",
      );
      return null;
    } finally {
      setIsSaving(false);
    }
  }

  async function handleConnectPayouts() {
    if (
      !profile.displayName.trim() ||
      !profile.email.trim() ||
      !profile.storeName.trim() ||
      !profile.storeHandle.trim()
    ) {
      setMessage(
        "Add your display name, email, store name, and store handle before starting payout onboarding.",
      );
      return;
    }

    try {
      setIsConnecting(true);
      setMessage(null);
      trackFunnelEvent("seller_payout_connect_clicked", {
        selectedPlan: selectedPlanKey,
      });

      const savedProfile = await handleSaveProfile();

      if (!savedProfile) {
        return;
      }

      window.location.href = "/api/paypal/connect?redirectToPayPal=1";
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to start seller onboarding.",
      );
    } finally {
      setIsConnecting(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
      <section className="rounded-[32px] border border-black/5 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand">
          Seller onboarding
        </p>
        <h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl leading-tight text-ink sm:text-5xl">
          Finish setup and create your first listing.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-ink-soft sm:text-lg">
          Keep this simple: finish setup, then create one product. Only upload classroom resources you created yourself or have clear rights to sell.
        </p>

        <div className="mt-6 rounded-[1.25rem] border border-amber-100 bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-950">
          Sellers must upload original work or content they have rights to distribute. Copyrighted publisher materials, copied worksheets, trademarked characters, answer keys you do not own, protected curriculum content, misleading files, and unauthorized resale content are not allowed.
        </div>

        <div className="mt-4 rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-ink-soft">
          <p className="font-semibold text-ink">Seller policy acknowledgment</p>
          <p className="mt-2">
            By selling on LessonForgeHub, you agree to the{" "}
            <Link className="font-semibold text-brand transition hover:text-brand-700" href="/seller-agreement">
              Seller Agreement
            </Link>
            ,{" "}
            <Link className="font-semibold text-brand transition hover:text-brand-700" href="/payout-policy">
              Payout Policy
            </Link>
            , and{" "}
            <Link className="font-semibold text-brand transition hover:text-brand-700" href="/refund-policy">
              Refund Policy
            </Link>
            . LessonForgeHub may remove listings or restrict seller access when content violates marketplace policy.
          </p>
        </div>

        <div className="mt-6 grid gap-3 lg:grid-cols-3">
          {setupSteps.map((step) => {
            const Icon = step.icon;

            return (
              <div
                key={step.label}
                className={`flex h-full flex-col rounded-[1.25rem] border bg-white p-4 ${
                  step.ready
                    ? "border-emerald-200"
                    : "border-slate-200"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-2xl ${
                      step.ready ? "bg-emerald-50 text-emerald-700" : "bg-surface-subtle text-brand"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${
                      step.ready
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-surface-subtle text-ink-soft"
                    }`}
                  >
                    {step.status}
                  </span>
                </div>
                <p className="mt-4 text-base font-semibold text-ink">{step.label}</p>
                <p className="mt-1 text-sm leading-6 text-ink-soft">{step.detail}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-5 rounded-[1.25rem] border border-slate-200 bg-white p-5">
          <p className="text-xl font-semibold text-ink">{listingCta.title}</p>
          <p className="mt-1 text-sm leading-6 text-ink-soft">{listingCta.detail}</p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              className="inline-flex items-center justify-center rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
              href={listingCta.href}
            >
              {listingCta.label}
            </Link>
            {listingCta.helper ? (
              <p className="text-sm text-ink-soft">{listingCta.helper}</p>
            ) : null}
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-semibold text-ink">Display name</span>
            <input
              className="mt-2 w-full rounded-[1.25rem] border border-ink/10 bg-surface-subtle px-4 py-3 text-sm text-ink outline-none transition focus:border-brand"
              onChange={(event) => updateProfile("displayName", event.target.value)}
              placeholder="Your name"
              value={profile.displayName}
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-ink">Email</span>
            <input
              className="mt-2 w-full rounded-[1.25rem] border border-ink/10 bg-surface-subtle px-4 py-3 text-sm text-ink outline-none transition focus:border-brand"
              onChange={(event) => updateProfile("email", event.target.value)}
              placeholder="avery@school.org"
              type="email"
              value={profile.email}
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-ink">Store name</span>
            <input
              className="mt-2 w-full rounded-[1.25rem] border border-ink/10 bg-surface-subtle px-4 py-3 text-sm text-ink outline-none transition focus:border-brand"
              onChange={(event) => updateProfile("storeName", event.target.value)}
              placeholder="Teach With Avery"
              value={profile.storeName}
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-ink">Store handle</span>
            <input
              className="mt-2 w-full rounded-[1.25rem] border border-ink/10 bg-surface-subtle px-4 py-3 text-sm text-ink outline-none transition focus:border-brand"
              onChange={(event) => updateProfile("storeHandle", event.target.value)}
              placeholder="teach-with-avery"
              value={profile.storeHandle}
            />
          </label>
        </div>

        <div className="mt-8 rounded-[1.35rem] border border-black/5 bg-surface-subtle p-4">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-700">
            Add next
          </p>
          <p className="mt-2 text-base font-semibold text-ink">
            Fill in the subject, short store description, and seller plan when you are ready.
          </p>
          <p className="mt-2 text-sm leading-6 text-ink-soft">
            These details help the seller dashboard and storefront feel more complete. The plan choice is where you decide how much payout, AI support, and publishing room you want from the start.
          </p>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-semibold text-ink">Primary subject</span>
            <select
              className="mt-2 w-full rounded-[1.25rem] border border-ink/10 bg-surface-subtle px-4 py-3 text-sm text-ink outline-none transition focus:border-brand"
              onChange={(event) => updateProfile("primarySubject", event.target.value)}
              value={profile.primarySubject}
            >
              <option>Math</option>
              <option>ELA</option>
              <option>Science</option>
              <option>Social Studies</option>
            </select>
          </label>

          <label className="block sm:col-span-2">
            <span className="text-sm font-semibold text-ink">Short store tagline</span>
            <textarea
              className="mt-2 min-h-28 w-full rounded-[1.25rem] border border-ink/10 bg-surface-subtle px-4 py-3 text-sm text-ink outline-none transition focus:border-brand"
              onChange={(event) => updateProfile("tagline", event.target.value)}
              placeholder="Practical intervention and small-group resources for upper elementary teachers."
              value={profile.tagline}
            />
          </label>

          <div className="sm:col-span-2">
            <span className="text-sm font-semibold text-ink">Seller plan</span>
            <div className="mt-3 grid gap-3 lg:grid-cols-3">
              {(Object.values(planConfig) as Array<(typeof planConfig)[PlanKey]>).map((plan) => (
                <button
                  key={plan.key}
                  className={`rounded-[1.5rem] border px-4 py-4 text-left transition ${
                    selectedPlanKey === plan.key
                      ? "border-brand bg-brand-soft/50"
                      : "border-ink/10 bg-surface-subtle hover:border-brand/30"
                  }`}
                  onClick={() => setSelectedPlanKey(plan.key)}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
                        {plan.label}
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-ink">
                        {formatPrice(plan.monthlyPriceUsd)}
                      </p>
                    </div>
                    {plan.badgeLabel ? (
                      <span className="rounded-full bg-brand px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white">
                        {plan.badgeLabel}
                      </span>
                    ) : null}
                  </div>
                  {plan.valueNote ? (
                    <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-brand">
                      {plan.valueNote}
                    </p>
                  ) : null}
                  <div className="mt-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                    <div className="rounded-[1rem] bg-white px-3 py-3 text-sm text-ink-soft">
                      Keep more
                      <p className="mt-1 font-semibold text-ink">Keep {plan.sellerSharePercent}%</p>
                    </div>
                    <div className="rounded-[1rem] bg-white px-3 py-3 text-sm text-ink-soft">
                      Publish
                      <p className="mt-1 font-semibold text-ink">
                        Unlimited uploads
                      </p>
                    </div>
                    <div className="rounded-[1rem] bg-white px-3 py-3 text-sm text-ink-soft">
                      AI support
                      <p className="mt-1 font-semibold text-ink">{plan.creditGrantLabel}</p>
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-ink-soft">
                    {plan.bestFor}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-ink-soft">
                    {plan.key === "starter"
                      ? "Useful for testing one listing before paying for more room."
                      : plan.key === "basic"
                        ? "Best starting point for most sellers who want better payout and enough support to publish consistently."
                        : "Best fit when you want premium support, heavier publishing, and the strongest payout share."}
                  </p>
                </button>
              ))}
            </div>
            <div className="mt-4 rounded-[1rem] border border-brand/10 bg-brand-soft/35 px-4 py-4 text-sm leading-6 text-ink">
              <p className="font-semibold text-ink">
                Selected plan: {selectedPlan.label}
              </p>
              <p className="mt-1">
                {selectedPlan.label} gives you {selectedPlan.sellerSharePercent}% seller payout, unlimited product uploads, and {selectedPlan.creditGrantLabel.toLowerCase()}.
              </p>
              <p className="mt-2 text-ink-soft">
                {selectedPlan.key === "starter"
                  ? "Starter is active right away after you save."
                  : `${selectedPlan.label} is a paid plan. Save your seller profile first, then use checkout to activate it for real.`}
              </p>
              {selectedPlan.key !== "starter" ? (
                <Link
                  className="mt-4 inline-flex items-center justify-center rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
                  href={buildSellerPlanCheckoutHref({
                    planKey: selectedPlan.key,
                    returnTo: "/sell/onboarding",
                  })}
                >
                  Continue to {selectedPlan.label} checkout
                </Link>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button
            className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:border-slate-300"
            disabled={isSaving || isConnecting}
            onClick={() => {
              void handleSaveProfile();
            }}
            type="button"
          >
            {isSaving ? "Saving profile" : "Save seller profile"}
          </button>
          <button
            className="inline-flex items-center justify-center gap-2 rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
            data-analytics-event="seller_payout_connect_button_pressed"
            data-analytics-props={JSON.stringify({ selectedPlan: selectedPlanKey })}
            disabled={isConnecting || isSaving}
            onClick={() => {
              void handleConnectPayouts();
            }}
            type="button"
          >
            {isConnecting || isSaving ? "Opening payout setup" : "Connect payouts"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        {message ? (
          <p className="mt-5 text-sm leading-6 text-ink-soft">{message}</p>
        ) : null}
      </section>

      <aside className="space-y-6">
        <section className="rounded-[24px] bg-slate-950 p-5 text-white shadow-[0_24px_80px_rgba(15,23,42,0.15)]">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white">
            <Store className="h-5 w-5" />
          </div>
          <h2 className="mt-4 text-lg font-semibold">
            {returnState === "connected" ? "What to do last" : "What this step unlocks"}
          </h2>
          <div className="mt-3 space-y-2 text-sm leading-6 text-white/75">
            {returnState === "connected" ? (
              <>
                <p>Create your first listing.</p>
                <p>Add preview pages, a cover image, and the pricing details buyers need.</p>
                <p>Then use the seller dashboard to watch sales, earnings, and listing status.</p>
              </>
            ) : (
              <>
                <p>A recognizable store identity on listings and storefront pages.</p>
                <p>Payout setup is required before products can sell through the marketplace.</p>
                <p>Refunds, disputes, chargebacks, or rights issues can delay, adjust, or reverse seller earnings while they are reviewed.</p>
                <p>A clearer next step into your first listing when setup is complete.</p>
              </>
            )}
          </div>
        </section>

        <section className="rounded-[24px] border border-black/5 bg-white p-5 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand">
            <BadgeDollarSign className="h-5 w-5" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-ink">Current payout state</h2>
          <p className="mt-2 text-sm leading-6 text-ink-soft">
            {connectedSeller?.status === "connected"
              ? `Connected ${payoutProviderLabel} seller account: ${connectedSeller.displayName} (${connectedSeller.email})`
              : connectedSeller?.status === "setup_incomplete"
                ? `A ${payoutProviderLabel} payout account was found for ${connectedSeller.displayName} (${connectedSeller.email}), but onboarding is still incomplete.`
                : "No connected payout account was detected yet."}
          </p>
          <div className="mt-4 rounded-[1rem] bg-surface-subtle px-4 py-4 text-sm leading-6 text-ink-soft">
            <p className="font-semibold text-ink">Current plan value</p>
            <p className="mt-1">
              {selectedPlan.label} keeps {selectedPlan.sellerSharePercent}% of each sale, supports unlimited product uploads, and gives you {selectedPlan.creditGrantLabel.toLowerCase()}.
            </p>
          </div>
          <div className="mt-4 rounded-[1rem] border border-ink/5 bg-white px-4 py-4 text-sm leading-6 text-ink-soft">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-brand" />
              <p>
                {payoutProviderLabel} may ask for identity and bank details. That is normal for payout setup and helps keep money movement secure.
              </p>
            </div>
          </div>
          <div className="mt-4 rounded-[1rem] bg-surface-subtle px-4 py-4 text-sm leading-6 text-ink-soft">
            <p className="font-semibold text-ink">Policy links</p>
            <p className="mt-1">
              Review the{" "}
              <Link className="font-semibold text-brand transition hover:text-brand-700" href="/seller-agreement">
                Seller Agreement
              </Link>
              ,{" "}
              <Link className="font-semibold text-brand transition hover:text-brand-700" href="/payout-policy">
                Payout Policy
              </Link>
              , and{" "}
              <Link className="font-semibold text-brand transition hover:text-brand-700" href="/refund-policy">
                Refund Policy
              </Link>
              {" "}before publishing your first listing.
            </p>
          </div>
        </section>
      </aside>
    </div>
  );
}
