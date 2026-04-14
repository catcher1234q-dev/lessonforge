import assert from "node:assert/strict";
import test from "node:test";

import { getPersistenceBadgeState } from "@/lib/lessonforge/persistence-badge";
import type { PrismaCutoverReport } from "@/lib/lessonforge/prisma-cutover";

function createReport(
  stage: PrismaCutoverReport["stage"],
  summary = "Example summary.",
): PrismaCutoverReport {
  return {
    ok: stage === "verification-passed",
    stage,
    stageHeadline: "Example headline.",
    stageDescription: "Example stage description.",
    summary,
    detailLines: [],
    runbookCommands: ["npm run verify:persistence:ops"],
    recommendedCommand:
      stage === "verification-passed" ? null : "npm run prisma:verify-seller-flow",
    actionItems: [],
    preflightReport: {
      mode: "prisma",
      hasRealDatabaseUrl: true,
      databaseReachable: true,
      databaseError: null,
      summary,
      checks: [],
    },
    verificationReport: null,
  };
}

test("badge shows blocked when cutover is still blocked", () => {
  const badge = getPersistenceBadgeState(createReport("preflight-blocked"));

  assert.deepEqual(badge, {
    label: "Cutover blocked",
    toneClassName: "bg-rose-50 text-rose-700",
  });
});

test("badge shows ready-to-verify when the environment is prepared", () => {
  const badge = getPersistenceBadgeState(createReport("ready-for-verification"));

  assert.deepEqual(badge, {
    label: "Ready to verify",
    toneClassName: "bg-amber-50 text-amber-700",
  });
});

test("badge shows failed when live verification still needs attention", () => {
  const badge = getPersistenceBadgeState(createReport("verification-failed"));

  assert.deepEqual(badge, {
    label: "Verification failed",
    toneClassName: "bg-rose-50 text-rose-700",
  });
});

test("badge shows verified when cutover passes", () => {
  const badge = getPersistenceBadgeState(createReport("verification-passed"));

  assert.deepEqual(badge, {
    label: "Cutover verified",
    toneClassName: "bg-emerald-50 text-emerald-700",
  });
});
