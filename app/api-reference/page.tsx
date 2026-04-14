import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { SectionIntro } from "@/components/shared/section-intro";
import { StartHerePanel } from "@/components/shared/start-here-panel";
import { apiReferenceSections } from "@/lib/lessonforge/api-reference";

function methodClasses(method: "GET" | "POST" | "PATCH") {
  if (method === "GET") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (method === "POST") {
    return "bg-sky-50 text-sky-700";
  }

  return "bg-amber-50 text-amber-800";
}

export default function ApiReferencePage() {
  return (
    <main className="page-shell min-h-screen">
      <SiteHeader />

      <section className="px-5 pb-20 pt-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-8">
          <section className="rounded-[36px] border border-black/5 bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
            <SectionIntro
              body="This page turns the app routes into one readable API map, so you can see what the website exposes without reading every route file."
              eyebrow="API Reference"
              level="h1"
              title="Browse the website API from inside the product."
              titleClassName="max-w-4xl leading-tight"
            />

            <StartHerePanel
              className="border-sky-100 bg-sky-50/80"
              items={[
                {
                  label: "Start here",
                  detail: "Use the section names to jump between buyer, seller, admin, and generated-asset endpoints.",
                },
                {
                  label: "What you are seeing",
                  detail: "A plain-language reference for the current Next.js route handlers in this website.",
                },
                {
                  label: "What happens next",
                  detail: "Use these paths to build docs, connect tools, test flows, or wire future front-end work.",
                },
              ]}
              title="This is the website-facing API inventory for LessonForge right now."
            />
          </section>

          <section className="grid gap-6">
            {apiReferenceSections.map((section) => (
              <article
                key={section.title}
                className="rounded-[30px] border border-black/5 bg-white p-7 shadow-[0_18px_50px_rgba(15,23,42,0.06)]"
              >
                <h2 className="text-2xl font-semibold text-ink">{section.title}</h2>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-ink-soft">
                  {section.description}
                </p>

                <div className="mt-6 grid gap-4">
                  {section.items.map((item) => (
                    <div
                      key={`${item.method}-${item.path}`}
                      className="rounded-[1.5rem] border border-ink/5 bg-surface-subtle p-5"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-wrap items-center gap-3">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${methodClasses(item.method)}`}
                          >
                            {item.method}
                          </span>
                          <code className="rounded-full bg-white px-3 py-1 text-sm text-ink">
                            {item.path}
                          </code>
                        </div>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">
                          {item.auth}
                        </span>
                      </div>

                      <p className="mt-4 text-sm leading-7 text-ink-soft">{item.description}</p>

                      {item.query ? (
                        <div className="mt-4 rounded-[1rem] border border-white/70 bg-white/80 px-4 py-3 text-sm leading-6 text-ink-soft">
                          <p className="font-semibold text-ink">Query params</p>
                          <code className="mt-2 block text-sm text-ink">{item.query}</code>
                        </div>
                      ) : null}

                      {item.body ? (
                        <div className="mt-4 rounded-[1rem] border border-white/70 bg-white/80 px-4 py-3 text-sm leading-6 text-ink-soft">
                          <p className="font-semibold text-ink">Body shape</p>
                          <code className="mt-2 block whitespace-pre-wrap break-words text-sm text-ink">
                            {item.body}
                          </code>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </section>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
