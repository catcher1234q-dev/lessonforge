export type PrismaPreflightStatus = "ready" | "next" | "blocked";

export type PrismaPreflightCheck = {
  label: string;
  status: PrismaPreflightStatus;
  detail: string;
  command?: string;
};

export type PrismaPreflightReport = {
  mode: string;
  hasRealDatabaseUrl: boolean;
  databaseReachable: boolean;
  databaseError: string | null;
  summary: string;
  checks: PrismaPreflightCheck[];
};

type BuildPrismaPreflightChecksInput = {
  mode: string;
  hasRealDatabaseUrl: boolean;
  databaseReachable: boolean;
  databaseError?: string | null;
};

const PLACEHOLDER_DATABASE_URL = "USER:PASSWORD@localhost:5432/lessonforge";

export function hasRealDatabaseUrl(databaseUrl = process.env.DATABASE_URL) {
  return Boolean(databaseUrl) && !databaseUrl?.includes(PLACEHOLDER_DATABASE_URL);
}

export function buildPrismaPreflightChecks({
  mode,
  hasRealDatabaseUrl,
  databaseReachable,
  databaseError,
}: BuildPrismaPreflightChecksInput): PrismaPreflightCheck[] {
  return [
    {
      label: "Real DATABASE_URL configured",
      status: hasRealDatabaseUrl ? "ready" : "blocked",
      detail: hasRealDatabaseUrl
        ? "A real Postgres connection string is available."
        : "The current DATABASE_URL is missing or still using the placeholder value.",
      command: hasRealDatabaseUrl
        ? undefined
        : "DATABASE_URL=postgresql://username:password@host:5432/lessonforge",
    },
    {
      label: "Persistence mode switched to strict Prisma",
      status: mode === "prisma" ? "ready" : "next",
      detail:
        mode === "prisma"
          ? "The app is configured to fail loudly on Prisma errors."
          : "Switch to strict Prisma mode before the live cutover verification run.",
      command: mode === "prisma" ? undefined : "LESSONFORGE_PERSISTENCE_MODE=prisma",
    },
    {
      label: "Database connection reachable",
      status: databaseReachable ? "ready" : "blocked",
      detail: databaseReachable
        ? "Prisma successfully reached the configured database."
        : hasRealDatabaseUrl
          ? `Prisma could not reach the database yet. ${databaseError ?? ""}`.trim()
          : "The database cannot be checked until a real DATABASE_URL is configured.",
      command: databaseReachable ? undefined : "npm run prisma:migrate",
    },
    {
      label: "Ready for seller-flow verification",
      status: databaseReachable && mode === "prisma" ? "next" : "blocked",
      detail:
        databaseReachable && mode === "prisma"
          ? "The next cutover step is the real seller profile and product write/read verification."
          : databaseReachable
            ? "The database is reachable, but the app is not in strict Prisma mode yet."
            : "This verification is still blocked until strict Prisma mode is set and the database is reachable.",
      command: "npm run prisma:verify-seller-flow",
    },
  ];
}

export function getPrismaPreflightSummary(checks: PrismaPreflightCheck[]) {
  return (
    checks.find((check) => check.status !== "ready")?.detail ??
    "The first strict Prisma cutover checks are positioned to run."
  );
}

export function buildPrismaPreflightReport(
  input: BuildPrismaPreflightChecksInput,
): PrismaPreflightReport {
  const checks = buildPrismaPreflightChecks(input);

  return {
    mode: input.mode,
    hasRealDatabaseUrl: input.hasRealDatabaseUrl,
    databaseReachable: input.databaseReachable,
    databaseError: input.databaseError ?? null,
    summary: getPrismaPreflightSummary(checks),
    checks,
  };
}

export function formatPrismaPreflightStatus(status: PrismaPreflightStatus) {
  if (status === "ready") {
    return "READY";
  }

  if (status === "next") {
    return "NEXT";
  }

  return "BLOCKED";
}
