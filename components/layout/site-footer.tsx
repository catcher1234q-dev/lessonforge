import { LifeBuoy, Mail, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { siteConfig } from "@/lib/config/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-ink/5 bg-white/80 px-5 py-8 sm:px-6 lg:px-8 lg:py-10">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,2.2fr)] lg:items-start">
          <div>
            <p className="font-[family-name:var(--font-display)] text-2xl text-ink">
              {siteConfig.productName}
            </p>
            <p className="mt-3 max-w-sm text-sm leading-6 text-ink-soft">
              A teacher-focused marketplace for selling classroom resources, buying with confidence, and keeping files and earnings organized in one place.
            </p>
            <div className="mt-4 grid gap-2 text-sm leading-6 text-ink-soft">
              <a className="inline-flex items-center gap-2 transition hover:text-ink" href={`mailto:${siteConfig.supportEmail}`}>
                <Mail className="h-4 w-4 text-brand" />
                {siteConfig.supportEmail}
              </a>
              <Link className="inline-flex items-center gap-2 transition hover:text-ink" href="/support">
                <LifeBuoy className="h-4 w-4 text-brand" />
                Support and policy help
              </Link>
            </div>
            <div className="mt-4 rounded-[1.25rem] border border-brand/10 bg-brand-soft/50 px-4 py-3 text-sm leading-6 text-ink-soft">
              <div className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                <span>Stripe checkout, protected library access, clear refund rules, and visible support help protect buyers and sellers.</span>
              </div>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-muted">
                Buyers
              </p>
              <div className="mt-3 grid gap-2.5 text-sm text-ink-soft">
                <Link className="py-1 transition hover:text-ink" href="/marketplace">
                  Marketplace
                </Link>
                <Link className="py-1 transition hover:text-ink" href="/favorites">
                  Saved items
                </Link>
                <Link className="py-1 transition hover:text-ink" href="/library">
                  Purchases
                </Link>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-muted">
                Sellers
              </p>
              <div className="mt-3 grid gap-2.5 text-sm text-ink-soft">
                <Link className="py-1 transition hover:text-ink" href="/sell">
                  Start selling
                </Link>
                <Link className="py-1 transition hover:text-ink" href="/sell/dashboard">
                  Seller dashboard
                </Link>
                <Link className="py-1 transition hover:text-ink" href="/account">
                  Account overview
                </Link>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-muted">
                Explore
              </p>
              <div className="mt-3 grid gap-2.5 text-sm text-ink-soft">
                <Link className="py-1 transition hover:text-ink" href="/">
                  Home
                </Link>
                <Link className="py-1 transition hover:text-ink" href="/#subjects">
                  Subjects
                </Link>
                <Link className="py-1 transition hover:text-ink" href="/#pricing">
                  Pricing
                </Link>
                <Link className="py-1 transition hover:text-ink" href="/#faq">
                  FAQ
                </Link>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-muted">
                Policies
              </p>
              <div className="mt-3 grid gap-2.5 text-sm text-ink-soft">
                <Link className="py-1 transition hover:text-ink" href="/terms">
                  Terms
                </Link>
                <Link className="py-1 transition hover:text-ink" href="/privacy">
                  Privacy
                </Link>
                <Link className="py-1 transition hover:text-ink" href="/refund-policy">
                  Refund policy
                </Link>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-muted">
                Support
              </p>
              <div className="mt-3 grid gap-2.5 text-sm text-ink-soft">
                <Link className="py-1 transition hover:text-ink" href="/support">
                  Support center
                </Link>
                <Link className="py-1 transition hover:text-ink" href="/feedback">
                  Give feedback
                </Link>
                <Link className="py-1 transition hover:text-ink" href="/library?view=support">
                  Buyer support
                </Link>
                <Link className="py-1 transition hover:text-ink" href="/sell/onboarding">
                  Seller setup help
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 border-t border-ink/5 pt-4 text-sm text-ink-muted">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p>
              {siteConfig.productName}
              {" · "}Secure checkout, protected downloads, and teacher-focused seller payouts.
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              <Link className="transition hover:text-ink" href="/support">
                Support
              </Link>
              <Link className="transition hover:text-ink" href="/feedback">
                Give feedback
              </Link>
              <Link className="transition hover:text-ink" href="/sell">
                Sell on LessonForge
              </Link>
              <Link className="transition hover:text-ink" href="/marketplace">
                Browse resources
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
