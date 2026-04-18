import type { Metadata } from "next";

import Link from "next/link";

import { AccountOverviewClient } from "@/components/account/account-overview-client";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { buildNoIndexMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildNoIndexMetadata(
  "Account",
  "Private LessonForgeHub account area for signed-in users.",
);

export default function AccountPage() {
  return (
    <main className="page-shell min-h-screen">
      <SiteHeader />
      <section className="px-5 py-10 sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <AccountOverviewClient />
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
