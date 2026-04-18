import type { Metadata } from "next";

import Link from "next/link";

import { PrivateFeedbackForm } from "@/components/feedback/private-feedback-form";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { SectionIntro } from "@/components/shared/section-intro";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Give Feedback",
  description:
    "Send private feedback to the LessonForgeHub owner about what felt confusing, frustrating, or worth improving.",
  path: "/feedback",
  noIndex: true,
});

export default async function FeedbackPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const source =
    typeof resolvedSearchParams?.source === "string"
      ? resolvedSearchParams.source
      : "feedback_page";

  return (
    <main className="page-shell min-h-screen">
      <SiteHeader />
      <section className="px-5 pb-20 pt-10 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <section className="rounded-[36px] border border-black/5 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:p-8">
            <SectionIntro
              body="If something felt unclear, frustrating, or surprisingly helpful, send a quick private note. This helps improve LessonForgeHub without turning your feedback into a public review."
              eyebrow="Give feedback"
              level="h1"
              title="Help make LessonForgeHub easier for teachers."
              titleClassName="text-4xl leading-tight sm:text-5xl"
            />
            <div className="mt-6 rounded-[1.35rem] border border-brand/10 bg-brand-soft/50 px-5 py-4 text-sm leading-6 text-ink-soft">
              <p className="font-semibold text-ink">Private by design</p>
              <p className="mt-1">
                Feedback is only used by the owner to improve the site. It is not shown publicly and does not affect sellers, payouts, listings, or buyer access.
              </p>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:border-slate-300"
                href="/support"
              >
                Need support instead?
              </Link>
              <Link
                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:border-slate-300"
                href="/marketplace"
              >
                Return to marketplace
              </Link>
            </div>
          </section>

          <PrivateFeedbackForm source={source} />
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
