"use client";

import { secondaryActionLinkClassName } from "@/components/shared/secondary-action-link";
import { formatPrismaCutoverSummaryReport } from "@/lib/lessonforge/cutover-report";
import { getPersistenceRuntimeInterpretation } from "@/lib/lessonforge/persistence-runtime";
import { useCopyFeedback } from "@/lib/lessonforge/use-copy-feedback";

import {
  type PrismaCutoverReport,
} from "@/lib/lessonforge/prisma-cutover";

function describeCommand(command: string) {
  if (command.startsWith("DATABASE_URL=")) {
    return {
      title: "Add a real database connection",
      detail: "Paste your real Postgres connection string into the environment setup.",
    };
  }

  if (command.startsWith("LESSONFORGE_PERSISTENCE_MODE=")) {
    return {
      title: "Switch the app to Prisma mode",
      detail: "Turn on the real database-backed persistence mode.",
    };
  }

  if (command.includes("verify:persistence:ops")) {
    return {
      title: "Run the persistence check",
      detail: "Verify that the app and database setup are ready.",
    };
  }

  if (command.includes("prisma:migrate")) {
    return {
      title: "Run the database migration",
      detail: "Apply the database schema so the app can use real stored data.",
    };
  }

  return {
    title: "Run this technical step",
    detail: "Use this command during technical setup.",
  };
}

function getActionStatusLabel(status: "blocked" | "next" | "done") {
  if (status === "done") {
    return "Done";
  }

  if (status === "next") {
    return "Do now";
  }

  return "Waiting";
}

function getCutoverToneClassName(stage: PrismaCutoverReport["stage"]) {
  if (stage === "verification-passed") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (stage === "ready-for-verification") {
    return "bg-amber-50 text-amber-700";
  }

  return "bg-rose-50 text-rose-700";
}
export function CutoverSummaryCard({
  testId,
  headlineTestId,
  summaryTestId,
  commandTestId,
  report,
  summary,
  runtimeLabel,
  runtimeDetail,
  runtimeMode,
}: {
  testId: string;
  headlineTestId: string;
  summaryTestId: string;
  commandTestId: string;
  report: PrismaCutoverReport;
  summary: string;
  runtimeLabel: string;
  runtimeDetail: string;
  runtimeMode: string;
}) {
  const { copiedKind, copiedValue, copyFeedback, copyWithFeedback } =
    useCopyFeedback();
  const runbookCommands = report.runbookCommands;

  async function handleCopyCommand(command: string) {
    await copyWithFeedback({
      text: command,
      kind: "command",
      value: command,
      successFeedback: `Copied command: ${command}`,
    });
  }

  async function handleCopyReport() {
    await copyWithFeedback({
      text: formatPrismaCutoverSummaryReport({
        report,
        summary,
        runtimeLabel,
        runtimeDetail,
        runtimeMode,
      }),
      kind: "report",
      successFeedback: "Copied cutover report.",
    });
  }

  return (
    <section
      className="rounded-[30px] border border-black/5 bg-white p-7 shadow-[0_18px_50px_rgba(15,23,42,0.06)]"
      data-testid={testId}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">
            Database cutover
          </p>
          <h2
            className="mt-3 text-3xl font-semibold text-ink"
            data-testid={headlineTestId}
          >
            {report.stageHeadline}
          </h2>
        </div>
        <span
          className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] ${getCutoverToneClassName(report.stage)}`}
        >
          {report.stage.replaceAll("-", " ")}
        </span>
      </div>
      <div className="mt-4 flex justify-end">
        <button
          className={secondaryActionLinkClassName("px-4 py-2 text-xs uppercase tracking-[0.14em]")}
          data-testid={`${testId}-copy-report`}
          onClick={() => void handleCopyReport()}
          type="button"
        >
          {copiedKind === "report" ? "Copied report" : "Copy report"}
        </button>
      </div>
      <p
        className="mt-4 max-w-4xl text-base leading-8 text-ink-soft"
        data-testid={summaryTestId}
      >
        {summary}
      </p>
      <div className="mt-4 rounded-[1.25rem] bg-slate-50 px-4 py-4 text-sm leading-6 text-ink-soft">
        Open this when you want the short version of where the database cutover stands and what the next safe step should be.
      </div>
      <div
        className="mt-4 rounded-[1.25rem] border border-black/5 bg-slate-50 px-5 py-5"
        data-testid={`${testId}-runtime`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
              Current runtime storage
            </p>
            <p className="mt-2 text-sm font-semibold text-ink">{runtimeLabel}</p>
          </div>
          <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-soft">
            mode: {runtimeMode}
          </span>
        </div>
        <p className="mt-3 text-sm leading-6 text-ink-soft">{runtimeDetail}</p>
        <p
          className="mt-3 rounded-[0.9rem] bg-white px-4 py-3 text-sm leading-6 text-ink-soft"
          data-testid={`${testId}-runtime-note`}
        >
          {getPersistenceRuntimeInterpretation({
            mode: runtimeMode,
            label: runtimeLabel,
          })}
        </p>
      </div>
      {runbookCommands.length ? (
        <div
          className="mt-4 rounded-[1.25rem] border border-black/5 bg-white px-5 py-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]"
          data-testid={`${testId}-runbook`}
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
            Technical setup steps
          </p>
          <p className="mt-2 text-sm leading-6 text-ink-soft">
            These are the behind-the-scenes setup steps. Most people do not need them unless they are connecting a real database.
          </p>
          <div className="mt-3 space-y-3">
            {runbookCommands.map((command, index) => (
              <div
                key={command}
                className="rounded-[1rem] bg-slate-50 px-4 py-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                      Step {index + 1}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-ink">
                      {describeCommand(command).title}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-ink-soft">
                      {describeCommand(command).detail}
                    </p>
                  </div>
                  <button
                    className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink transition hover:border-slate-300"
                    data-testid={`${testId}-runbook-copy-${index + 1}`}
                    onClick={() => void handleCopyCommand(command)}
                    type="button"
                  >
                    {copiedKind === "command" && copiedValue === command ? "Copied" : "Copy"}
                  </button>
                </div>
                <details className="mt-3 rounded-[0.9rem] bg-white px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                    Show command
                  </p>
                  <code className="mt-2 block text-xs text-ink">{command}</code>
                </details>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {report.actionItems.length ? (
        <div className="mt-4 rounded-[1.25rem] border border-black/5 bg-slate-50/80 px-5 py-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
            Cutover action list
          </p>
          <div className="mt-3 space-y-2" data-testid={`${testId}-actions`}>
            {report.actionItems.map((item) => (
              <div
                key={`${item.label}-${item.status}`}
              className="flex items-center justify-between gap-3 rounded-[1rem] bg-white px-4 py-3 text-sm"
              >
                <div>
                  <span className="text-ink-soft">{item.label}</span>
                  <p className="mt-1 text-xs text-ink-muted">{item.statusDescription}</p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${
                    item.status === "done"
                      ? "bg-emerald-50 text-emerald-700"
                      : item.status === "next"
                        ? "bg-amber-50 text-amber-700"
                      : "bg-rose-50 text-rose-700"
                  }`}
                >
                  {getActionStatusLabel(item.status)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {report.detailLines.length ? (
        <div className="mt-4 space-y-2" data-testid={`${testId}-details`}>
          {report.detailLines.map((detail) => (
            <div
              key={detail}
              className="rounded-[1.25rem] bg-slate-50 px-4 py-3 text-sm leading-6 text-ink-soft"
            >
              {detail}
            </div>
          ))}
        </div>
      ) : null}
      {copyFeedback ? (
        <div
          className="mt-4 rounded-[1rem] border border-sky-200 bg-sky-50 px-4 py-4 text-sm leading-6 text-sky-900"
          data-testid={`${testId}-copy-feedback`}
        >
          {copyFeedback}
        </div>
      ) : null}
      {report.recommendedCommand ? (
        <div className="mt-4 rounded-[1rem] bg-slate-950 px-4 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/60">
            Recommended next command
          </p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <code className="block text-xs text-white" data-testid={commandTestId}>
              {report.recommendedCommand}
            </code>
            <button
              className="shrink-0 rounded-full border border-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/85 transition hover:border-white/30 hover:text-white"
              data-testid={`${testId}-copy-command`}
              onClick={() => void handleCopyCommand(report.recommendedCommand as string)}
              type="button"
            >
              {copiedKind === "command" && copiedValue === report.recommendedCommand ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
