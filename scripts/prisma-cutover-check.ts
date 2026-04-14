process.env.LESSONFORGE_PERSISTENCE_MODE = process.env.LESSONFORGE_PERSISTENCE_MODE ?? "prisma";

import { PrismaClient } from "@prisma/client";
import {
  buildPrismaCutoverReport,
  canRunPrismaSellerFlowVerification,
} from "@/lib/lessonforge/prisma-cutover";
import {
  buildPrismaPreflightReport,
  formatPrismaPreflightStatus,
  hasRealDatabaseUrl,
} from "@/lib/lessonforge/prisma-preflight";
import { verifyPrismaSellerFlow } from "@/lib/lessonforge/prisma-seller-flow";

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

  await prisma.$disconnect();

  const preflightReport = buildPrismaPreflightReport({
    mode,
    hasRealDatabaseUrl: realDatabaseUrl,
    databaseReachable,
    databaseError,
  });

  let cutoverReport = buildPrismaCutoverReport({ preflightReport });

  if (canRunPrismaSellerFlowVerification(preflightReport)) {
    try {
      const verificationReport = await verifyPrismaSellerFlow();
      cutoverReport = buildPrismaCutoverReport({
        preflightReport,
        verificationReport,
      });
    } catch (error) {
      cutoverReport = {
        ...buildPrismaCutoverReport({ preflightReport }),
        stage: "verification-failed",
        summary:
          error instanceof Error
            ? error.message
            : "Unknown Prisma seller-flow verification error.",
        recommendedCommand: "npm run prisma:verify-seller-flow",
      };
    }
  }

  if (wantsJson) {
    console.log(JSON.stringify(cutoverReport, null, 2));
  } else {
    console.log("\nLessonForge Prisma cutover check\n");
    console.log(`Stage: ${cutoverReport.stage}`);
    console.log(`Summary: ${cutoverReport.summary}\n`);
    console.log(`Stage meaning: ${cutoverReport.stageDescription}\n`);

    if (cutoverReport.runbookCommands.length) {
      console.log("Suggested run order:\n");
      for (const [index, command] of cutoverReport.runbookCommands.entries()) {
        console.log(`${index + 1}. ${command}`);
      }
      console.log("");
    }

    console.log("Cutover action list:\n");
    for (const item of cutoverReport.actionItems) {
      const status =
        item.status === "done" ? "DONE" : item.status === "next" ? "NEXT" : "BLOCKED";
      console.log(`[${status}] ${item.label}`);
      console.log(`  ${item.statusDescription}`);
    }
    console.log("");

    console.log("Preflight checks:\n");
    for (const check of preflightReport.checks) {
      console.log(`[${formatPrismaPreflightStatus(check.status)}] ${check.label}`);
      console.log(`  ${check.detail}`);

      if (check.command) {
        console.log(`  Command: ${check.command}`);
      }

      console.log("");
    }

    if (cutoverReport.verificationReport) {
      console.log("Seller-flow verification:\n");
      for (const step of cutoverReport.verificationReport.steps) {
        const status = step.status === "ready" ? "READY" : "BLOCKED";
        console.log(`[${status}] ${step.label}`);
        console.log(`  ${step.detail}\n`);
      }
    } else if (cutoverReport.recommendedCommand) {
      console.log(`Next command: ${cutoverReport.recommendedCommand}\n`);
    }
  }

  if (!cutoverReport.ok) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Unknown Prisma cutover check error.",
  );
  process.exitCode = 1;
});
