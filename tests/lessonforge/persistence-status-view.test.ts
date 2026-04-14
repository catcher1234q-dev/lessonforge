import assert from "node:assert/strict";
import test from "node:test";

import {
  describePersistenceStatus,
  getExpectedPrismaEnabled,
} from "@/lib/lessonforge/persistence-status-view";

test("persistence status descriptor returns strict prisma messaging", () => {
  assert.deepEqual(
    describePersistenceStatus({
      mode: "prisma",
      hasRealDatabaseUrl: true,
      prismaEnabled: true,
    }),
    {
      mode: "prisma",
      prismaEnabled: true,
      label: "Prisma mode",
      detail:
        "The app is expected to use Prisma only. Database errors will not silently fall back to demo JSON storage.",
    },
  );
});

test("persistence status descriptor returns json messaging", () => {
  assert.deepEqual(
    describePersistenceStatus({
      mode: "json",
      hasRealDatabaseUrl: false,
      prismaEnabled: false,
    }),
    {
      mode: "json",
      prismaEnabled: false,
      label: "Demo JSON mode",
      detail:
        "The app is intentionally running on local demo JSON storage instead of Prisma.",
    },
  );
});

test("persistence status descriptor returns auto-prisma messaging", () => {
  assert.deepEqual(
    describePersistenceStatus({
      mode: "auto",
      hasRealDatabaseUrl: true,
      prismaEnabled: true,
    }),
    {
      mode: "auto",
      prismaEnabled: true,
      label: "Auto mode using Prisma",
      detail:
        "Auto mode detected a real database URL, so the app is using the Prisma persistence path.",
    },
  );
});

test("persistence status descriptor returns auto-json messaging", () => {
  assert.deepEqual(
    describePersistenceStatus({
      mode: "auto",
      hasRealDatabaseUrl: false,
      prismaEnabled: false,
    }),
    {
      mode: "auto",
      prismaEnabled: false,
      label: "Auto mode using demo JSON",
      detail:
        "Auto mode did not find a real database URL, so the app is currently using local demo JSON storage.",
    },
  );
});

test("expected prisma-enabled state stays aligned with persistence mode", () => {
  assert.equal(
    getExpectedPrismaEnabled({
      mode: "json",
      hasRealDatabaseUrl: true,
    }),
    false,
  );
  assert.equal(
    getExpectedPrismaEnabled({
      mode: "prisma",
      hasRealDatabaseUrl: false,
    }),
    true,
  );
  assert.equal(
    getExpectedPrismaEnabled({
      mode: "auto",
      hasRealDatabaseUrl: false,
    }),
    false,
  );
  assert.equal(
    getExpectedPrismaEnabled({
      mode: "auto",
      hasRealDatabaseUrl: true,
    }),
    true,
  );
});
