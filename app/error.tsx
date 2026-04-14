"use client";

import Link from "next/link";
import { useEffect } from "react";

import { SiteFooter } from "@/components/layout/site-footer";
import { EdgeStatePanel } from "@/components/shared/edge-state-panel";
import { secondaryActionLinkClassName } from "@/components/shared/secondary-action-link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="page-shell min-h-screen">
      <section className="border-b border-ink/10 bg-white/90 px-5 py-4 shadow-soft-sm backdrop-blur sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link
            className="font-[family-name:var(--font-display)] text-2xl font-semibold text-ink"
            href="/"
          >
            LessonForge
          </Link>
          <div className="flex flex-wrap items-center gap-3 text-sm font-medium text-ink-soft">
            <Link className="transition hover:text-ink" href="/marketplace">
              Marketplace
            </Link>
            <Link className="transition hover:text-ink" href="/sell">
              Sell
            </Link>
            <Link className="transition hover:text-ink" href="/account">
              Account
            </Link>
          </div>
        </div>
      </section>
      <section className="px-5 pb-20 pt-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-4xl flex-col gap-8">
          <EdgeStatePanel
            body="Something interrupted this page before it finished loading. You can retry this step or jump back to the main marketplace, seller, or account paths below."
            eyebrow="Something went wrong"
            title="This screen ran into a problem"
          >
            <div className="flex flex-wrap gap-3">
              <button
                className="inline-flex items-center justify-center rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
                onClick={() => reset()}
                type="button"
              >
                Try again
              </button>
              <Link
                className={secondaryActionLinkClassName("px-5 py-3")}
                href="/marketplace"
              >
                Open marketplace
              </Link>
              <Link
                className={secondaryActionLinkClassName("px-5 py-3")}
                href="/sell"
              >
                Open seller flow
              </Link>
              <Link
                className={secondaryActionLinkClassName("px-5 py-3")}
                href="/account"
              >
                Open account
              </Link>
            </div>
          </EdgeStatePanel>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
