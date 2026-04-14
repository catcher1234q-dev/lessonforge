import Link from "next/link";

import { siteConfig } from "@/lib/config/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-ink/5 bg-white/80 px-5 py-8 sm:px-6 lg:px-8 lg:py-10">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)] lg:items-start">
          <div>
            <p className="font-[family-name:var(--font-display)] text-2xl text-ink">
              {siteConfig.productName}
            </p>
            <p className="mt-3 max-w-sm text-sm leading-6 text-ink-soft">
              Browse, sell, or review the product from one clear set of entry points.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-muted">
                If You Want To Buy
              </p>
              <div className="mt-3 grid gap-2.5 text-sm text-ink-soft">
                <Link className="transition hover:text-ink" href="/marketplace">
                  Marketplace
                </Link>
                <Link className="transition hover:text-ink" href="/favorites">
                  Saved items
                </Link>
                <Link className="transition hover:text-ink" href="/library">
                  Purchases
                </Link>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-muted">
                If You Want To Sell
              </p>
              <div className="mt-3 grid gap-2.5 text-sm text-ink-soft">
                <Link className="transition hover:text-ink" href="/sell">
                  Start selling
                </Link>
                <Link className="transition hover:text-ink" href="/sell/dashboard">
                  Seller dashboard
                </Link>
                <Link className="transition hover:text-ink" href="/account">
                  Account overview
                </Link>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-muted">
                Learn The Product
              </p>
              <div className="mt-3 grid gap-2.5 text-sm text-ink-soft">
                <Link className="transition hover:text-ink" href="/#how-it-works">
                  How it works
                </Link>
                <Link className="transition hover:text-ink" href="/#subjects">
                  Subjects
                </Link>
                <Link className="transition hover:text-ink" href="/#pricing">
                  Pricing
                </Link>
                <Link className="transition hover:text-ink" href="/#faq">
                  FAQ
                </Link>
                <Link className="transition hover:text-ink" href="/api-reference">
                  API reference
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 border-t border-ink/5 pt-4 text-sm text-ink-muted">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p>
              {siteConfig.productName}
              {" · "}Teacher marketplace with connected buyer and seller flows.
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              <Link className="transition hover:text-ink" href="/terms">
                Terms
              </Link>
              <Link className="transition hover:text-ink" href="/privacy">
                Privacy
              </Link>
              <Link className="transition hover:text-ink" href="/refund-policy">
                Refund policy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
