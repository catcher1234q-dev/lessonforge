import Link from "next/link";

import type { FounderOpsSnapshot } from "@/lib/lessonforge/founder-ops";

function formatTimestamp(value?: string) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getStatusClasses(status: "healthy" | "attention" | "down") {
  if (status === "healthy") {
    return "bg-emerald-50 text-emerald-800 border-emerald-100";
  }

  if (status === "down") {
    return "bg-rose-50 text-rose-800 border-rose-100";
  }

  return "bg-amber-50 text-amber-900 border-amber-100";
}

function QueueList({
  emptyMessage,
  items,
}: {
  emptyMessage: string;
  items: Array<{
    title: string;
    detail: string;
    createdAt?: string;
    href?: string;
  }>;
}) {
  if (!items.length) {
    return (
      <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-ink-soft">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {items.map((item) => (
        <article
          key={`${item.title}-${item.createdAt ?? item.detail}`}
          className="rounded-[1.25rem] border border-slate-200 bg-white px-4 py-4"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <p className="font-semibold text-ink">{item.title}</p>
            {item.createdAt ? (
              <p className="text-xs uppercase tracking-[0.14em] text-ink-muted">
                {formatTimestamp(item.createdAt)}
              </p>
            ) : null}
          </div>
          <p className="mt-2 text-sm leading-6 text-ink-soft">{item.detail}</p>
          {item.href ? (
            <Link
              className="mt-3 inline-flex text-sm font-semibold text-brand transition hover:text-brand-700"
              href={item.href}
            >
              Open related area
            </Link>
          ) : null}
        </article>
      ))}
    </div>
  );
}

export function FounderOpsDashboard({
  snapshot,
}: {
  snapshot: FounderOpsSnapshot;
}) {
  return (
    <div className="space-y-8">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-[1.5rem] border border-black/5 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
          <p className="text-sm text-ink-soft">Site health checks</p>
          <p className="mt-2 text-4xl font-semibold text-ink">
            {snapshot.checks.filter((check) => check.status === "healthy").length}/
            {snapshot.checks.length}
          </p>
          <p className="mt-2 text-sm leading-6 text-ink-soft">
            Core route, auth config, and database checks that should stay stable for founders and buyers.
          </p>
        </article>
        <article className="rounded-[1.5rem] border border-black/5 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
          <p className="text-sm text-ink-soft">Auth email status</p>
          <p className="mt-2 text-2xl font-semibold text-ink">
            {snapshot.emailStatus.status === "healthy" ? "Configured" : "Needs setup"}
          </p>
          <p className="mt-2 text-sm leading-6 text-ink-soft">{snapshot.emailStatus.detail}</p>
        </article>
        <article className="rounded-[1.5rem] border border-black/5 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
          <p className="text-sm text-ink-soft">Policy review queue</p>
          <p className="mt-2 text-4xl font-semibold text-ink">{snapshot.policyQueue.length}</p>
          <p className="mt-2 text-sm leading-6 text-ink-soft">
            Listings or reports that still need rights, preview, thumbnail, or moderation review.
          </p>
        </article>
        <article className="rounded-[1.5rem] border border-black/5 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
          <p className="text-sm text-ink-soft">Dispute and refund queue</p>
          <p className="mt-2 text-4xl font-semibold text-ink">{snapshot.disputeQueue.length}</p>
          <p className="mt-2 text-sm leading-6 text-ink-soft">
            Buyer payment or access issues that still need human review before any decision.
          </p>
        </article>
      </section>

      <section className="rounded-[2rem] border border-black/5 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">
              Recommended actions
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-ink">
              AI can suggest the next step, but you still approve the important decisions.
            </h2>
          </div>
          <p className="text-sm leading-6 text-ink-soft">
            Generated {formatTimestamp(snapshot.generatedAt)}
          </p>
        </div>

        <div className="mt-6 grid gap-3">
          {snapshot.recommendedActions.map((action) => (
            <article
              key={`${action.priority}-${action.title}`}
              className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-4"
            >
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${
                    action.priority === "high"
                      ? "border-rose-200 bg-rose-50 text-rose-800"
                      : action.priority === "medium"
                        ? "border-amber-200 bg-amber-50 text-amber-900"
                        : "border-emerald-200 bg-emerald-50 text-emerald-800"
                  }`}
                >
                  {action.priority} priority
                </span>
                <p className="font-semibold text-ink">{action.title}</p>
              </div>
              <p className="mt-2 text-sm leading-6 text-ink-soft">{action.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-[2rem] border border-black/5 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">
            Site health
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-ink">
            Monitoring checks for routes, auth config, and database health.
          </h2>
          <div className="mt-6 grid gap-3">
            {snapshot.checks.map((check) => (
              <article
                key={check.key}
                className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-4"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${getStatusClasses(check.status)}`}
                  >
                    {check.status}
                  </span>
                  <p className="font-semibold text-ink">{check.label}</p>
                  {typeof check.httpStatus === "number" ? (
                    <span className="text-xs uppercase tracking-[0.14em] text-ink-muted">
                      HTTP {check.httpStatus}
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 text-sm leading-6 text-ink-soft">{check.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-[2rem] border border-black/5 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">
            Auth and signup signals
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-ink">
            Recent signup issues and email auth readiness.
          </h2>
          <div className="mt-4 rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-ink-soft">
            <p>
              SMTP configured: <span className="font-semibold text-ink">{snapshot.emailStatus.smtpConfigured ? "Yes" : "No"}</span>
            </p>
            <p>
              Sender configured: <span className="font-semibold text-ink">{snapshot.emailStatus.senderConfigured ? "Yes" : "No"}</span>
            </p>
            <p>
              Production site URL set: <span className="font-semibold text-ink">{snapshot.emailStatus.siteUrlConfigured ? "Yes" : "No"}</span>
            </p>
          </div>
          <div className="mt-6">
            <QueueList
              emptyMessage="No recent signup or login issue signals were found."
              items={snapshot.signupSignals}
            />
          </div>
        </section>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-[2rem] border border-black/5 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">
            Checkout and payments
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-ink">
            Recent checkout or payment trouble signals.
          </h2>
          <div className="mt-6">
            <QueueList
              emptyMessage="No recent checkout or payment issues were found in the current read-only signals."
              items={snapshot.checkoutSignals}
            />
          </div>
        </section>

        <section className="rounded-[2rem] border border-black/5 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">
            Seller onboarding
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-ink">
            Sellers who started setup but still need help.
          </h2>
          <div className="mt-6">
            <QueueList
              emptyMessage="No seller onboarding follow-up items are visible right now."
              items={snapshot.onboardingSignals}
            />
          </div>
        </section>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-[2rem] border border-black/5 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">
            Upload issues
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-ink">
            Recent upload or preview trouble signals.
          </h2>
          <div className="mt-6">
            <QueueList
              emptyMessage="No recent upload issue signals were found in the current read-only data."
              items={snapshot.uploadSignals}
            />
          </div>
        </section>

        <section className="rounded-[2rem] border border-black/5 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">
            Support inbox
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-ink">
            Recent support-style feedback for draft replies and follow-up.
          </h2>
          <div className="mt-6">
            <QueueList
              emptyMessage="No private support-style feedback has been submitted yet."
              items={snapshot.supportSignals}
            />
          </div>
        </section>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-[2rem] border border-black/5 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">
            Policy review queue
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-ink">
            Listings and reports that need policy review.
          </h2>
          <div className="mt-6">
            <QueueList
              emptyMessage="No policy review items are visible right now."
              items={snapshot.policyQueue}
            />
          </div>
        </section>

        <section className="rounded-[2rem] border border-black/5 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">
            Dispute and refund queue
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-ink">
            Buyer problems that need a draft response, not automatic action.
          </h2>
          <div className="mt-6">
            <QueueList
              emptyMessage="No dispute or refund items are open right now."
              items={snapshot.disputeQueue}
            />
          </div>
        </section>
      </section>
    </div>
  );
}
