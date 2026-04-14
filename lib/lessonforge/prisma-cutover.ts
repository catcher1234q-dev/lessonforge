import type { PrismaPreflightReport } from "@/lib/lessonforge/prisma-preflight";
import type { PrismaSellerFlowReport } from "@/lib/lessonforge/prisma-verify-contract";

export type PrismaCutoverStage =
  | "preflight-blocked"
  | "ready-for-verification"
  | "verification-passed"
  | "verification-failed";

export type PrismaCutoverReport = {
  ok: boolean;
  stage: PrismaCutoverStage;
  stageHeadline: string;
  stageDescription: string;
  summary: string;
  detailLines: string[];
  runbookCommands: string[];
  recommendedCommand: string | null;
  actionItems: PrismaCutoverActionItem[];
  preflightReport: PrismaPreflightReport;
  verificationReport: PrismaSellerFlowReport | null;
};

export type PrismaCutoverActionItem = {
  label: string;
  status: "done" | "next" | "blocked";
  statusDescription: string;
};

type PrismaCutoverBase = Omit<
  PrismaCutoverReport,
  "stageHeadline" | "stageDescription" | "detailLines" | "runbookCommands" | "actionItems"
>;

export function getPrismaCutoverStageDescription(stage: PrismaCutoverStage) {
  if (stage === "preflight-blocked") {
    return "Required database or Prisma setup is still missing before a live verification run can begin.";
  }

  if (stage === "ready-for-verification") {
    return "The environment is ready, and the next live step is seller-flow verification.";
  }

  if (stage === "verification-passed") {
    return "The first strict Prisma seller-flow verification completed successfully.";
  }

  return "Prisma was reachable, but the live verification still found a persistence-path problem.";
}

export function getPrismaCutoverActionStatusDescription(
  status: PrismaCutoverActionItem["status"],
) {
  if (status === "done") {
    return "Already satisfied.";
  }

  if (status === "next") {
    return "Run this now.";
  }

  return "Waiting on an earlier prerequisite.";
}

export function getPrismaCutoverStageHeadline(stage: PrismaCutoverStage) {
  if (stage === "preflight-blocked") {
    return "Blocked before live verification";
  }

  if (stage === "ready-for-verification") {
    return "Ready for live verification";
  }

  if (stage === "verification-passed") {
    return "Live verification passed";
  }

  return "Live verification needs attention";
}

export function getPrismaCutoverFounderSummary(report: PrismaCutoverReport) {
  if (report.stage === "preflight-blocked") {
    return report.recommendedCommand
      ? `Database setup is still blocked. The next founder-visible step is ${report.recommendedCommand}.`
      : "Database setup is still blocked before live Prisma verification can begin.";
  }

  if (report.stage === "ready-for-verification") {
    return "The database environment is ready for the first strict Prisma seller-flow verification run.";
  }

  if (report.stage === "verification-passed") {
    return "Strict Prisma seller-flow verification has passed, so the database cutover path is in a healthy state.";
  }

  return report.recommendedCommand
    ? `Strict Prisma verification still needs attention. Re-run ${report.recommendedCommand} after fixing the reported issue.`
    : "Strict Prisma verification still needs attention before the database cutover can be treated as healthy.";
}

export function getPrismaCutoverDetailLines(report: PrismaCutoverBase) {
  if (report.verificationReport) {
    return report.verificationReport.steps.map((step) => step.detail);
  }

  if (report.stage === "ready-for-verification") {
    return [
      "The database is reachable.",
      "Strict Prisma mode is active.",
      "The next live check is seller profile and product verification.",
    ];
  }

  return report.preflightReport.checks
    .filter((check) => check.status !== "ready")
    .map((check) => check.detail)
    .slice(0, 3);
}

export function getPrismaCutoverActionItems(
  report: PrismaCutoverBase,
): PrismaCutoverActionItem[] {
  if (report.verificationReport) {
    return report.verificationReport.steps.map((step) => ({
      label: step.label,
      status: step.status === "ready" ? "done" : "blocked",
      statusDescription: getPrismaCutoverActionStatusDescription(
        step.status === "ready" ? "done" : "blocked",
      ),
    }));
  }

  if (report.stage === "ready-for-verification") {
    return [
      {
        label: "Real DATABASE_URL configured",
        status: "done",
        statusDescription: getPrismaCutoverActionStatusDescription("done"),
      },
      {
        label: "Strict Prisma mode enabled",
        status: "done",
        statusDescription: getPrismaCutoverActionStatusDescription("done"),
      },
      {
        label: "Run seller-flow verification",
        status: "next",
        statusDescription: getPrismaCutoverActionStatusDescription("next"),
      },
    ];
  }

  return report.preflightReport.checks.map((check) => {
    const status =
      check.status === "ready"
        ? "done"
        : check.status === "next"
          ? "next"
          : "blocked";

    return {
      label: check.label,
      status,
      statusDescription: getPrismaCutoverActionStatusDescription(status),
    };
  });
}

export function getPrismaCutoverRunbookCommands(report: PrismaCutoverReport) {
  const commands: string[] = ["npm run verify:persistence:ops"];

  for (const check of report.preflightReport.checks) {
    if (!check.command) {
      continue;
    }

    if (!commands.includes(check.command)) {
      commands.push(check.command);
    }
  }

  if (report.recommendedCommand && !commands.includes(report.recommendedCommand)) {
    commands.push(report.recommendedCommand);
  }

  return commands.slice(0, 4);
}

export function canRunPrismaSellerFlowVerification(preflightReport: PrismaPreflightReport) {
  return (
    preflightReport.hasRealDatabaseUrl &&
    preflightReport.databaseReachable &&
    preflightReport.mode === "prisma"
  );
}

export function buildPrismaCutoverReport({
  preflightReport,
  verificationReport = null,
}: {
  preflightReport: PrismaPreflightReport;
  verificationReport?: PrismaSellerFlowReport | null;
}): PrismaCutoverReport {
  if (!canRunPrismaSellerFlowVerification(preflightReport)) {
    const baseReport = {
      ok: false,
      stage: "preflight-blocked" as const,
      summary: preflightReport.summary,
      recommendedCommand:
        preflightReport.checks.find((check) => check.status !== "ready")?.command ?? null,
      preflightReport,
      verificationReport: null,
    };

    const detailLines = getPrismaCutoverDetailLines(baseReport);
    return {
      ...baseReport,
      stageHeadline: getPrismaCutoverStageHeadline(baseReport.stage),
      stageDescription: getPrismaCutoverStageDescription(baseReport.stage),
      detailLines,
      runbookCommands: getPrismaCutoverRunbookCommands({
        ...baseReport,
        stageHeadline: getPrismaCutoverStageHeadline(baseReport.stage),
        stageDescription: getPrismaCutoverStageDescription(baseReport.stage),
        detailLines,
        runbookCommands: [],
        actionItems: [],
      }),
      actionItems: getPrismaCutoverActionItems(baseReport),
    };
  }

  if (!verificationReport) {
    const baseReport = {
      ok: false,
      stage: "ready-for-verification" as const,
      summary:
        preflightReport.checks.find(
          (check) => check.label === "Ready for seller-flow verification",
        )?.detail ?? "The next cutover step is ready to run.",
      recommendedCommand: "npm run prisma:verify-seller-flow",
      preflightReport,
      verificationReport: null,
    };

    const detailLines = getPrismaCutoverDetailLines(baseReport);
    return {
      ...baseReport,
      stageHeadline: getPrismaCutoverStageHeadline(baseReport.stage),
      stageDescription: getPrismaCutoverStageDescription(baseReport.stage),
      detailLines,
      runbookCommands: getPrismaCutoverRunbookCommands({
        ...baseReport,
        stageHeadline: getPrismaCutoverStageHeadline(baseReport.stage),
        stageDescription: getPrismaCutoverStageDescription(baseReport.stage),
        detailLines,
        runbookCommands: [],
        actionItems: [],
      }),
      actionItems: getPrismaCutoverActionItems(baseReport),
    };
  }

  const baseReport = {
    ok: verificationReport.ok,
    stage: (verificationReport.ok ? "verification-passed" : "verification-failed") as
      | "verification-passed"
      | "verification-failed",
    summary: verificationReport.summary,
    recommendedCommand: verificationReport.ok ? null : "npm run prisma:verify-seller-flow",
    preflightReport,
    verificationReport,
  };

  const detailLines = getPrismaCutoverDetailLines(baseReport);
  return {
    ...baseReport,
    stageHeadline: getPrismaCutoverStageHeadline(baseReport.stage),
    stageDescription: getPrismaCutoverStageDescription(baseReport.stage),
    detailLines,
    runbookCommands: getPrismaCutoverRunbookCommands({
      ...baseReport,
      stageHeadline: getPrismaCutoverStageHeadline(baseReport.stage),
      stageDescription: getPrismaCutoverStageDescription(baseReport.stage),
      detailLines,
      runbookCommands: [],
      actionItems: [],
    }),
    actionItems: getPrismaCutoverActionItems(baseReport),
  };
}
