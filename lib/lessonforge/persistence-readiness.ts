import { prisma } from "@/lib/prisma/client";
import type {
  PersistenceProbe,
  PersistenceReadiness,
} from "@/lib/lessonforge/persistence-readiness-contract";
import {
  buildPrismaPreflightReport,
  hasRealDatabaseUrl,
  type PrismaPreflightCheck,
} from "@/lib/lessonforge/prisma-preflight";
import {
  buildPrismaCutoverReport,
  getPrismaCutoverFounderSummary,
} from "@/lib/lessonforge/prisma-cutover";
import {
  getPersistenceMode,
  getPersistenceStatus,
  isPrismaPersistenceEnabled,
} from "@/lib/prisma/client";

export type { PersistenceProbe, PersistenceReadiness } from "@/lib/lessonforge/persistence-readiness-contract";

export async function getPersistenceReadiness(): Promise<PersistenceReadiness> {
  const persistenceStatus = getPersistenceStatus();
  const mode = getPersistenceMode();
  const prismaEnabled = isPrismaPersistenceEnabled();
  const realDatabaseUrlConfigured = hasRealDatabaseUrl();

  let databaseReachable = false;
  let databaseError: string | null = null;

  if (prismaEnabled || mode === "prisma") {
    try {
      await prisma.$queryRaw`SELECT 1`;
      databaseReachable = true;
    } catch (error) {
      databaseReachable = false;
      databaseError =
        error instanceof Error ? error.message : "Unknown Prisma connection error.";
    }
  }

  const probes: PersistenceProbe[] = [
    {
      label: "Persistence mode configured",
      status:
        mode === "json" ? "waiting" : mode === "auto" ? "waiting" : "ready",
      detail:
        mode === "prisma"
          ? "The app is explicitly configured to use strict Prisma mode."
          : mode === "auto"
            ? "The app is still in auto mode, which can fall back to JSON while the database cutover is unfinished."
            : "The app is explicitly pinned to local JSON mode.",
    },
    {
      label: "Database connection reachable",
      status: databaseReachable ? "ready" : prismaEnabled || mode === "prisma" ? "blocked" : "waiting",
      detail: databaseReachable
        ? "Prisma successfully reached the configured database."
        : prismaEnabled || mode === "prisma"
          ? `Prisma could not reach the database yet. ${databaseError ?? ""}`.trim()
          : "The app is not currently trying to use Prisma, so database reachability is not active yet.",
    },
    {
      label: "Seller profiles on Prisma path",
      status:
        databaseReachable && prismaEnabled
          ? "ready"
          : mode === "prisma"
            ? "blocked"
            : "waiting",
      detail:
        databaseReachable && prismaEnabled
          ? "Seller profile saves and reads are positioned to run through Prisma."
          : mode === "prisma"
            ? "Strict Prisma mode is selected, but the database path still needs to verify cleanly."
            : "Seller profiles still rely on the forgiving fallback path until Prisma mode is fully active.",
    },
    {
      label: "Products on Prisma path",
      status:
        databaseReachable && prismaEnabled
          ? "ready"
          : mode === "prisma"
            ? "blocked"
            : "waiting",
      detail:
        databaseReachable && prismaEnabled
          ? "Seller-created product saves and reads are positioned to run through Prisma."
          : mode === "prisma"
            ? "Strict Prisma mode is selected, but the product persistence path still needs a healthy database connection."
            : "Products still rely on the forgiving fallback path until Prisma mode is fully active.",
    },
  ];

  const preflightReport = buildPrismaPreflightReport({
    mode,
    hasRealDatabaseUrl: realDatabaseUrlConfigured,
    databaseReachable,
    databaseError,
  });

  const nextActions: PrismaPreflightCheck[] = preflightReport.checks;
  const cutoverReport = buildPrismaCutoverReport({ preflightReport });

  return {
    persistenceStatus,
    hasRealDatabaseUrl: realDatabaseUrlConfigured,
    databaseReachable,
    databaseError,
    probes,
    preflightReport,
    cutoverReport,
    nextActions,
    founderSummary: getPrismaCutoverFounderSummary(cutoverReport),
  };
}
