import type { Metadata } from "next";

import Link from "next/link";

import { AccountOverviewClient } from "@/components/account/account-overview-client";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { getOwnerAccessContext } from "@/lib/auth/owner-access";
import { buildNoIndexMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildNoIndexMetadata(
  "Account",
  "Private LessonForgeHub account area for signed-in users.",
);

export default async function AccountPage() {
  const ownerAccess = await getOwnerAccessContext();

  return (
    <main className="page-shell min-h-screen">
      <SiteHeader />
      <section className="px-5 py-10 sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <AccountOverviewClient />
          {ownerAccess.isOwner ? (
            <div className="mt-6 rounded-[1.5rem] border border-brand/15 bg-brand-soft/50 px-5 py-5 text-sm leading-6 text-ink-soft shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">
                Owner access
              </p>
              <p className="mt-2 text-lg font-semibold text-ink">
                Open founder tools without leaving your normal account flow.
              </p>
              <p className="mt-2 max-w-3xl">
                Your account stays the owner account. These links only change which side of the site you are looking at.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  className="inline-flex items-center justify-center rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
                  href="/founder"
                >
                  Open founder dashboard
                </Link>
                <Link
                  className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:border-slate-300"
                  href="/marketplace"
                >
                  View storefront
                </Link>
              </div>
            </div>
          ) : null}
          <div className="mt-6 rounded-[1.5rem] border border-ink/5 bg-white px-5 py-4 text-sm leading-6 text-ink-soft shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
            <p className="font-semibold text-ink">Help improve LessonForgeHub</p>
            <p className="mt-1">
              If something felt unclear or frustrating, send a private note to the owner.
            </p>
            <Link
              className="mt-3 inline-flex rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:border-slate-300"
              href="/feedback?source=account"
            >
              Give feedback
            </Link>
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
