import type { PrismaPreflightCheck, PrismaPreflightReport } from "@/lib/lessonforge/prisma-preflight";
import {
  getPrismaCutoverFounderSummary,
  getPrismaCutoverStageDescription,
  getPrismaCutoverStageHeadline,
  type PrismaCutoverReport,
} from "@/lib/lessonforge/prisma-cutover";
import {
  describePersistenceStatus,
  getExpectedPrismaEnabled,
} from "@/lib/lessonforge/persistence-status-view";

export type PersistenceStatusView = {
  mode: string;
  prismaEnabled: boolean;
  label: string;
  detail: string;
};

export type PersistenceProbe = {
  label: string;
  status: "ready" | "waiting" | "blocked";
  detail: string;
};

export type PersistenceReadiness = {
  persistenceStatus: PersistenceStatusView;
  hasRealDatabaseUrl: boolean;
  databaseReachable: boolean;
  databaseError: string | null;
  probes: PersistenceProbe[];
  preflightReport: PrismaPreflightReport;
  cutoverReport: PrismaCutoverReport;
  nextActions: PrismaPreflightCheck[];
  founderSummary: string;
};

export type PersistenceReadinessError = {
  error: string;
};

export type PersistenceReadinessApiResponse =
  | PersistenceReadiness
  | PersistenceReadinessError;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPersistenceMode(value: unknown): value is "auto" | "json" | "prisma" {
  return value === "auto" || value === "json" || value === "prisma";
}

function isPrismaCutoverStage(
  value: unknown,
): value is
  | "preflight-blocked"
  | "ready-for-verification"
  | "verification-passed"
  | "verification-failed" {
  return (
    value === "preflight-blocked" ||
    value === "ready-for-verification" ||
    value === "verification-passed" ||
    value === "verification-failed"
  );
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isPersistenceProbeArray(value: unknown): value is PersistenceProbe[] {
  return (
    Array.isArray(value) &&
    value.every(
      (probe) =>
        isRecord(probe) &&
        typeof probe.label === "string" &&
        typeof probe.detail === "string" &&
        (probe.status === "ready" ||
          probe.status === "waiting" ||
          probe.status === "blocked"),
    )
  );
}

function isCutoverActionItemArray(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        isRecord(item) &&
        typeof item.label === "string" &&
        typeof item.statusDescription === "string" &&
        (item.status === "done" || item.status === "next" || item.status === "blocked"),
    )
  );
}

function isPrismaPreflightCheckArray(value: unknown): value is PrismaPreflightCheck[] {
  return (
    Array.isArray(value) &&
    value.every(
      (check) =>
        isRecord(check) &&
        typeof check.label === "string" &&
        typeof check.detail === "string" &&
        (check.command === undefined || typeof check.command === "string") &&
        (check.status === "ready" || check.status === "next" || check.status === "blocked"),
    )
  );
}

export function isPersistenceReadinessError(
  value: PersistenceReadinessApiResponse | unknown,
): value is PersistenceReadinessError {
  return isRecord(value) && typeof value.error === "string";
}

export function isPersistenceReadiness(
  value: PersistenceReadinessApiResponse | unknown,
): value is PersistenceReadiness {
  if (!isRecord(value)) {
    return false;
  }

  if (!isRecord(value.persistenceStatus)) {
    return false;
  }

  if (!isPersistenceProbeArray(value.probes)) {
    return false;
  }

  if (!isRecord(value.preflightReport)) {
    return false;
  }

  if (!isRecord(value.cutoverReport)) {
    return false;
  }

  if (!isPrismaPreflightCheckArray(value.nextActions)) {
    return false;
  }

  return (
    typeof value.hasRealDatabaseUrl === "boolean" &&
    typeof value.databaseReachable === "boolean" &&
    (typeof value.databaseError === "string" || value.databaseError === null) &&
    (!value.hasRealDatabaseUrl ? value.databaseReachable === false : true) &&
    (value.databaseReachable ? value.databaseError === null : true) &&
    isPersistenceMode(value.persistenceStatus.mode) &&
    typeof value.persistenceStatus.prismaEnabled === "boolean" &&
    value.persistenceStatus.prismaEnabled ===
      getExpectedPrismaEnabled({
        mode: value.persistenceStatus.mode,
        hasRealDatabaseUrl: value.hasRealDatabaseUrl,
      }) &&
    value.persistenceStatus.label ===
      describePersistenceStatus({
        mode: value.persistenceStatus.mode,
        hasRealDatabaseUrl: value.hasRealDatabaseUrl,
        prismaEnabled: value.persistenceStatus.prismaEnabled,
      }).label &&
    value.persistenceStatus.detail ===
      describePersistenceStatus({
        mode: value.persistenceStatus.mode,
        hasRealDatabaseUrl: value.hasRealDatabaseUrl,
        prismaEnabled: value.persistenceStatus.prismaEnabled,
      }).detail &&
    isPersistenceMode(value.preflightReport.mode) &&
    value.preflightReport.mode === value.persistenceStatus.mode &&
    value.preflightReport.hasRealDatabaseUrl === value.hasRealDatabaseUrl &&
    value.preflightReport.databaseReachable === value.databaseReachable &&
    value.preflightReport.databaseError === value.databaseError &&
    typeof value.preflightReport.summary === "string" &&
    isPrismaPreflightCheckArray(value.preflightReport.checks) &&
    JSON.stringify(value.nextActions) === JSON.stringify(value.preflightReport.checks) &&
    isPrismaCutoverStage(value.cutoverReport.stage) &&
    isRecord(value.cutoverReport.preflightReport) &&
    value.cutoverReport.preflightReport.mode === value.preflightReport.mode &&
    value.cutoverReport.preflightReport.hasRealDatabaseUrl ===
      value.preflightReport.hasRealDatabaseUrl &&
    value.cutoverReport.preflightReport.databaseReachable ===
      value.preflightReport.databaseReachable &&
    value.cutoverReport.preflightReport.databaseError ===
      value.preflightReport.databaseError &&
    value.cutoverReport.preflightReport.summary === value.preflightReport.summary &&
    JSON.stringify(value.cutoverReport.preflightReport.checks) ===
      JSON.stringify(value.preflightReport.checks) &&
    value.cutoverReport.stageHeadline ===
      getPrismaCutoverStageHeadline(value.cutoverReport.stage) &&
    value.cutoverReport.stageDescription ===
      getPrismaCutoverStageDescription(value.cutoverReport.stage) &&
    value.founderSummary ===
      getPrismaCutoverFounderSummary(value.cutoverReport as PrismaCutoverReport) &&
    typeof value.cutoverReport.summary === "string" &&
    isStringArray(value.cutoverReport.detailLines) &&
    isStringArray(value.cutoverReport.runbookCommands) &&
    isCutoverActionItemArray(value.cutoverReport.actionItems)
  );
}
