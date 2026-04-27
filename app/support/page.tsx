import type { Metadata } from "next";
import { LifeBuoy, Mail, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { SectionIntro } from "@/components/shared/section-intro";
import { siteConfig } from "@/lib/config/site";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Support",
  description:
    "Find buyer support, seller setup help, payout guidance, and policy links for LessonForgeHub.",
  path: "/support",
});

const supportPaths = [
  {
    title: "Buyer purchase help",
    body: "Open your library to download files again, revisit a purchased listing, report an issue, or start a refund request when a file is broken, missing, corrupted, inaccessible, or clearly misleading.",
    href: "/library?view=support",
    action: "Open buyer support",
  },
  {
    title: "Seller setup help",
    body: "Use seller onboarding to save your store profile, connect payout setup, and review the rule that you should only upload original content you created or have rights to sell.",
    href: "/sell/onboarding",
    action: "Open seller setup",
  },
  {
    title: "Policy questions",
    body: "Review terms, privacy expectations, seller rules, refund rules, digital delivery details, and dispute handling so you know how LessonForgeHub handles digital access, listings, support, and disputes.",
    href: "/refund-policy",
    action: "Read refund policy",
  },
] as const;

const riskNotes = [
  "All products sold on LessonForgeHub are digital downloads. No physical items are shipped.",
  "All purchases provide access to downloadable digital resources.",
  "Due to the nature of digital products, all sales are final once access has been granted unless there is a duplicate purchase, corrupted or inaccessible file, or a product significantly not as described.",
  "Refunds are typically denied when access works, the listing was accurate, or the buyer changed their mind.",
  "Refunded purchases may lose protected download access.",
  "Sellers are responsible for accurate listings, working files, and rights to sell their materials.",
] as const;

const policyLinks = [
  { label: "Terms of Service", href: "/terms" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Refund Policy", href: "/refund-policy" },
  { label: "Seller Agreement", href: "/seller-agreement" },
  { label: "Payout Policy", href: "/payout-policy" },
  { label: "Copyright Policy", href: "/copyright-policy" },
  { label: "About LessonForgeHub", href: "/about" },
] as const;

export default function SupportPage() {
  return (
    <main className="page-shell min-h-screen">
      <SiteHeader />

      <section className="px-5 pb-20 pt-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-8">
          <section className="rounded-[36px] border border-black/5 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:p-8">
            <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
              <div>
                <SectionIntro
                  body="Use this page when you need help with a purchase, seller setup, payout onboarding, or marketplace policy question. LessonForgeHub is operated by LessonForge LLC, a registered U.S. business."
                  eyebrow="Support"
                  level="h1"
                  title="Help for purchases, sellers, and policy questions."
                  titleClassName="text-4xl leading-tight sm:text-5xl"
                />
                <div className="mt-6 rounded-[1.5rem] border border-brand/10 bg-brand-soft/60 px-5 py-4 text-sm leading-6 text-ink-soft">
                  <p className="font-semibold text-ink">Support email</p>
                  <a
                    className="mt-1 inline-flex items-center gap-2 text-lg font-semibold text-brand transition hover:text-brand-700"
                    href={`mailto:${siteConfig.supportEmail}`}
                  >
                    <Mail className="h-4 w-4" />
                    {siteConfig.supportEmail}
                  </a>
                  <p className="mt-2">
                    We respond to all support requests within 24–48 hours.
                  </p>
                  <p className="mt-2">
                    LessonForge LLC
                    <br />
                    2730 Dale St. North
                    <br />
                    Roseville, MN 55113
                  </p>
                  <p className="mt-2">
                    If you need help with a digital download, include the product title, order details, and what went wrong so support can review it faster.
                  </p>
                  <p className="mt-2">
                    All products sold on LessonForgeHub are digital downloads. No physical items are shipped. All purchases provide access to downloadable digital resources through the buyer account and/or a download link after purchase.
                  </p>
                  <p className="mt-2">
                    If you experience an issue with a purchase, please contact support before filing a payment dispute. We will review and respond within 24–48 hours.
                  </p>
                  <p className="mt-2">
                    We aim to resolve all issues quickly to avoid the need for external disputes.
                  </p>
                </div>
              </div>

              <div className="rounded-[28px] border border-emerald-100 bg-emerald-50 px-5 py-5 text-sm leading-6 text-emerald-950">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-emerald-700">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h2 className="mt-4 text-xl font-semibold text-ink">
                  What LessonForgeHub is designed to protect
                </h2>
                <div className="mt-3 grid gap-2 text-emerald-950/85">
                  <p>Buyer access should come from verified purchase records.</p>
                  <p>Seller payouts should run through platform payout onboarding and plan-based splits.</p>
                  <p>Policy, reporting, and support paths should stay visible before and after checkout.</p>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            {supportPaths.map((path) => (
              <article
                key={path.title}
                className="rounded-[28px] border border-black/5 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-soft text-brand">
                  <LifeBuoy className="h-5 w-5" />
                </div>
                <h2 className="mt-4 text-xl font-semibold text-ink">{path.title}</h2>
                <p className="mt-2 text-sm leading-7 text-ink-soft">{path.body}</p>
                <Link
                  className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
                  href={path.href}
                >
                  {path.action}
                </Link>
              </article>
            ))}
          </section>

          <section className="rounded-[30px] border border-amber-100 bg-amber-50 p-6 text-sm leading-7 text-amber-950 shadow-[0_18px_50px_rgba(15,23,42,0.05)] sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700">
              Refund basics
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-ink">
              Start with support before opening a refund.
            </h2>
            <div className="mt-4 grid gap-3 lg:grid-cols-4">
              {riskNotes.map((note) => (
                <p
                  className="rounded-[1.15rem] border border-amber-100 bg-white/75 px-4 py-3"
                  key={note}
                >
                  {note}
                </p>
              ))}
            </div>
          </section>

          <section className="rounded-[30px] border border-black/5 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand">
                  Policies
                </p>
                <h2 className="mt-3 text-2xl font-semibold text-ink">
                  Review the plain-language marketplace rules.
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-ink-soft">
                  These pages explain the current expectations for buying digital resources, receiving library access after purchase, selling original educational materials, handling personal information, and reviewing refund requests.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap lg:justify-end">
                {policyLinks.map((link) => (
                  <Link
                    key={link.href}
                    className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:border-slate-300"
                    href={link.href}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          </section>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
