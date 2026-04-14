process.env.LESSONFORGE_PERSISTENCE_MODE = "prisma";

import { verifyPrismaSellerFlow } from "@/lib/lessonforge/prisma-seller-flow";

async function main() {
  const wantsJson = process.argv.includes("--json");
  const report = await verifyPrismaSellerFlow();

  if (wantsJson) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(report.summary);
    for (const step of report.steps) {
      console.log(step.detail);
    }
  }
}

main().catch((error) => {
  const message =
    error instanceof Error ? error.message : "Unknown Prisma verification error.";
  if (process.argv.includes("--json")) {
    console.error(
      JSON.stringify(
        {
          ok: false,
          mode: "prisma",
          summary: message,
        },
        null,
        2,
      ),
    );
  } else {
    console.error(message);
  }
  process.exitCode = 1;
});
