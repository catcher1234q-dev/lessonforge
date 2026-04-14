"use client";

import Link from "next/link";

export function SubjectShowcase() {
  return (
    <section id="subjects" className="px-5 py-12 sm:px-6 lg:px-8 lg:py-16">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-[2rem] border border-ink/5 bg-white p-6 shadow-soft-xl sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand">
            Browse By Subject
          </p>
          <h2 className="mt-3 max-w-3xl font-[family-name:var(--font-display)] text-3xl text-ink sm:text-4xl">
            The marketplace starts with real seller uploads.
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-7 text-ink-soft">
            Subject browsing fills in naturally as sellers publish their own materials. The clearest next step is creating the first real listing so buyers have something real to browse.
          </p>

          <div className="mt-6 rounded-[1.5rem] bg-surface-subtle px-5 py-4 text-sm leading-6 text-ink-soft">
            <p className="font-semibold text-ink">Start with one real upload</p>
            <p className="mt-1">
              Once the first published resources are live, buyers can browse by subject and the marketplace starts to feel real.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              className="inline-flex items-center justify-center rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
              href="/sell/products/new"
            >
              Upload the first listing
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
