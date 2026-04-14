import assert from "node:assert/strict";
import test from "node:test";

import {
  fetchPersistenceReadiness,
  parsePersistenceReadinessResponse,
  PERSISTENCE_READINESS_API_PATH,
} from "@/lib/lessonforge/persistence-readiness-client";
import type {
  PersistenceReadiness,
  PersistenceReadinessApiResponse,
} from "@/lib/lessonforge/persistence-readiness-contract";
import { buildPrismaCutoverReport, getPrismaCutoverFounderSummary } from "@/lib/lessonforge/prisma-cutover";
import { buildPrismaPreflightReport } from "@/lib/lessonforge/prisma-preflight";
import {
  describePersistenceStatus,
  getExpectedPrismaEnabled,
} from "@/lib/lessonforge/persistence-status-view";

function createResponse(ok: boolean, payload: PersistenceReadinessApiResponse | null) {
  return {
    ok,
    async json() {
      if (payload === null) {
        throw new Error("Invalid JSON");
      }

      return payload;
    },
  };
}

function createValidReadinessPayload(): PersistenceReadiness {
  const mode = "auto" as const;
  const hasRealDatabaseUrl = false;
  const databaseReachable = false;
  const databaseError = null;
  const prismaEnabled = getExpectedPrismaEnabled({ mode, hasRealDatabaseUrl });
  const persistenceStatus = describePersistenceStatus({
    mode,
    hasRealDatabaseUrl,
    prismaEnabled,
  });
  const preflightReport = buildPrismaPreflightReport({
    mode,
    hasRealDatabaseUrl,
    databaseReachable,
    databaseError,
  });
  const cutoverReport = buildPrismaCutoverReport({ preflightReport });

  return {
    persistenceStatus,
    hasRealDatabaseUrl,
    databaseReachable,
    databaseError,
    probes: [],
    preflightReport,
    cutoverReport,
    nextActions: preflightReport.checks,
    founderSummary: getPrismaCutoverFounderSummary(cutoverReport),
  };
}

test("persistence readiness client parser returns successful readiness payloads", async () => {
  const payload = createValidReadinessPayload();

  const result = await parsePersistenceReadinessResponse(createResponse(true, payload));
  assert.deepEqual(result, payload);
});

test("persistence readiness client parser throws route error messages", async () => {
  await assert.rejects(
    () =>
      parsePersistenceReadinessResponse(
        createResponse(false, {
          error: "Admin access required.",
        }),
      ),
    /Admin access required\./,
  );
});

test("persistence readiness client parser rejects malformed success payloads", async () => {
  await assert.rejects(
    () =>
      parsePersistenceReadinessResponse(
        createResponse(true, {} as PersistenceReadinessApiResponse),
      ),
    /Unable to refresh persistence status\./,
  );
});

test("persistence readiness client fetch helper uses the shared route and returns readiness", async () => {
  const payload = createValidReadinessPayload();

  let receivedUrl = "";
  let receivedOptions: { cache?: string } | undefined;

  const result = await fetchPersistenceReadiness(async (url, options) => {
    receivedUrl = String(url);
    receivedOptions = options as { cache?: string } | undefined;
    return createResponse(true, payload) as Response;
  });

  assert.equal(receivedUrl, PERSISTENCE_READINESS_API_PATH);
  assert.equal(receivedOptions?.cache, "no-store");
  assert.deepEqual(result, payload);
});
