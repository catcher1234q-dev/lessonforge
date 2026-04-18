"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import Link from "next/link";

import { AuthSheet } from "@/components/layout/auth-sheet";
import { SectionIntro } from "@/components/shared/section-intro";
import { getSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase/client";

type AccountOverviewPayload = {
  viewer: {
    name: string;
  };
  buyer: {
    purchaseCount: number;
    favoriteCount: number;
    openRefundRequestCount: number;
    openReportCount: number;
    lastPurchaseAt: string | null;
    recentPurchases: Array<{
      id: string;
      productId: string;
      productTitle: string;
      purchasedAt: string;
      amountCents: number;
      sellerName: string;
    }>;
    activityTimeline: Array<{
      id: string;
      kind: "purchase" | "saved" | "refund" | "report";
      title: string;
      detail: string;
      createdAt: string;
      statusLabel: string;
      href: string;
      actionLabel: string;
      secondaryHref?: string;
      secondaryActionLabel?: string;
    }>;
  };
  seller: {
    onboardingCompleted: boolean;
    listingCount: number;
    liveListingCount: number;
    buyerReadyListingCount: number;
    completedSales: number;
    grossSalesCents: number;
    sellerEarningsCents: number;
    lastSaleAt: string | null;
    recentSales: Array<{
      id: string;
      productId: string;
      productTitle: string;
      amountCents: number;
      sellerShareCents: number;
      purchasedAt: string;
      buyerName: string;
      versionLabel: string;
      actionHref: string;
      actionLabel: string;
      secondaryHref?: string;
      secondaryActionLabel?: string;
    }>;
    recentListings: Array<{
      id: string;
      title: string;
      updatedAt: string;
      productStatus: string;
      isPurchasable: boolean;
      actionHref: string;
      actionLabel: string;
      secondaryHref?: string;
      secondaryActionLabel?: string;
    }>;
  };
};

function formatTimelineTime(value?: string | null) {
  if (!value) {
    return "Not yet";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function getBuyerActivityTone(activity: AccountOverviewPayload["buyer"]["activityTimeline"][number]) {
  if (activity.kind === "purchase") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (activity.kind === "saved") {
    return "border-sky-200 bg-sky-50 text-sky-800";
  }

  if (activity.kind === "refund") {
    return activity.statusLabel === "Submitted"
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : "border-slate-200 bg-slate-100 text-slate-700";
  }

  return activity.statusLabel === "Resolved" || activity.statusLabel === "Dismissed"
    ? "border-slate-200 bg-slate-100 text-slate-700"
    : "border-rose-200 bg-rose-50 text-rose-800";
}

export function AccountOverviewClient() {
  const [session, setSession] = useState<Session | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [overview, setOverview] = useState<AccountOverviewPayload | null>(null);
  const [isOverviewLoading, setIsOverviewLoading] = useState(false);

  useEffect(() => {
    if (!hasSupabaseEnv()) {
      setIsSessionLoading(false);
      return;
    }

    const supabase = getSupabaseBrowserClient();

    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsSessionLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setIsSessionLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setOverview(null);
      return;
    }

    setIsOverviewLoading(true);
    void (async () => {
      try {
        const response = await fetch("/api/lessonforge/account-overview");
        const payload = (await response.json()) as AccountOverviewPayload;

        if (response.ok) {
          setOverview(payload);
        }
      } finally {
        setIsOverviewLoading(false);
      }
    })();
  }, [session]);

  if (isSessionLoading) {
    return (
      <div className="rounded-[2rem] border border-ink/5 bg-white p-6 text-sm text-ink-soft shadow-soft-xl sm:p-8">
        Checking your account access...
      </div>
    );
  }

  if (!hasSupabaseEnv()) {
    return (
      <div className="rounded-[2rem] border border-ink/5 bg-white p-6 shadow-soft-xl sm:p-8">
        <SectionIntro
          body="This account page will open after the site owner finishes the Supabase sign-in setup. Public browsing and product discovery still work while account access is being connected."
          eyebrow="Account access"
          level="h1"
          title="Accounts are being connected."
          titleClassName="text-4xl"
        />
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            className="inline-flex items-center justify-center rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
            href="/marketplace"
          >
            Open marketplace
          </Link>
          <Link
            className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:border-slate-300"
            href="/sell"
          >
            Open seller flow
          </Link>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="rounded-[2rem] border border-ink/5 bg-white p-6 shadow-soft-xl sm:p-8">
        <SectionIntro
          body="Your purchases, saved items, seller listings, and earnings live here, but this page is only for signed-in accounts."
          eyebrow="Account access"
          level="h1"
          title="Sign in to open your account."
          titleClassName="text-4xl"
        />
        <div className="mt-6 flex flex-wrap gap-3">
          <AuthSheet triggerLabel="Log in" />
          <AuthSheet triggerLabel="Create account" triggerVariant="primary" />
        </div>
      </div>
    );
  }

  if (isOverviewLoading || !overview) {
    return (
      <div className="rounded-[2rem] border border-ink/5 bg-white p-6 text-sm text-ink-soft shadow-soft-xl sm:p-8">
        Loading your account overview...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="rounded-[36px] border border-black/5 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:p-8">
        <div className="flex flex-col gap-8 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <SectionIntro
              body={`${overview.viewer.name} can reopen purchases, manage saved resources, finish seller setup, and track earnings without guessing where to go next.`}
              eyebrow="Account"
              level="h1"
              title="Your LessonForgeHub activity, organized."
              titleClassName="text-4xl leading-tight sm:text-5xl"
            />
            <p className="mt-3 text-sm leading-7 text-ink-soft">
              Use this page as your home base after login: purchases stay tied to your library, saved items stay easy to compare, and support items stay visible.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <Link
                className="rounded-[1rem] border border-brand/10 bg-brand-soft/60 px-4 py-4 text-sm leading-6 text-ink-soft transition hover:border-brand/20"
                href="/library"
              >
                <p className="font-semibold text-ink">Open buyer library</p>
                <p className="mt-1">Download purchased files, check updates, and handle support.</p>
              </Link>
              <Link
                className="rounded-[1rem] border border-sky-100 bg-sky-50/80 px-4 py-4 text-sm leading-6 text-ink-soft transition hover:border-sky-200"
                href="/favorites"
              >
                <p className="font-semibold text-ink">Review saved items</p>
                <p className="mt-1">Compare resources before buying and remove what no longer fits.</p>
              </Link>
              <Link
                className="rounded-[1rem] border border-emerald-100 bg-emerald-50 px-4 py-4 text-sm leading-6 text-ink-soft transition hover:border-emerald-200"
                href={overview.seller.onboardingCompleted ? "/sell/dashboard" : "/sell/onboarding"}
              >
                <p className="font-semibold text-ink">Open seller workspace</p>
                <p className="mt-1">
                  {overview.seller.onboardingCompleted
                    ? "Check listings, sales, payout status, and seller next steps."
                    : "Finish seller setup so listings and payouts are ready."}
                </p>
              </Link>
            </div>
            <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-slate-50 px-5 py-4 text-sm leading-6 text-ink-soft">
              <p className="font-semibold text-ink">Best buyer next step</p>
              <p className="mt-1">
                {overview.buyer.purchaseCount > 0
                  ? "Open your library first if you need files again. Browse marketplace when you are ready to add the next classroom resource."
                  : overview.buyer.favoriteCount > 0
                    ? "Review saved items first. They are already shortlisted, so checkout decisions should be faster."
                    : "Browse the marketplace and open previews before your first purchase."}
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:w-[360px] xl:grid-cols-1">
            <article className="rounded-[24px] border border-brand/10 bg-brand-soft/60 px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
                Account home
              </p>
              <p className="mt-3 text-2xl font-semibold text-ink">Your fastest next stop</p>
              <p className="mt-2 text-sm leading-6 text-ink-soft">
                Start here when you want the shortest path back to purchased files, saved resources, or seller work.
              </p>
            </article>
            <article className="rounded-[24px] border border-emerald-100 bg-emerald-50 px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                Seller earnings
              </p>
              <p className="mt-3 text-3xl font-semibold text-ink">
                {formatCurrency(overview.seller.sellerEarningsCents)}
              </p>
              <p className="mt-2 text-sm leading-6 text-ink-soft">
                Seller share recorded from completed purchases so far.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <article className="rounded-[1.5rem] border border-ink/5 bg-white p-5 shadow-soft-xl">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-ink-muted">
            Buyer overview
          </p>
          <p className="mt-3 text-3xl font-semibold text-ink">{overview.buyer.purchaseCount}</p>
          <p className="mt-2 text-sm leading-7 text-ink-soft">
            {overview.buyer.favoriteCount} saved item{overview.buyer.favoriteCount === 1 ? "" : "s"} waiting. Last purchase {formatTimelineTime(overview.buyer.lastPurchaseAt)}
          </p>
        </article>
        <article className="rounded-[1.5rem] border border-ink/5 bg-white p-5 shadow-soft-xl">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-ink-muted">
            Buyer support
          </p>
          <p className="mt-3 text-3xl font-semibold text-ink">
            {overview.buyer.openRefundRequestCount + overview.buyer.openReportCount}
          </p>
          <p className="mt-2 text-sm leading-7 text-ink-soft">
            {overview.buyer.openRefundRequestCount} refund request
            {overview.buyer.openRefundRequestCount === 1 ? "" : "s"} and{" "}
            {overview.buyer.openReportCount} report
            {overview.buyer.openReportCount === 1 ? "" : "s"} still open.
          </p>
        </article>
        <article className="rounded-[1.5rem] border border-ink/5 bg-white p-5 shadow-soft-xl">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-ink-muted">
            Seller overview
          </p>
          <p className="mt-3 text-3xl font-semibold text-ink">{overview.seller.liveListingCount}</p>
          <p className="mt-2 text-sm leading-7 text-ink-soft">
            {overview.seller.buyerReadyListingCount} buyer-ready right now. Payout setup is{" "}
            {overview.seller.onboardingCompleted ? "ready" : "still needed"}.
          </p>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <article className="rounded-[1.5rem] border border-ink/5 bg-white p-5 shadow-soft-xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-ink">Buyer activity</h2>
              <p className="mt-1 text-sm leading-6 text-ink-soft">
                Recent buyer actions and the fastest next moves.
              </p>
            </div>
            <Link
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:border-slate-300"
              href="/library"
            >
              Open your purchases
            </Link>
          </div>
          <div className="mt-4 grid gap-3">
            {overview.buyer.recentPurchases.length ? (
              overview.buyer.recentPurchases.slice(0, 3).map((purchase) => (
                <div
                  key={purchase.id}
                  className="rounded-[1rem] border border-ink/5 bg-surface-subtle px-4 py-3"
                >
                  <p className="font-semibold leading-6 text-ink">{purchase.productTitle}</p>
                  <p className="mt-1 text-sm leading-5 text-ink-soft">
                    Sold by {purchase.sellerName} · {formatTimelineTime(purchase.purchasedAt)}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-ink">
                    {formatCurrency(purchase.amountCents)}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-[1rem] border border-ink/5 bg-surface-subtle px-4 py-4 text-sm leading-6 text-ink-soft">
                No purchases yet. Browse the marketplace, preview a resource, and your first completed checkout will appear in the library automatically.
              </div>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              className="inline-flex items-center justify-center rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
              href="/marketplace"
            >
              Browse marketplace
            </Link>
            <Link
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:border-slate-300"
              href="/favorites"
            >
              Open saved items
            </Link>
            {overview.buyer.purchaseCount > 0 ? (
              <Link
                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:border-slate-300"
                href="/library"
              >
                Reopen library
              </Link>
            ) : null}
          </div>
        </article>

        <article className="rounded-[1.5rem] border border-ink/5 bg-white p-5 shadow-soft-xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-ink">Seller activity</h2>
              <p className="mt-1 text-sm leading-6 text-ink-soft">
                Sales, listings, and the next seller move.
              </p>
            </div>
            <Link
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:border-slate-300"
              href="/sell/dashboard"
            >
              Open seller dashboard
            </Link>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[1rem] border border-ink/5 bg-surface-subtle px-4 py-4">
              <p className="text-sm text-ink-soft">Completed sales</p>
              <p className="mt-1 text-2xl font-semibold text-ink">{overview.seller.completedSales}</p>
            </div>
            <div className="rounded-[1rem] border border-ink/5 bg-surface-subtle px-4 py-4">
              <p className="text-sm text-ink-soft">Gross sales</p>
              <p className="mt-1 text-2xl font-semibold text-ink">
                {formatCurrency(overview.seller.grossSalesCents)}
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-3">
            {overview.seller.recentSales.length ? (
              overview.seller.recentSales.slice(0, 3).map((sale) => (
                <div
                  key={sale.id}
                  className="rounded-[1rem] border border-ink/5 bg-surface-subtle px-4 py-3"
                >
                  <p className="font-semibold leading-6 text-ink">{sale.productTitle}</p>
                  <p className="mt-1 text-sm leading-5 text-ink-soft">
                    {sale.buyerName} · {formatTimelineTime(sale.purchasedAt)}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-ink">
                    You earned {formatCurrency(sale.sellerShareCents)}
                  </p>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    <Link
                      className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-ink transition hover:border-slate-300"
                      href={sale.actionHref}
                    >
                      {sale.actionLabel}
                    </Link>
                    {sale.secondaryHref && sale.secondaryActionLabel ? (
                      <Link
                        className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-ink transition hover:border-slate-300"
                        href={sale.secondaryHref}
                      >
                        {sale.secondaryActionLabel}
                      </Link>
                    ) : null}
                  </div>
                </div>
              ))
            ) : overview.seller.recentListings.length ? (
              overview.seller.recentListings.slice(0, 3).map((listing) => (
                <div
                  key={listing.id}
                  className="rounded-[1rem] border border-ink/5 bg-surface-subtle px-4 py-3"
                >
                  <p className="font-semibold leading-6 text-ink">{listing.title}</p>
                  <p className="mt-1 text-sm leading-5 text-ink-soft">
                    {listing.productStatus} · Updated {formatTimelineTime(listing.updatedAt)}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-ink">
                    {listing.isPurchasable ? "Buyer-ready" : "Needs more setup"}
                  </p>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    <Link
                      className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-ink transition hover:border-slate-300"
                      href={listing.actionHref}
                    >
                      {listing.actionLabel}
                    </Link>
                    {listing.secondaryHref && listing.secondaryActionLabel ? (
                      <Link
                        className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-ink transition hover:border-slate-300"
                        href={listing.secondaryHref}
                      >
                        {listing.secondaryActionLabel}
                      </Link>
                    ) : null}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[1rem] border border-ink/5 bg-surface-subtle px-4 py-4 text-sm leading-6 text-ink-soft">
                No seller activity yet. Complete seller onboarding, connect payouts, then create your first listing so buyers have something real to browse.
              </div>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              className="inline-flex items-center justify-center rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
              href={overview.seller.onboardingCompleted ? "/sell/products/new" : "/sell/onboarding"}
            >
              {overview.seller.onboardingCompleted ? "Create a listing" : "Finish seller setup"}
            </Link>
            <Link
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:border-slate-300"
              href="/sell/dashboard"
            >
              Check listings
            </Link>
          </div>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.42fr_0.58fr]">
        <article className="rounded-[1.5rem] border border-ink/5 bg-white p-5 shadow-soft-xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-ink">Buyer support snapshot</h2>
              <p className="mt-1 text-sm leading-6 text-ink-soft">
                What still needs follow-up or a decision.
              </p>
            </div>
            <Link
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:border-slate-300"
              href="/library?view=support"
            >
              Open buyer support
            </Link>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <div className="rounded-[1rem] border border-ink/5 bg-surface-subtle px-4 py-3.5">
              <p className="text-sm text-ink-soft">Saved for later</p>
              <p className="mt-1 text-2xl font-semibold text-ink">
                {overview.buyer.favoriteCount}
              </p>
              <p className="mt-2 text-sm leading-5 text-ink-soft">
                Shortlist items still waiting for a buy-or-remove decision.
              </p>
            </div>
            <div className="rounded-[1rem] border border-ink/5 bg-surface-subtle px-4 py-3.5">
              <p className="text-sm text-ink-soft">Open refund requests</p>
              <p className="mt-1 text-2xl font-semibold text-ink">
                {overview.buyer.openRefundRequestCount}
              </p>
              <p className="mt-2 text-sm leading-5 text-ink-soft">
                Refund requests still waiting on a decision.
              </p>
            </div>
            <div className="rounded-[1rem] border border-ink/5 bg-surface-subtle px-4 py-3.5">
              <p className="text-sm text-ink-soft">Open issue reports</p>
              <p className="mt-1 text-2xl font-semibold text-ink">
                {overview.buyer.openReportCount}
              </p>
              <p className="mt-2 text-sm leading-5 text-ink-soft">
                Buyer issue reports still being reviewed or resolved.
              </p>
            </div>
          </div>
        </article>

        <article className="rounded-[1.5rem] border border-ink/5 bg-white p-5 shadow-soft-xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-ink">Buyer timeline</h2>
              <p className="mt-1 text-sm leading-6 text-ink-soft">
                Saved, bought, refunded, and reported activity in one shorter history.
              </p>
            </div>
            <Link
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:border-slate-300"
              href="/account"
            >
              Refresh account
            </Link>
          </div>
          <div className="mt-4 grid gap-3">
            {overview.buyer.activityTimeline.length ? (
              overview.buyer.activityTimeline.slice(0, 6).map((activity) => (
                <div
                  key={activity.id}
                  className="rounded-[1rem] border border-ink/5 bg-surface-subtle px-4 py-3"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div
                        className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${getBuyerActivityTone(activity)}`}
                      >
                        {activity.statusLabel}
                      </div>
                      <p className="mt-2 font-semibold leading-6 text-ink">{activity.title}</p>
                      <p className="mt-1 text-sm leading-5 text-ink-soft">{activity.detail}</p>
                    </div>
                    <div className="flex flex-col items-start gap-2 sm:items-end">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
                        {formatTimelineTime(activity.createdAt)}
                      </p>
                      <div className="flex flex-wrap gap-2 sm:justify-end">
                        <Link
                          className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-ink transition hover:border-slate-300"
                          href={activity.href}
                        >
                          {activity.actionLabel}
                        </Link>
                        {activity.secondaryHref && activity.secondaryActionLabel ? (
                          <Link
                            className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-ink transition hover:border-slate-300"
                            href={activity.secondaryHref}
                          >
                            {activity.secondaryActionLabel}
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[1rem] border border-ink/5 bg-surface-subtle px-4 py-4 text-sm leading-6 text-ink-soft">
                No buyer account history yet. Save a listing, preview a resource, or complete a purchase to start building account history.
              </div>
            )}
          </div>
        </article>
      </section>
    </div>
  );
}
