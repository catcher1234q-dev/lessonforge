import assert from "node:assert/strict";
import test from "node:test";

import {
  buildPrismaCutoverReport,
  canRunPrismaSellerFlowVerification,
  getPrismaCutoverActionItems,
  getPrismaCutoverActionStatusDescription,
  getPrismaCutoverDetailLines,
  getPrismaCutoverFounderSummary,
  getPrismaCutoverRunbookCommands,
  getPrismaCutoverStageDescription,
  getPrismaCutoverStageHeadline,
} from "@/lib/lessonforge/prisma-cutover";
import { buildPrismaPreflightReport } from "@/lib/lessonforge/prisma-preflight";
import { buildPrismaSellerFlowReport } from "@/lib/lessonforge/prisma-verify-contract";

test("cutover stays blocked when preflight is not ready", () => {
  const preflightReport = buildPrismaPreflightReport({
    mode: "auto",
    hasRealDatabaseUrl: false,
    databaseReachable: false,
    databaseError: null,
  });

  assert.equal(canRunPrismaSellerFlowVerification(preflightReport), false);

  const report = buildPrismaCutoverReport({ preflightReport });

  assert.equal(report.ok, false);
  assert.equal(report.stage, "preflight-blocked");
  assert.equal(report.stageHeadline, "Blocked before live verification");
  assert.equal(
    report.stageDescription,
    "Required database or Prisma setup is still missing before a live verification run can begin.",
  );
  assert.equal(
    report.recommendedCommand,
    "DATABASE_URL=postgresql://username:password@host:5432/lessonforge",
  );
  assert.deepEqual(report.detailLines, [
    "The current DATABASE_URL is missing or still using the placeholder value.",
    "Switch to strict Prisma mode before the live cutover verification run.",
    "The database cannot be checked until a real DATABASE_URL is configured.",
  ]);
  assert.deepEqual(report.runbookCommands, [
    "npm run verify:persistence:ops",
    "DATABASE_URL=postgresql://username:password@host:5432/lessonforge",
    "LESSONFORGE_PERSISTENCE_MODE=prisma",
    "npm run prisma:migrate",
  ]);
  assert.deepEqual(report.actionItems, [
    {
      label: "Real DATABASE_URL configured",
      status: "blocked",
      statusDescription: "Waiting on an earlier prerequisite.",
    },
    {
      label: "Persistence mode switched to strict Prisma",
      status: "next",
      statusDescription: "Run this now.",
    },
    {
      label: "Database connection reachable",
      status: "blocked",
      statusDescription: "Waiting on an earlier prerequisite.",
    },
    {
      label: "Ready for seller-flow verification",
      status: "blocked",
      statusDescription: "Waiting on an earlier prerequisite.",
    },
  ]);
  assert.equal(report.verificationReport, null);
});

test("cutover points to seller-flow verification when strict prisma is ready", () => {
  const preflightReport = buildPrismaPreflightReport({
    mode: "prisma",
    hasRealDatabaseUrl: true,
    databaseReachable: true,
    databaseError: null,
  });

  assert.equal(canRunPrismaSellerFlowVerification(preflightReport), true);

  const report = buildPrismaCutoverReport({ preflightReport });

  assert.equal(report.ok, false);
  assert.equal(report.stage, "ready-for-verification");
  assert.equal(report.stageHeadline, "Ready for live verification");
  assert.equal(
    report.stageDescription,
    "The environment is ready, and the next live step is seller-flow verification.",
  );
  assert.equal(report.recommendedCommand, "npm run prisma:verify-seller-flow");
  assert.deepEqual(report.detailLines, [
    "The database is reachable.",
    "Strict Prisma mode is active.",
    "The next live check is seller profile and product verification.",
  ]);
  assert.deepEqual(report.runbookCommands, [
    "npm run verify:persistence:ops",
    "npm run prisma:verify-seller-flow",
  ]);
  assert.deepEqual(report.actionItems, [
    {
      label: "Real DATABASE_URL configured",
      status: "done",
      statusDescription: "Already satisfied.",
    },
    {
      label: "Strict Prisma mode enabled",
      status: "done",
      statusDescription: "Already satisfied.",
    },
    {
      label: "Run seller-flow verification",
      status: "next",
      statusDescription: "Run this now.",
    },
  ]);
  assert.equal(
    report.summary,
    "The next cutover step is the real seller profile and product write/read verification.",
  );
});

test("cutover reports a passed verification run", () => {
  const preflightReport = buildPrismaPreflightReport({
    mode: "prisma",
    hasRealDatabaseUrl: true,
    databaseReachable: true,
    databaseError: null,
  });
  const verificationReport = buildPrismaSellerFlowReport({
    sellerEmail: "seller@example.com",
    productId: "product-123",
    sellerProfileSaved: true,
    productSaved: true,
  });

  const report = buildPrismaCutoverReport({
    preflightReport,
    verificationReport,
  });

  assert.equal(report.ok, true);
  assert.equal(report.stage, "verification-passed");
  assert.equal(report.stageHeadline, "Live verification passed");
  assert.equal(
    report.stageDescription,
    "The first strict Prisma seller-flow verification completed successfully.",
  );
  assert.equal(report.recommendedCommand, null);
  assert.deepEqual(report.detailLines, [
    "Seller profile save and reload succeeded for seller@example.com.",
    "Seller product save and reload succeeded for product-123.",
  ]);
  assert.deepEqual(report.runbookCommands, [
    "npm run verify:persistence:ops",
    "npm run prisma:verify-seller-flow",
  ]);
  assert.deepEqual(report.actionItems, [
    {
      label: "Seller profile saved and reloaded",
      status: "done",
      statusDescription: "Already satisfied.",
    },
    {
      label: "Seller product saved and reloaded",
      status: "done",
      statusDescription: "Already satisfied.",
    },
  ]);
  assert.equal(report.summary, "Prisma seller flow verification passed.");
});

test("cutover reports a failed verification run", () => {
  const preflightReport = buildPrismaPreflightReport({
    mode: "prisma",
    hasRealDatabaseUrl: true,
    databaseReachable: true,
    databaseError: null,
  });
  const verificationReport = buildPrismaSellerFlowReport({
    sellerEmail: "seller@example.com",
    productId: "product-123",
    sellerProfileSaved: true,
    productSaved: false,
  });

  const report = buildPrismaCutoverReport({
    preflightReport,
    verificationReport,
  });

  assert.equal(report.ok, false);
  assert.equal(report.stage, "verification-failed");
  assert.equal(report.stageHeadline, "Live verification needs attention");
  assert.equal(
    report.stageDescription,
    "Prisma was reachable, but the live verification still found a persistence-path problem.",
  );
  assert.equal(report.recommendedCommand, "npm run prisma:verify-seller-flow");
  assert.deepEqual(report.runbookCommands, [
    "npm run verify:persistence:ops",
    "npm run prisma:verify-seller-flow",
  ]);
  assert.deepEqual(report.actionItems, [
    {
      label: "Seller profile saved and reloaded",
      status: "done",
      statusDescription: "Already satisfied.",
    },
    {
      label: "Seller product saved and reloaded",
      status: "blocked",
      statusDescription: "Waiting on an earlier prerequisite.",
    },
  ]);
  assert.equal(report.summary, "Prisma seller flow verification failed.");
});

test("cutover stage headline stays stable for founder and admin UI", () => {
  assert.equal(
    getPrismaCutoverStageHeadline("preflight-blocked"),
    "Blocked before live verification",
  );
  assert.equal(
    getPrismaCutoverStageHeadline("ready-for-verification"),
    "Ready for live verification",
  );
  assert.equal(
    getPrismaCutoverStageHeadline("verification-passed"),
    "Live verification passed",
  );
  assert.equal(
    getPrismaCutoverStageHeadline("verification-failed"),
    "Live verification needs attention",
  );
});

test("cutover stage descriptions stay stable for terminal and JSON consumers", () => {
  assert.equal(
    getPrismaCutoverStageDescription("preflight-blocked"),
    "Required database or Prisma setup is still missing before a live verification run can begin.",
  );
  assert.equal(
    getPrismaCutoverStageDescription("ready-for-verification"),
    "The environment is ready, and the next live step is seller-flow verification.",
  );
  assert.equal(
    getPrismaCutoverStageDescription("verification-passed"),
    "The first strict Prisma seller-flow verification completed successfully.",
  );
  assert.equal(
    getPrismaCutoverStageDescription("verification-failed"),
    "Prisma was reachable, but the live verification still found a persistence-path problem.",
  );
});

test("cutover founder summary explains the next database step in plain language", () => {
  const blockedReport = buildPrismaCutoverReport({
    preflightReport: buildPrismaPreflightReport({
      mode: "auto",
      hasRealDatabaseUrl: false,
      databaseReachable: false,
      databaseError: null,
    }),
  });
  const readyReport = buildPrismaCutoverReport({
    preflightReport: buildPrismaPreflightReport({
      mode: "prisma",
      hasRealDatabaseUrl: true,
      databaseReachable: true,
      databaseError: null,
    }),
  });

  assert.equal(
    getPrismaCutoverFounderSummary(blockedReport),
    "Database setup is still blocked. The next founder-visible step is DATABASE_URL=postgresql://username:password@host:5432/lessonforge.",
  );
  assert.equal(
    getPrismaCutoverFounderSummary(readyReport),
    "The database environment is ready for the first strict Prisma seller-flow verification run.",
  );
});

test("cutover detail lines explain either remaining blockers or verification results", () => {
  const blockedReport = buildPrismaCutoverReport({
    preflightReport: buildPrismaPreflightReport({
      mode: "auto",
      hasRealDatabaseUrl: false,
      databaseReachable: false,
      databaseError: null,
    }),
  });
  const verifiedReport = buildPrismaCutoverReport({
    preflightReport: buildPrismaPreflightReport({
      mode: "prisma",
      hasRealDatabaseUrl: true,
      databaseReachable: true,
      databaseError: null,
    }),
    verificationReport: buildPrismaSellerFlowReport({
      sellerEmail: "seller@example.com",
      productId: "product-123",
      sellerProfileSaved: true,
      productSaved: true,
    }),
  });

  assert.deepEqual(getPrismaCutoverDetailLines(blockedReport), [
    "The current DATABASE_URL is missing or still using the placeholder value.",
    "Switch to strict Prisma mode before the live cutover verification run.",
    "The database cannot be checked until a real DATABASE_URL is configured.",
  ]);
  assert.deepEqual(getPrismaCutoverDetailLines(verifiedReport), [
    "Seller profile save and reload succeeded for seller@example.com.",
    "Seller product save and reload succeeded for product-123.",
  ]);
});

test("cutover action items explain what is done, next, or blocked", () => {
  const blockedReport = buildPrismaCutoverReport({
    preflightReport: buildPrismaPreflightReport({
      mode: "auto",
      hasRealDatabaseUrl: false,
      databaseReachable: false,
      databaseError: null,
    }),
  });
  const readyReport = buildPrismaCutoverReport({
    preflightReport: buildPrismaPreflightReport({
      mode: "prisma",
      hasRealDatabaseUrl: true,
      databaseReachable: true,
      databaseError: null,
    }),
  });

  assert.deepEqual(getPrismaCutoverActionItems(blockedReport), [
    {
      label: "Real DATABASE_URL configured",
      status: "blocked",
      statusDescription: "Waiting on an earlier prerequisite.",
    },
    {
      label: "Persistence mode switched to strict Prisma",
      status: "next",
      statusDescription: "Run this now.",
    },
    {
      label: "Database connection reachable",
      status: "blocked",
      statusDescription: "Waiting on an earlier prerequisite.",
    },
    {
      label: "Ready for seller-flow verification",
      status: "blocked",
      statusDescription: "Waiting on an earlier prerequisite.",
    },
  ]);
  assert.deepEqual(getPrismaCutoverActionItems(readyReport), [
    {
      label: "Real DATABASE_URL configured",
      status: "done",
      statusDescription: "Already satisfied.",
    },
    {
      label: "Strict Prisma mode enabled",
      status: "done",
      statusDescription: "Already satisfied.",
    },
    {
      label: "Run seller-flow verification",
      status: "next",
      statusDescription: "Run this now.",
    },
  ]);
});

test("cutover action status descriptions stay stable for terminal and JSON consumers", () => {
  assert.equal(getPrismaCutoverActionStatusDescription("done"), "Already satisfied.");
  assert.equal(getPrismaCutoverActionStatusDescription("next"), "Run this now.");
  assert.equal(
    getPrismaCutoverActionStatusDescription("blocked"),
    "Waiting on an earlier prerequisite.",
  );
});

test("cutover runbook commands stay ordered and deduplicated", () => {
  const blockedReport = buildPrismaCutoverReport({
    preflightReport: buildPrismaPreflightReport({
      mode: "auto",
      hasRealDatabaseUrl: false,
      databaseReachable: false,
      databaseError: null,
    }),
  });

  assert.deepEqual(getPrismaCutoverRunbookCommands(blockedReport), [
    "npm run verify:persistence:ops",
    "DATABASE_URL=postgresql://username:password@host:5432/lessonforge",
    "LESSONFORGE_PERSISTENCE_MODE=prisma",
    "npm run prisma:migrate",
  ]);
});

test("cutover runbook keeps the ops verification step deduplicated", () => {
  const readyReport = buildPrismaCutoverReport({
    preflightReport: buildPrismaPreflightReport({
      mode: "prisma",
      hasRealDatabaseUrl: true,
      databaseReachable: true,
      databaseError: null,
    }),
  });

  assert.deepEqual(getPrismaCutoverRunbookCommands(readyReport), [
    "npm run verify:persistence:ops",
    "npm run prisma:verify-seller-flow",
  ]);
});
