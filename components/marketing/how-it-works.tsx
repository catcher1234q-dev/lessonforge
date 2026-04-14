import { LibraryBig, ShieldCheck, UploadCloud } from "lucide-react";

import { SectionIntro } from "@/components/shared/section-intro";

const steps = [
  {
    icon: UploadCloud,
    title: "Start in the right place",
    description:
      "Buyers start in the marketplace. Sellers start in onboarding or product creation.",
  },
  {
    icon: ShieldCheck,
    title: "Open the product or workflow",
    description:
      "Preview the listing, compare your options, or move a seller listing closer to buyer-ready.",
  },
  {
    icon: LibraryBig,
    title: "Finish in the right place",
    description:
      "Saved items, purchases, dashboards, and follow-up actions all connect back into the flow.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="px-5 py-10 sm:px-6 lg:px-8 lg:py-12">
      <div className="mx-auto max-w-7xl rounded-[2rem] border border-ink/5 bg-white p-6 shadow-soft-xl sm:p-8">
        <SectionIntro
          body="Think of the site as one simple flow from start to finish."
          eyebrow="How It Works"
          title="The flow only has 3 steps."
          titleClassName="text-3xl sm:text-4xl"
          bodyClassName="text-base leading-7"
        />

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {steps.map(({ icon: Icon, title, description }) => (
            <article
              key={title}
              className="rounded-[1.5rem] border border-ink/5 bg-surface-subtle p-5"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-ink">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-ink-soft">
                {description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
