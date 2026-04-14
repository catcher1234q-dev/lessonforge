const storyPoints = [
  {
    title: "Start with one clear entry",
    body: "The homepage now points people into the buyer, seller, or admin path instead of making them decode the whole site at once.",
  },
  {
    title: "See the real workflow",
    body: "Marketplace, seller dashboard, moderation, checkout, shortlist, and library all connect so people can understand the system by using it.",
  },
  {
    title: "Reduce guesswork",
    body: "Clearer headings, mode labels, summaries, and recovery actions help users understand what each screen is for and what to do next.",
  },
];

export function StoryBand() {
  return (
    <section className="px-5 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[2rem] bg-brand px-6 py-8 text-white shadow-soft-xl sm:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-white/70">
            Why It Feels Clearer
          </p>
          <h2 className="mt-4 font-[family-name:var(--font-display)] text-4xl sm:text-5xl">
            The goal is to help teachers understand the product without hunting for the right page.
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {storyPoints.map((point) => (
            <article
              key={point.title}
              className="rounded-[2rem] border border-ink/5 bg-white p-6 shadow-soft-xl"
            >
              <h3 className="text-xl font-semibold text-ink">{point.title}</h3>
              <p className="mt-3 text-base leading-7 text-ink-soft">
                {point.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
