import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";

import { FounderOpsDashboard } from "@/components/admin/founder-ops-dashboard";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { SectionIntro } from "@/components/shared/section-intro";
import { secondaryActionLinkClassName } from "@/components/shared/secondary-action-link";
import { getOwnerAccessContext } from "@/lib/auth/owner-access";
import { getFounderOpsSnapshot } from "@/lib/lessonforge/founder-ops";
import { buildNoIndexMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildNoIndexMetadata(
  "Founder Operations",
  "Private LessonForgeHub monitoring and support dashboard for the founder.",
);

async function getRequestOrigin() {
  const headerStore = await headers();
  const forwardedProto = headerStore.get("x-forwarded-proto");
  const host = headerStore.get("x-forwarded-host") || headerStore.get("host");
  const protocol = forwardedProto || (process.env.NODE_ENV === "production" ? "https" : "http");

  return host ? `${protocol}://${host}` : "http://localhost:3000";
}

export default async function FounderOperationsPage() {
  const ownerAccess = await getOwnerAccessContext();

  if (!ownerAccess.isOwner) {
    return (
      <main className="page-shell min-h-screen">
        <SiteHeader />
        <section className="px-5 pb-20 pt-10 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl rounded-[36px] border border-black/5 bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
            <SectionIntro
              body="This founder operations page is private because it combines site monitoring, support signals, dispute queues, and policy review work in one place."
              eyebrow="Private founder area"
              level="h1"
              title="Founder operations access is private."
              titleClassName="text-4xl leading-tight"
            />
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                className="inline-flex items-center justify-center rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
                href="/owner-access"
              >
                Open private access
              </Link>
              <Link
                className={secondaryActionLinkClassName("px-5 py-3")}
                href="/marketplace"
              >
                Open marketplace
              </Link>
            </div>
          </div>
        </section>
        <SiteFooter />
      </main>
    );
  }

  const origin = await getRequestOrigin();
  const snapshot = await getFounderOpsSnapshot(origin);

  return (
    <main className="page-shell min-h-screen">
      <SiteHeader />

      <section className="px-5 pb-20 pt-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-8">
          <section className="rounded-[36px] border border-black/5 bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
            <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr] xl:items-start">
              <div>
                <SectionIntro
                  body="This founder-only dashboard is the supervised AI operations layer for LessonForgeHub. It watches the public site, surfaces support and policy queues, and suggests next actions without auto-refunding, auto-banning, or auto-deleting anything."
                  eyebrow="Founder operations"
                  level="h1"
                  title="Monitor launch health, support signals, and policy queues from one private place."
                  titleClassName="max-w-4xl leading-tight"
                />
                <div className="mt-6 grid gap-4 lg:grid-cols-3">
                  <div className="rounded-[1.5rem] bg-slate-50 p-5 text-sm leading-7 text-ink-soft">
                    <p className="font-semibold text-ink">Watch the site</p>
                    <p className="mt-1">
                      Route checks, auth email readiness, and database health stay visible here.
                    </p>
                  </div>
                  <div className="rounded-[1.5rem] bg-slate-50 p-5 text-sm leading-7 text-ink-soft">
                    <p className="font-semibold text-ink">Review the queues</p>
                    <p className="mt-1">
                      Support, policy, dispute, onboarding, and upload issue signals stay grouped for faster review.
                    </p>
                  </div>
                  <div className="rounded-[1.5rem] bg-slate-50 p-5 text-sm leading-7 text-ink-soft">
                    <p className="font-semibold text-ink">Approve the important actions</p>
                    <p className="mt-1">
                      AI may draft recommendations, but founder approval is required for refunds, seller removals, account actions, product takedowns, payout changes, or legal and copyright decisions.
                    </p>
                  </div>
                </div>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    className="inline-flex items-center justify-center rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
                    href="/admin"
                  >
                    Open admin workspace
                  </Link>
                  <Link
                    className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:border-slate-300"
                    href="/founder"
                  >
                    Back to founder dashboard
                  </Link>
                </div>
              </div>

              <div className="rounded-[30px] bg-slate-950 p-7 text-white">
                <p className="text-sm uppercase tracking-[0.2em] text-white/60">
                  Safety rules
                </p>
                <div className="mt-5 space-y-2 text-sm leading-7 text-white/75">
                  <p>AI may draft recommendations only</p>
                  <p>No automatic refunds</p>
                  <p>No automatic seller bans or removals</p>
                  <p>No automatic account actions or product takedowns</p>
                  <p>No automatic payout changes</p>
                  <p>No automatic legal or copyright decisions</p>
                </div>
              </div>
            </div>
          </section>

          <FounderOpsDashboard snapshot={snapshot} />
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
