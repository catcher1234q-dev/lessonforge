"use client";

import Link from "next/link";

export function SubjectShowcase() {
  return (
    <section id="subjects" className="px-5 py-12 sm:px-6 lg:px-8 lg:py-16">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-[2rem] border border-ink/5 bg-white p-6 shadow-soft-xl sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand">
            Browse by subject
          </p>
          <h2 className="mt-3 max-w-3xl font-[family-name:var(--font-display)] text-3xl text-ink sm:text-4xl">
            Start with what you teach.
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-7 text-ink-soft">
            Pick a subject, then open resources that look ready for real classroom use.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              {
                title: "Math resources",
                detail: "Warm-ups, fluency practice, intervention work, and small-group support.",
                href: "/marketplace?subject=Math",
              },
              {
                title: "ELA resources",
                detail: "Reading response, writing lessons, discussion prompts, and workshop tools.",
                href: "/marketplace?subject=ELA",
              },
              {
                title: "Science resources",
                detail: "Labs, inquiry activities, observation pages, and hands-on practice.",
                href: "/marketplace?subject=Science",
              },
              {
                title: "Social studies resources",
                detail: "Primary source work, maps, civics practice, and history activities.",
                href: "/marketplace?subject=Social%20Studies",
              },
            ].map((item) => (
              <Link
                key={item.title}
                className="rounded-[1.5rem] border border-ink/5 bg-surface-subtle p-5 transition hover:-translate-y-1 hover:border-brand/15"
                href={item.href}
              >
                <p className="text-lg font-semibold text-ink">{item.title}</p>
                <p className="mt-2 text-sm leading-6 text-ink-soft">{item.detail}</p>
              </Link>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              className="inline-flex items-center justify-center rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
              href="/marketplace"
            >
              Browse all resources
            </Link>
            <Link
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:border-slate-300"
              href="/sell/onboarding"
            >
              Set up seller account
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
