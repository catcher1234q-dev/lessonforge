"use client";

import { useEffect, useState } from "react";
import { ArrowRight, BadgeDollarSign, Store } from "lucide-react";
import Link from "next/link";

import { secondaryActionLinkClassName } from "@/components/shared/secondary-action-link";
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

function buildConnectedSeller(profile: SellerProfileDraft): ConnectedSeller | null {
  if (!profile.stripeAccountId) {
    return null;
  }

  return {
    accountId: profile.stripeAccountId,
    chargesEnabled: profile.stripeChargesEnabled,
    email: profile.email,
    displayName: profile.displayName || profile.storeName || "Seller",
    payoutsEnabled: profile.stripePayoutsEnabled,
    status:
      profile.stripeChargesEnabled && profile.stripePayoutsEnabled
        ? "connected"
        : "setup_incomplete",
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

export function SellerOnboardingForm() {
  const [profile, setProfile] = useState<SellerProfileDraft>(defaultProfile);
  const [selectedPlanKey, setSelectedPlanKey] = useState<PlanKey>("starter");
  const [connectedSeller, setConnectedSeller] = useState<ConnectedSeller | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [returnState, setReturnState] = useState<"connected" | "refresh" | "complete" | null>(null);
  const selectedPlan = planConfig[normalizePlanKey(selectedPlanKey)];

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const planBilling = params.get("planBilling");
    const targetPlan = normalizePlanKey(params.get("targetPlan"));

    void (async () => {
      try {
        const response = await fetch("/api/session/viewer");
        const payload = response.ok
          ? ((await response.json()) as {
              viewer?: { role?: string; name?: string; email?: string };
            })
          : {};

        if (!response.ok || payload.viewer?.role !== "seller") {
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

        if (baseProfile.stripeAccountId) {
          const connectResponse = await fetch("/api/stripe/connect");
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
        setConnectedSeller(buildConnectedSeller(nextProfile));

        if (nextProfile.stripeAccountId) {
          if (nextProfile.stripeChargesEnabled && nextProfile.stripePayoutsEnabled) {
            setReturnState("connected");
            setMessage(
              `${nextProfile.displayName || "Seller"} connected Stripe payouts. Your seller account is ready for the dashboard and product flow.`,
            );
          } else {
            setReturnState("refresh");
            setMessage(
              `${nextProfile.displayName || "Seller"} still needs to finish Stripe onboarding before payouts can go live.`,
            );
          }
        } else if (planBilling === "success") {
          setMessage(
            `${planConfig[targetPlan].label} checkout finished in Stripe. Your paid seller plan should appear after the billing sync completes.`,
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
      setConnectedSeller(buildConnectedSeller(savedProfile));
      setMessage(
        selectedPlanKey === "starter"
          ? "Seller profile saved. You can keep refining it before launch."
          : "Seller profile saved. Paid plans only become active after Stripe checkout, so your account stays on Starter until billing is completed.",
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

  async function handleConnectStripe() {
    if (
      !profile.displayName.trim() ||
      !profile.email.trim() ||
      !profile.storeName.trim() ||
      !profile.storeHandle.trim()
    ) {
      setMessage(
        "Add your display name, email, store name, and store handle before starting Stripe onboarding.",
      );
      return;
    }

    try {
      setIsConnecting(true);
      setMessage(null);
      console.log("Connecting to Stripe");

      const savedProfile = await handleSaveProfile();

      if (!savedProfile) {
        return;
      }

      window.location.href = "/api/stripe/connect?redirectToStripe=1";
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
      <section className="rounded-[32px] border border-black/5 bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand">
          Seller onboarding
        </p>
        <h1 className="mt-4 font-[family-name:var(--font-display)] text-5xl leading-tight text-ink">
          Set up your store before publishing real listings.
        </h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-ink-soft">
          This dedicated flow keeps seller setup separate from the homepage. Fill
          out the basic store identity first, save it, then connect Stripe so
          payouts and identity checks happen in the right place.
        </p>

        <div
          className={`mt-6 rounded-[1.35rem] border p-4 ${
            returnState === "connected"
              ? "border-emerald-100 bg-emerald-50/80"
              : returnState === "refresh"
                ? "border-amber-100 bg-amber-50/80"
                : "border-emerald-100 bg-emerald-50/80"
          }`}
        >
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-ink">
            {returnState === "connected"
              ? "Stripe connected"
              : returnState === "refresh"
                ? "Pick up here"
                : "Start here"}
          </p>
          <p className="mt-2 text-base font-semibold text-ink">
            {returnState === "connected"
              ? "Stripe is done. The last step is creating your first listing."
              : returnState === "refresh"
                ? "Your saved seller setup is still here."
                : "Add the four basics that make your store feel real."}
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {(returnState === "connected"
              ? [
                  "Payouts are linked, so your store setup is finished.",
                  "Create your first listing now so buyers have something real to see and buy.",
                  "After that, use the seller dashboard to track readiness, sales, and earnings.",
                ]
              : returnState === "refresh"
                ? [
                    "Stripe still needs more details before payouts can finish.",
                  "Review your seller basics here, then reopen Stripe onboarding.",
                  "Your saved seller profile is still here, so you are not starting over.",
                ]
              : [
                    "Name, email, store name, and handle are enough for the first save.",
                    "Buyers will later see this on your storefront and listings.",
                    "After this, connect Stripe payouts, then move into product creation.",
                  ]).map((detail) => (
              <div
                key={detail}
                className="rounded-[1rem] border border-white/70 bg-white/80 px-4 py-3 text-sm leading-6 text-ink-soft"
              >
                {detail}
              </div>
            ))}
          </div>
        </div>

        {returnState === "connected" ? (
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              className="inline-flex items-center justify-center rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
              href="/sell/products/new"
            >
              Create your first listing
            </Link>
            <Link
              className={secondaryActionLinkClassName("px-5 py-3")}
              href="/sell/dashboard?setup=payouts-connected"
            >
              Open seller dashboard
            </Link>
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-semibold text-ink">Display name</span>
            <input
              className="mt-2 w-full rounded-[1.25rem] border border-ink/10 bg-surface-subtle px-4 py-3 text-sm text-ink outline-none transition focus:border-brand"
              onChange={(event) => updateProfile("displayName", event.target.value)}
              placeholder="Avery Johnson"
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
                      <p className="mt-1 font-semibold text-ink">{plan.sellerSharePercent}% payout</p>
                    </div>
                    <div className="rounded-[1rem] bg-white px-3 py-3 text-sm text-ink-soft">
                      Publish
                      <p className="mt-1 font-semibold text-ink">
                        {plan.activeListingLimit} listing{plan.activeListingLimit === 1 ? "" : "s"}
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
                {selectedPlan.label} gives you {selectedPlan.sellerSharePercent}% seller payout, {selectedPlan.activeListingLimit} active listing{selectedPlan.activeListingLimit === 1 ? "" : "s"}, and {selectedPlan.creditGrantLabel.toLowerCase()}.
              </p>
              <p className="mt-2 text-ink-soft">
                {selectedPlan.key === "starter"
                  ? "Starter is active right away after you save."
                  : `${selectedPlan.label} is a paid plan. Save your seller profile first, then use Stripe checkout to activate it for real.`}
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
            disabled={isConnecting || isSaving}
            onClick={() => {
              void handleConnectStripe();
            }}
            type="button"
          >
            {isConnecting || isSaving ? "Opening Stripe" : "Connect Stripe"}
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
                <p>Enough setup to move into the dashboard and product flow.</p>
                <p>Stripe payout setup and AI plan choices later on.</p>
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
              ? `Connected seller account: ${connectedSeller.displayName} (${connectedSeller.email})`
              : connectedSeller?.status === "setup_incomplete"
                ? `Stripe account found for ${connectedSeller.displayName} (${connectedSeller.email}), but onboarding is still incomplete.`
                : "No connected Stripe seller account detected yet."}
          </p>
          <div className="mt-4 rounded-[1rem] bg-surface-subtle px-4 py-4 text-sm leading-6 text-ink-soft">
            <p className="font-semibold text-ink">Current plan value</p>
            <p className="mt-1">
              {selectedPlan.label} keeps {selectedPlan.sellerSharePercent}% of each sale, includes {selectedPlan.activeListingLimit} active listing{selectedPlan.activeListingLimit === 1 ? "" : "s"}, and gives you {selectedPlan.creditGrantLabel.toLowerCase()}.
            </p>
          </div>
        </section>
      </aside>
    </div>
  );
}
