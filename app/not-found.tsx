import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { EdgeStatePanel } from "@/components/shared/edge-state-panel";
import { secondaryActionLinkClassName } from "@/components/shared/secondary-action-link";

export default function NotFound() {
  return (
    <main className="page-shell min-h-screen">
      <SiteHeader />
      <section className="px-5 pb-20 pt-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-4xl flex-col gap-8">
          <EdgeStatePanel
            body="That page is not available here. If you were looking for a product, store, or signed-in workspace, the links below will get you back to the main paths quickly."
            eyebrow="Page not found"
            title="The page you tried to open is missing"
          >
            <div className="grid gap-4 sm:grid-cols-3">
              <Link
                className="inline-flex items-center justify-center rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
                href="/marketplace"
              >
                Open marketplace
              </Link>
              <Link
                className={secondaryActionLinkClassName("px-5 py-3")}
                href="/account"
              >
                Open account
              </Link>
              <Link
                className={secondaryActionLinkClassName("px-5 py-3")}
                href="/"
              >
                Go home
              </Link>
            </div>
          </EdgeStatePanel>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
