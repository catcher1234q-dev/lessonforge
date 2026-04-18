import Link from "next/link";
import { ArrowRight, BookOpenCheck, Store } from "lucide-react";

const choices = [
  {
    icon: BookOpenCheck,
    title: "Browse resources",
    description: "Find lessons you can use this week.",
    href: "/marketplace",
    cta: "Browse marketplace",
    analytics: "browse_marketplace",
  },
  {
    icon: Store,
    title: "Sell your resources",
    description: "List materials you already made.",
    href: "/sell/onboarding",
    cta: "Start selling",
    analytics: "start_selling",
  },
];

export function FirstTimeGuide() {
  return (
    <section className="px-5 py-8 sm:px-6 lg:px-8 lg:py-12">
      <div className="mx-auto max-w-6xl rounded-[2rem] border border-ink/5 bg-white p-5 shadow-soft-xl sm:p-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
            Pick what you need
          </p>
          <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl leading-tight tracking-[-0.03em] text-ink sm:text-5xl">
            What do you want to do today?
          </h2>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {choices.map((choice) => (
            <Link
              key={choice.title}
              className="group flex min-h-[220px] flex-col justify-between rounded-[1.5rem] border border-slate-200 bg-surface-subtle p-5 transition hover:-translate-y-0.5 hover:border-brand/30 hover:bg-white hover:shadow-[0_20px_50px_rgba(15,23,42,0.08)] sm:p-6"
              data-analytics-event="homepage_choice_clicked"
              data-analytics-props={JSON.stringify({ choice: choice.analytics })}
              href={choice.href}
            >
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-brand shadow-sm">
                  <choice.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-2xl font-semibold tracking-[-0.02em] text-ink">
                  {choice.title}
                </h3>
                <p className="mt-2 text-base leading-7 text-ink-soft">
                  {choice.description}
                </p>
              </div>
              <span className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-ink shadow-sm transition group-hover:bg-brand group-hover:text-white">
                {choice.cta}
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
