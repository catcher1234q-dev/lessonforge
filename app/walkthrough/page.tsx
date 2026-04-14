import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { ResourcePreview } from "@/components/marketing/resource-preview";
import { SectionIntro } from "@/components/shared/section-intro";

export default function WalkthroughPage() {
  return (
    <main className="page-shell min-h-screen">
      <SiteHeader />
      <section className="px-5 pb-6 pt-12 sm:px-6 lg:px-8 lg:pb-8 lg:pt-16">
        <div className="mx-auto max-w-6xl rounded-[2rem] border border-ink/5 bg-white p-6 shadow-soft-xl sm:p-8">
          <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
            <SectionIntro
              body="Use this page when you want the guided walkthrough. It shows the main buyer, seller, and checkout flow in one place without putting that whole experience at the top of the homepage."
              eyebrow="Walkthrough"
              level="h1"
              title="Open the guided product walkthrough"
              titleClassName="text-4xl sm:text-5xl"
            />
            <div className="rounded-[1.5rem] bg-surface-subtle px-5 py-5">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand">
                What happens here
              </p>
              <div className="mt-4 space-y-3 text-sm leading-7 text-ink-soft">
                <div>1. Create your first listing.</div>
                <div>2. Watch it appear in browse.</div>
                <div>3. Open the buyer preview before checkout.</div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <ResourcePreview />
      <SiteFooter />
    </main>
  );
}
