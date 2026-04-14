"use client";

import { useEffect, useEffectEvent, useRef, useState, useTransition } from "react";

import { secondaryActionLinkClassName } from "@/components/shared/secondary-action-link";
import { fetchPersistenceReadiness } from "@/lib/lessonforge/persistence-readiness-client";
import type { PersistenceReadiness } from "@/lib/lessonforge/persistence-readiness-contract";
import { formatPersistenceReadinessReport } from "@/lib/lessonforge/persistence-report";
import { getPersistenceRuntimeInterpretation } from "@/lib/lessonforge/persistence-runtime";
import { useCopyFeedback } from "@/lib/lessonforge/use-copy-feedback";

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

function getFriendlyStatusLabel(status: "ready" | "blocked" | "next") {
  if (status === "ready") {
    return "Done";
  }

  if (status === "blocked") {
    return "Waiting";
  }

  return "Do next";
}

  export function PersistenceStatusClient({
  initialReadiness,
  heading = "Persistence status",
  autoRefreshMs = 30000,
}: {
  initialReadiness: PersistenceReadiness;
  heading?: string;
  autoRefreshMs?: number;
}) {
  const [readiness, setReadiness] = useState(initialReadiness);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [lastUpdatedLabel, setLastUpdatedLabel] = useState("Loaded from server render");
  const [isLiveAutoRefreshEnabled] = useState(autoRefreshMs > 0);
  const [changeHighlights, setChangeHighlights] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const previousReadinessRef = useRef(initialReadiness);
  const { copiedKind, copiedValue, copyFeedback, copyWithFeedback } =
    useCopyFeedback();

  function buildChangeHighlights(
    previous: PersistenceReadiness,
    next: PersistenceReadiness,
  ) {
    const highlights: string[] = [];

    for (const nextProbe of next.probes) {
      const previousProbe = previous.probes.find((probe) => probe.label === nextProbe.label);

      if (previousProbe && previousProbe.status !== "ready" && nextProbe.status === "ready") {
        highlights.push(`${nextProbe.label} is now ready.`);
      }
    }

    for (const nextCheck of next.preflightReport.checks) {
      const previousCheck = previous.preflightReport.checks.find(
        (check) => check.label === nextCheck.label,
      );

      if (
        previousCheck &&
        previousCheck.status !== "ready" &&
        nextCheck.status === "ready"
      ) {
        highlights.push(`${nextCheck.label} is now complete.`);
      }

      if (previousCheck && previousCheck.command !== nextCheck.command && nextCheck.command) {
        highlights.push(`Next recommended command updated to ${nextCheck.command}.`);
      }
    }

    if (previous.cutoverReport.stage !== next.cutoverReport.stage) {
      highlights.push(
        `Guided cutover moved to ${next.cutoverReport.stageHeadline.toLowerCase()}.`,
      );
    }

    if (
      previous.cutoverReport.recommendedCommand !== next.cutoverReport.recommendedCommand &&
      next.cutoverReport.recommendedCommand
    ) {
      highlights.push(
        `Guided cutover next command updated to ${next.cutoverReport.recommendedCommand}.`,
      );
    }

    if (
      !previous.databaseError &&
      next.databaseError
    ) {
      highlights.push("A new Prisma connection note needs attention.");
    }

    if (
      previous.databaseError &&
      !next.databaseError
    ) {
      highlights.push("The Prisma connection note cleared.");
    }

    return Array.from(new Set(highlights)).slice(0, 3);
  }

  const runRefresh = useEffectEvent(async (sourceLabel: "manual" | "auto") => {
    setRefreshError(null);

    try {
      const payload = await fetchPersistenceReadiness();

      const highlights = buildChangeHighlights(previousReadinessRef.current, payload);
      setReadiness(payload);
      setChangeHighlights(highlights);
      previousReadinessRef.current = payload;
      setLastUpdatedLabel(
        `${sourceLabel === "manual" ? "Manually refreshed" : "Auto-refreshed"} at ${new Date().toLocaleTimeString()}`,
      );
    } catch (error) {
      setRefreshError(
        error instanceof Error ? error.message : "Unable to refresh persistence status.",
      );
    }
  });

  function handleRefresh() {
    startTransition(async () => {
      await runRefresh("manual");
    });
  }

  async function handleCopyCommand(command: string) {
    await copyWithFeedback({
      text: command,
      kind: "command",
      value: command,
      successFeedback: `Copied command: ${command}`,
    });
  }

  async function handleCopySnapshot() {
    await copyWithFeedback({
      text: JSON.stringify(readiness, null, 2),
      kind: "snapshot",
      successFeedback: "Copied persistence snapshot JSON.",
    });
  }

  async function handleCopyReport() {
    await copyWithFeedback({
      text: formatPersistenceReadinessReport(readiness),
      kind: "report",
      successFeedback: "Copied persistence report.",
    });
  }

  useEffect(() => {
    if (autoRefreshMs <= 0) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void runRefresh("auto");
    }, autoRefreshMs);

    return () => window.clearInterval(intervalId);
  }, [autoRefreshMs, runRefresh]);

  const persistenceStatus = readiness.persistenceStatus;
  const runbookCommands = readiness.cutoverReport.runbookCommands;

  return (
    <section
      className="rounded-[28px] border border-black/5 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.05)]"
      data-testid="persistence-status-card"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">
            {heading}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.14em]">
            <span
              className={`rounded-full px-3 py-1 font-semibold ${
                refreshError
                  ? "bg-amber-50 text-amber-700"
                  : isPending
                    ? "bg-sky-50 text-sky-700"
                    : "bg-emerald-50 text-emerald-700"
              }`}
            >
              {refreshError ? "Refresh issue" : isPending ? "Refreshing now" : "Live status"}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-ink-soft">
              {isLiveAutoRefreshEnabled ? `Auto refresh ${Math.round(autoRefreshMs / 1000)}s` : "Manual refresh"}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            className={secondaryActionLinkClassName("px-4 py-2 text-xs uppercase tracking-[0.14em]")}
            data-testid="persistence-copy-report"
            onClick={() => void handleCopyReport()}
            type="button"
          >
            {copiedKind === "report" ? "Copied report" : "Copy report"}
          </button>
          <button
            className={secondaryActionLinkClassName("px-4 py-2 text-xs uppercase tracking-[0.14em]")}
            data-testid="persistence-copy-json"
            onClick={() => void handleCopySnapshot()}
            type="button"
          >
            {copiedKind === "snapshot" ? "Copied JSON" : "Copy JSON"}
          </button>
          <button
            className={`${secondaryActionLinkClassName("px-4 py-2 text-xs uppercase tracking-[0.14em]")} disabled:cursor-not-allowed disabled:opacity-60`}
            disabled={isPending}
            onClick={handleRefresh}
            type="button"
          >
            {isPending ? "Refreshing" : "Refresh status"}
          </button>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xl font-semibold text-ink">{persistenceStatus.label}</p>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-soft">
            {persistenceStatus.detail}
          </p>
          <p className="mt-3 rounded-[1rem] bg-slate-50 px-4 py-3 text-sm leading-6 text-ink-soft">
            Use this panel when you need to know whether the app is still using local JSON storage or is fully running on persisted data.
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-ink-soft">
          mode: {persistenceStatus.mode}
        </span>
      </div>
      <div
        className="mt-4 rounded-[1rem] border border-black/5 bg-slate-50 px-4 py-4 text-sm leading-6 text-ink-soft"
        data-testid="persistence-runtime-note"
      >
        {getPersistenceRuntimeInterpretation({
          mode: persistenceStatus.mode,
          label: persistenceStatus.label,
        })}
      </div>
      <div className="mt-3 text-xs uppercase tracking-[0.14em] text-ink-muted">
        {lastUpdatedLabel}
      </div>
      <div className="mt-5 rounded-[1.25rem] bg-slate-50 px-4 py-4 text-sm leading-6 text-ink-soft">
        {readiness.preflightReport.summary}
      </div>
      {runbookCommands.length ? (
        <div
          className="mt-4 rounded-[1.25rem] border border-black/5 bg-white px-5 py-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]"
          data-testid="persistence-runbook"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">
            Technical setup steps
          </p>
          <p className="mt-2 text-sm leading-6 text-ink-soft">
            These are optional technical steps for connecting a real database. Open them only if you are actively doing that setup.
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
                    data-testid={`persistence-runbook-copy-${index + 1}`}
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
      <div
        className="mt-4 rounded-[1.25rem] border border-black/5 bg-white px-5 py-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]"
        data-testid="persistence-guided-cutover"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">
              Guided cutover
            </p>
            <p className="mt-2 text-base font-semibold text-ink">
              {readiness.cutoverReport.stageHeadline}
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${
              readiness.cutoverReport.stage === "verification-passed"
                ? "bg-emerald-50 text-emerald-700"
                : readiness.cutoverReport.stage === "ready-for-verification"
                  ? "bg-amber-50 text-amber-700"
                  : "bg-rose-50 text-rose-700"
            }`}
          >
            {readiness.cutoverReport.stage.replaceAll("-", " ")}
          </span>
        </div>
        <p className="mt-3 text-sm leading-6 text-ink-soft">
          {readiness.cutoverReport.summary}
        </p>
        <p className="mt-2 text-xs leading-5 text-ink-muted">
          {readiness.cutoverReport.stageDescription}
        </p>
        {readiness.cutoverReport.detailLines.length ? (
          <div className="mt-3 space-y-2" data-testid="persistence-guided-details">
            {readiness.cutoverReport.detailLines.map((detail) => (
              <div
                key={detail}
                className="rounded-[0.9rem] bg-slate-50 px-4 py-3 text-xs leading-5 text-ink-soft"
              >
                {detail}
              </div>
            ))}
          </div>
        ) : null}
        {readiness.cutoverReport.actionItems.length ? (
          <div className="mt-3 space-y-2" data-testid="persistence-guided-actions">
            {readiness.cutoverReport.actionItems.map((item) => (
              <div
                key={`${item.label}-${item.status}`}
                className="flex items-start justify-between gap-3 rounded-[0.9rem] bg-white px-4 py-3"
              >
                <div>
                  <p className="text-sm text-ink-soft">{item.label}</p>
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
                  {item.status === "done"
                    ? "Done"
                    : item.status === "next"
                      ? "Do now"
                      : "Waiting"}
                </span>
              </div>
            ))}
          </div>
        ) : null}
        {readiness.cutoverReport.recommendedCommand ? (
          <details className="mt-3 rounded-[0.9rem] bg-slate-950 px-4 py-3">
            <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-[0.14em] text-white/75">
              Show recommended command
            </summary>
            <div className="mt-3 flex items-center justify-between gap-3">
              <code className="block text-xs text-white" data-testid="persistence-guided-command">
                {readiness.cutoverReport.recommendedCommand}
              </code>
              <button
                className="shrink-0 rounded-full border border-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/85 transition hover:border-white/30 hover:text-white"
                data-testid="persistence-copy-command"
                onClick={() => void handleCopyCommand(readiness.cutoverReport.recommendedCommand as string)}
                type="button"
              >
                {copiedKind === "command" &&
                copiedValue === readiness.cutoverReport.recommendedCommand
                  ? "Copied"
                  : "Copy"}
              </button>
            </div>
          </details>
        ) : null}
      </div>
      {changeHighlights.length ? (
        <div className="mt-4 rounded-[1rem] border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm leading-6 text-emerald-900">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
            Change detected
          </p>
          <div className="mt-2 space-y-1">
            {changeHighlights.map((item) => (
              <p key={item}>{item}</p>
            ))}
          </div>
        </div>
      ) : null}
      {copyFeedback ? (
        <div
          className="mt-4 rounded-[1rem] border border-sky-200 bg-sky-50 px-4 py-4 text-sm leading-6 text-sky-900"
          data-testid="persistence-copy-feedback"
        >
          {copyFeedback}
        </div>
      ) : null}
      <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {readiness.probes.map((item) => (
          <div
            key={item.label}
            className="rounded-[1rem] bg-slate-50 px-4 py-4 text-sm"
          >
            <p className="text-ink-soft">{item.label}</p>
            <p
              className={`mt-2 text-sm font-semibold uppercase tracking-[0.14em] ${
                item.status === "ready"
                  ? "text-emerald-700"
                  : item.status === "blocked"
                    ? "text-rose-700"
                    : "text-ink-soft"
              }`}
            >
              {item.status === "ready"
                ? "Ready"
                : item.status === "blocked"
                  ? "Blocked"
                  : "Next"}
            </p>
            <p className="mt-2 text-xs leading-5 text-ink-soft">{item.detail}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 grid gap-3 lg:grid-cols-3">
        {readiness.preflightReport.checks.map((action) => (
          <div
            key={action.label}
            className="rounded-[1rem] bg-slate-50 px-4 py-4 text-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-semibold text-ink">{action.label}</p>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${
                  action.status === "ready"
                    ? "bg-emerald-50 text-emerald-700"
                    : action.status === "blocked"
                      ? "bg-rose-50 text-rose-700"
                      : "bg-amber-50 text-amber-700"
                }`}
              >
                {getFriendlyStatusLabel(action.status)}
              </span>
            </div>
            <p className="mt-2 text-xs leading-5 text-ink-soft">{action.detail}</p>
            {action.command ? (
              <details className="mt-3 rounded-[0.9rem] bg-white px-4 py-3">
                <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                  Show command
                </summary>
                <div className="mt-3 flex items-center justify-between gap-3 rounded-[0.9rem] bg-slate-950 px-4 py-3">
                  <code className="block text-xs text-white">{action.command}</code>
                  <button
                    className="shrink-0 rounded-full border border-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/85 transition hover:border-white/30 hover:text-white"
                    data-testid="persistence-copy-command"
                    onClick={() => void handleCopyCommand(action.command as string)}
                    type="button"
                  >
                    {copiedKind === "command" && copiedValue === action.command
                      ? "Copied"
                      : "Copy"}
                  </button>
                </div>
              </details>
            ) : null}
          </div>
        ))}
      </div>
      {readiness.databaseError ? (
        <div className="mt-5 rounded-[1rem] border border-rose-200 bg-rose-50 px-4 py-4 text-sm leading-6 text-rose-800">
          Prisma connection note: {readiness.databaseError}
        </div>
      ) : null}
      {refreshError ? (
        <div className="mt-5 rounded-[1rem] border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-800">
          Refresh note: {refreshError}
        </div>
      ) : null}
    </section>
  );
}
