import { PrismaClient } from "@prisma/client";
import {
  buildPrismaPreflightReport,
  formatPrismaPreflightStatus,
  hasRealDatabaseUrl,
} from "@/lib/lessonforge/prisma-preflight";

async function main() {
  const wantsJson = process.argv.includes("--json");
  const mode = process.env.LESSONFORGE_PERSISTENCE_MODE ?? "auto";
  const realDatabaseUrl = hasRealDatabaseUrl();
  const prisma = new PrismaClient({
    log: ["error"],
  });

  let databaseReachable = false;
  let databaseError: string | null = null;

  if (realDatabaseUrl) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      databaseReachable = true;
    } catch (error) {
      databaseReachable = false;
      databaseError =
        error instanceof Error ? error.message : "Unknown Prisma connection error.";
    }
  }

  const report = buildPrismaPreflightReport({
    mode,
    hasRealDatabaseUrl: realDatabaseUrl,
    databaseReachable,
    databaseError,
  });

  if (wantsJson) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log("\nLessonForge Prisma preflight\n");
    console.log(`Persistence mode: ${report.mode}`);
    console.log(`Real DATABASE_URL configured: ${report.hasRealDatabaseUrl ? "yes" : "no"}`);
    console.log(`Database reachable: ${report.databaseReachable ? "yes" : "no"}\n`);

    for (const check of report.checks) {
      console.log(`[${formatPrismaPreflightStatus(check.status)}] ${check.label}`);
      console.log(`  ${check.detail}`);

      if (check.command) {
        console.log(`  Command: ${check.command}`);
      }

      console.log("");
    }
  }

  await prisma.$disconnect();

  if (report.checks.some((check) => check.status === "blocked")) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Unknown Prisma preflight error.",
  );
  process.exitCode = 1;
});
