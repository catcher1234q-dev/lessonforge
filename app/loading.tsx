import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { EdgeStatePanel } from "@/components/shared/edge-state-panel";

export default function Loading() {
  return (
    <main className="page-shell min-h-screen">
      <SiteHeader />
      <section className="px-5 pb-20 pt-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-4xl flex-col gap-8">
          <EdgeStatePanel
            body="We are loading the next page now. This usually means we are preparing product details, dashboard data, or the next step in the flow."
            eyebrow="Loading"
            title="Getting the next page ready"
          >
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="h-28 animate-pulse rounded-[1.5rem] bg-slate-100" />
              <div className="h-28 animate-pulse rounded-[1.5rem] bg-slate-100" />
              <div className="h-28 animate-pulse rounded-[1.5rem] bg-slate-100" />
            </div>
            <div className="mt-4 rounded-[1.5rem] bg-slate-100 p-6">
              <div className="h-4 w-40 animate-pulse rounded-full bg-slate-200" />
              <div className="mt-4 h-4 w-full animate-pulse rounded-full bg-slate-200" />
              <div className="mt-3 h-4 w-5/6 animate-pulse rounded-full bg-slate-200" />
            </div>
          </EdgeStatePanel>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
