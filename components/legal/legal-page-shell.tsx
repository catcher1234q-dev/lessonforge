import Link from "next/link";

import { siteConfig } from "@/lib/config/site";

type LegalSection = {
  title: string;
  body: readonly string[];
};

type LegalPageShellProps = {
  eyebrow: string;
  title: string;
  intro: string;
  sections: readonly LegalSection[];
  updatedLabel: string;
};

export function LegalPageShell({
  eyebrow,
  title,
  intro,
  sections,
  updatedLabel,
}: LegalPageShellProps) {
  return (
    <main className="min-h-screen bg-surface-subtle px-5 py-10 sm:px-6 lg:px-8 lg:py-14">
      <div className="mx-auto max-w-4xl">
        <div className="rounded-[2rem] border border-ink/5 bg-white p-6 shadow-[0_20px_80px_rgba(15,23,42,0.06)] sm:p-8 lg:p-10">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand">
              {eyebrow}
            </p>
            <h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl leading-tight text-ink sm:text-5xl">
              {title}
            </h1>
            <p className="mt-5 text-base leading-8 text-ink-soft sm:text-lg">
              {intro}
            </p>
            <p className="mt-4 text-sm text-ink-muted">{updatedLabel}</p>
          </div>

          <div className="mt-8 grid gap-5">
            {sections.map((section) => (
              <section
                className="rounded-[1.5rem] border border-ink/5 bg-surface-subtle px-5 py-5 sm:px-6"
                key={section.title}
              >
                <h2 className="text-lg font-semibold text-ink">{section.title}</h2>
                <div className="mt-3 grid gap-3 text-sm leading-7 text-ink-soft sm:text-[15px]">
                  {section.body.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div className="mt-8 rounded-[1.5rem] border border-brand/10 bg-brand-soft px-5 py-5 text-sm leading-7 text-brand-700">
            <p>
              Questions about these policies can be sent to{" "}
              <a className="font-semibold underline-offset-4 hover:underline" href={`mailto:${siteConfig.supportEmail}`}>
                {siteConfig.supportEmail}
              </a>
              .
            </p>
            <p className="mt-2">
              Ready to get back to the marketplace?{" "}
              <Link className="font-semibold underline-offset-4 hover:underline" href="/marketplace">
                Browse listings
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
