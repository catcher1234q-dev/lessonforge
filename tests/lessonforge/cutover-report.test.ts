import assert from "node:assert/strict";
import test from "node:test";

import { formatPrismaCutoverSummaryReport } from "@/lib/lessonforge/cutover-report";
import type { PrismaCutoverReport } from "@/lib/lessonforge/prisma-cutover";

const sampleCutoverReport: PrismaCutoverReport = {
  ok: false,
  stage: "preflight-blocked",
  stageHeadline: "Blocked before live verification",
  stageDescription:
    "Required database or Prisma setup is still missing before a live verification run can begin.",
  summary: "The current DATABASE_URL is missing or still using the placeholder value.",
  detailLines: ["The current DATABASE_URL is missing or still using the placeholder value."],
  runbookCommands: [
    "npm run verify:persistence:ops",
    "DATABASE_URL=postgresql://username:password@host:5432/lessonforge",
  ],
  recommendedCommand:
    "DATABASE_URL=postgresql://username:password@host:5432/lessonforge",
  actionItems: [
    {
      label: "Real DATABASE_URL configured",
      status: "blocked",
      statusDescription: "Waiting on an earlier prerequisite.",
    },
  ],
  preflightReport: {
    mode: "auto",
    hasRealDatabaseUrl: false,
    databaseReachable: false,
    databaseError: null,
    summary: "The current DATABASE_URL is missing or still using the placeholder value.",
    checks: [],
  },
  verificationReport: null,
};

test("cutover report formatter returns a readable founder/admin summary", () => {
  const report = formatPrismaCutoverSummaryReport({
    report: sampleCutoverReport,
    summary:
      "Database setup is still blocked. The next founder-visible step is DATABASE_URL=postgresql://username:password@host:5432/lessonforge.",
    runtimeLabel: "Auto mode using demo JSON",
    runtimeDetail:
      "Auto mode did not find a real database URL, so the app is currently using local demo JSON storage.",
    runtimeMode: "auto",
  });

  assert.match(report, /Database cutover: Blocked before live verification/);
  assert.match(report, /Founder summary: Database setup is still blocked/);
  assert.match(report, /Current runtime storage: Auto mode using demo JSON \(mode: auto\)/);
  assert.match(report, /Suggested run order:/);
  assert.match(report, /1\. npm run verify:persistence:ops/);
  assert.match(report, /Cutover actions:/);
  assert.match(report, /\[blocked\] Real DATABASE_URL configured/);
});
