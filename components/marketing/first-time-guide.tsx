import Link from "next/link";

const guidedPaths = [
  {
    eyebrow: "Buyer path",
    title: "Start with browsing",
    intro: "Start here if you want to shop like a buyer.",
    steps: [
      "Open the marketplace and pick a product.",
      "Open the product page and inspect the preview pages.",
      "Buy it, then reopen it from your library.",
    ],
    href: "/marketplace",
    cta: "Start browsing",
  },
  {
    eyebrow: "Seller path",
    title: "Start with selling",
    intro: "Start here if you want to go from setup to a live product.",
    steps: [
      "Open the seller area and connect payouts.",
      "Create a product with the core listing details.",
      "Clear blockers until the listing is ready for buyers.",
    ],
    href: "/sell",
    cta: "Start selling",
  },
  {
    eyebrow: "Account path",
    title: "Start with your account",
    intro: "Start here if you want one signed-in home for buying, selling, and follow-up.",
    steps: [
      "Open your account overview and check purchases, saved items, or seller progress.",
      "Jump into the library, saved items, or seller dashboard from one place.",
      "Use it as your fastest way back into the right part of the site.",
    ],
    href: "/account",
    cta: "Open account overview",
  },
];

export function FirstTimeGuide() {
  return (
    <section className="px-5 py-8 sm:px-6 lg:px-8 lg:py-12">
      <div className="mx-auto max-w-6xl rounded-[1.75rem] border border-ink/5 bg-white p-6 shadow-soft-xl sm:p-7">
        <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
          Start here
        </span>
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand">
          Guided paths
        </p>
        <h2 className="mt-3 max-w-3xl font-[family-name:var(--font-display)] text-3xl text-ink sm:text-4xl">
          Pick what you want to do first.
        </h2>
        <p className="mt-3 max-w-2xl text-base leading-7 text-ink-soft">
          Each path shows the shortest route from the first click to the finished result.
        </p>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {guidedPaths.map((path) => (
            <article
              key={path.title}
              className="rounded-[1.4rem] border border-ink/5 bg-surface-subtle p-5 shadow-[0_16px_40px_rgba(15,23,42,0.04)]"
            >
              <span className="inline-flex rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-soft">
                {path.eyebrow}
              </span>
              <h3 className="mt-4 text-xl font-semibold text-ink">{path.title}</h3>
              <p className="mt-2 text-sm leading-6 text-ink-soft">{path.intro}</p>

              <div className="mt-4 space-y-2.5">
                {path.steps.map((step, index) => (
                  <div
                    key={`${path.title}-${index + 1}`}
                    className="flex gap-3 rounded-[1.05rem] border border-white/70 bg-white/85 px-3.5 py-3"
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white">
                      {index + 1}
                    </div>
                    <p className="text-sm leading-6 text-ink-soft">{step}</p>
                  </div>
                ))}
              </div>

              <Link
                className="mt-4 inline-flex rounded-full bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
                href={path.href}
              >
                {path.cta}
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
