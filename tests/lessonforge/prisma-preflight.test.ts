import assert from "node:assert/strict";
import test from "node:test";

import {
  buildPrismaPreflightChecks,
  buildPrismaPreflightReport,
  formatPrismaPreflightStatus,
  getPrismaPreflightSummary,
  hasRealDatabaseUrl,
} from "@/lib/lessonforge/prisma-preflight";

test("placeholder database url does not count as a real database", () => {
  assert.equal(
    hasRealDatabaseUrl("postgresql://USER:PASSWORD@localhost:5432/lessonforge"),
    false,
  );
  assert.equal(
    hasRealDatabaseUrl("postgresql://postgres:secret@localhost:5432/lessonforge"),
    true,
  );
});

test("preflight checks show the expected blockers before database setup", () => {
  const checks = buildPrismaPreflightChecks({
    mode: "auto",
    hasRealDatabaseUrl: false,
    databaseReachable: false,
  });

  assert.deepEqual(
    checks.map((check) => [check.label, check.status]),
    [
      ["Real DATABASE_URL configured", "blocked"],
      ["Persistence mode switched to strict Prisma", "next"],
      ["Database connection reachable", "blocked"],
      ["Ready for seller-flow verification", "blocked"],
    ],
  );
  assert.equal(
    getPrismaPreflightSummary(checks),
    "The current DATABASE_URL is missing or still using the placeholder value.",
  );
});

test("preflight checks point to seller-flow verification once strict prisma is ready", () => {
  const checks = buildPrismaPreflightChecks({
    mode: "prisma",
    hasRealDatabaseUrl: true,
    databaseReachable: true,
  });

  assert.deepEqual(
    checks.map((check) => [check.label, check.status]),
    [
      ["Real DATABASE_URL configured", "ready"],
      ["Persistence mode switched to strict Prisma", "ready"],
      ["Database connection reachable", "ready"],
      ["Ready for seller-flow verification", "next"],
    ],
  );
  assert.equal(
    getPrismaPreflightSummary(checks),
    "The next cutover step is the real seller profile and product write/read verification.",
  );
});

test("preflight summary surfaces database connectivity failure details", () => {
  const checks = buildPrismaPreflightChecks({
    mode: "prisma",
    hasRealDatabaseUrl: true,
    databaseReachable: false,
    databaseError: "Connection refused",
  });

  assert.equal(
    checks[2]?.detail,
    "Prisma could not reach the database yet. Connection refused",
  );
  assert.equal(getPrismaPreflightSummary(checks), checks[2]?.detail);
});

test("status formatter keeps terminal output stable", () => {
  assert.equal(formatPrismaPreflightStatus("ready"), "READY");
  assert.equal(formatPrismaPreflightStatus("next"), "NEXT");
  assert.equal(formatPrismaPreflightStatus("blocked"), "BLOCKED");
});

test("preflight report returns a stable machine-readable contract", () => {
  const report = buildPrismaPreflightReport({
    mode: "auto",
    hasRealDatabaseUrl: false,
    databaseReachable: false,
    databaseError: null,
  });

  assert.equal(report.mode, "auto");
  assert.equal(report.hasRealDatabaseUrl, false);
  assert.equal(report.databaseReachable, false);
  assert.equal(
    report.summary,
    "The current DATABASE_URL is missing or still using the placeholder value.",
  );
  assert.equal(report.checks.length, 4);
  assert.deepEqual(report.checks[0], {
    label: "Real DATABASE_URL configured",
    status: "blocked",
    detail: "The current DATABASE_URL is missing or still using the placeholder value.",
    command: "DATABASE_URL=postgresql://username:password@host:5432/lessonforge",
  });
});
