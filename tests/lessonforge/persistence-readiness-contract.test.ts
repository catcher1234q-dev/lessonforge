import assert from "node:assert/strict";
import test from "node:test";

import {
  isPersistenceReadiness,
  isPersistenceReadinessError,
  type PersistenceReadiness,
  type PersistenceReadinessApiResponse,
} from "@/lib/lessonforge/persistence-readiness-contract";
import { buildPrismaCutoverReport, getPrismaCutoverFounderSummary } from "@/lib/lessonforge/prisma-cutover";
import { buildPrismaPreflightReport } from "@/lib/lessonforge/prisma-preflight";
import {
  describePersistenceStatus,
  getExpectedPrismaEnabled,
} from "@/lib/lessonforge/persistence-status-view";

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

test("persistence readiness error guard recognizes api error payloads", () => {
  const payload: PersistenceReadinessApiResponse = {
    error: "Admin access required.",
  };

  assert.equal(isPersistenceReadinessError(payload), true);
});

test("persistence readiness error guard ignores successful readiness payloads", () => {
  const payload = createValidReadinessPayload();

  assert.equal(isPersistenceReadinessError(payload), false);
  assert.equal(isPersistenceReadiness(payload), true);
});

test("persistence readiness guard rejects malformed success-shaped payloads", () => {
  assert.equal(
    isPersistenceReadiness({
      persistenceStatus: {
        mode: "auto",
        prismaEnabled: false,
      },
    }),
    false,
  );
});

test("persistence readiness guard rejects cutover payloads missing runbook commands", () => {
  assert.equal(
    isPersistenceReadiness({
      persistenceStatus: {
        mode: "auto",
        prismaEnabled: false,
        label: "Auto mode using demo JSON",
        detail:
        "Auto mode did not find a real database URL, so the app is currently using local demo JSON storage.",
      },
      hasRealDatabaseUrl: false,
      databaseReachable: false,
      databaseError: null,
      probes: [],
      preflightReport: {
        mode: "auto",
        hasRealDatabaseUrl: false,
        databaseReachable: false,
        databaseError: null,
        summary: "The current DATABASE_URL is missing or still using the placeholder value.",
        checks: [],
      },
      cutoverReport: {
        ok: false,
        stage: "preflight-blocked",
        stageHeadline: "Blocked before live verification",
        stageDescription:
          "Required database or Prisma setup is still missing before a live verification run can begin.",
        summary: "The current DATABASE_URL is missing or still using the placeholder value.",
        detailLines: [],
        recommendedCommand:
          "DATABASE_URL=postgresql://username:password@host:5432/lessonforge",
        actionItems: [],
        preflightReport: {
          mode: "auto",
          hasRealDatabaseUrl: false,
          databaseReachable: false,
          databaseError: null,
          summary: "The current DATABASE_URL is missing or still using the placeholder value.",
          checks: [],
        },
        verificationReport: null,
      },
      nextActions: [],
      founderSummary:
        "Database setup is still blocked. The next founder-visible step is DATABASE_URL=postgresql://username:password@host:5432/lessonforge.",
    }),
    false,
  );
});

test("persistence readiness guard rejects cutover payloads with non-string runbook commands", () => {
  assert.equal(
    isPersistenceReadiness({
      persistenceStatus: {
        mode: "auto",
        prismaEnabled: false,
        label: "Auto mode using demo JSON",
        detail:
        "Auto mode did not find a real database URL, so the app is currently using local demo JSON storage.",
      },
      hasRealDatabaseUrl: false,
      databaseReachable: false,
      databaseError: null,
      probes: [],
      preflightReport: {
        mode: "auto",
        hasRealDatabaseUrl: false,
        databaseReachable: false,
        databaseError: null,
        summary: "The current DATABASE_URL is missing or still using the placeholder value.",
        checks: [],
      },
      cutoverReport: {
        ok: false,
        stage: "preflight-blocked",
        stageHeadline: "Blocked before live verification",
        stageDescription:
          "Required database or Prisma setup is still missing before a live verification run can begin.",
        summary: "The current DATABASE_URL is missing or still using the placeholder value.",
        detailLines: [],
        runbookCommands: ["npm run verify:persistence:ops", 123],
        recommendedCommand:
          "DATABASE_URL=postgresql://username:password@host:5432/lessonforge",
        actionItems: [],
        preflightReport: {
          mode: "auto",
          hasRealDatabaseUrl: false,
          databaseReachable: false,
          databaseError: null,
          summary: "The current DATABASE_URL is missing or still using the placeholder value.",
          checks: [],
        },
        verificationReport: null,
      },
      nextActions: [],
      founderSummary:
        "Database setup is still blocked. The next founder-visible step is DATABASE_URL=postgresql://username:password@host:5432/lessonforge.",
    }),
    false,
  );
});

test("persistence readiness guard rejects cutover payloads with malformed action items", () => {
  assert.equal(
    isPersistenceReadiness({
      persistenceStatus: {
        mode: "auto",
        prismaEnabled: false,
        label: "Auto mode using demo JSON",
        detail:
        "Auto mode did not find a real database URL, so the app is currently using local demo JSON storage.",
      },
      hasRealDatabaseUrl: false,
      databaseReachable: false,
      databaseError: null,
      probes: [],
      preflightReport: {
        mode: "auto",
        hasRealDatabaseUrl: false,
        databaseReachable: false,
        databaseError: null,
        summary: "The current DATABASE_URL is missing or still using the placeholder value.",
        checks: [],
      },
      cutoverReport: {
        ok: false,
        stage: "preflight-blocked",
        stageHeadline: "Blocked before live verification",
        stageDescription:
          "Required database or Prisma setup is still missing before a live verification run can begin.",
        summary: "The current DATABASE_URL is missing or still using the placeholder value.",
        detailLines: [],
        runbookCommands: ["npm run verify:persistence:ops"],
        recommendedCommand:
          "DATABASE_URL=postgresql://username:password@host:5432/lessonforge",
        actionItems: [{ label: "Real DATABASE_URL configured", status: "blocked" }],
        preflightReport: {
          mode: "auto",
          hasRealDatabaseUrl: false,
          databaseReachable: false,
          databaseError: null,
          summary: "The current DATABASE_URL is missing or still using the placeholder value.",
          checks: [],
        },
        verificationReport: null,
      },
      nextActions: [],
      founderSummary:
        "Database setup is still blocked. The next founder-visible step is DATABASE_URL=postgresql://username:password@host:5432/lessonforge.",
    }),
    false,
  );
});

test("persistence readiness guard rejects malformed probe entries", () => {
  assert.equal(
    isPersistenceReadiness({
      persistenceStatus: {
        mode: "auto",
        prismaEnabled: false,
        label: "Auto mode using demo JSON",
        detail:
        "Auto mode did not find a real database URL, so the app is currently using local demo JSON storage.",
      },
      hasRealDatabaseUrl: false,
      databaseReachable: false,
      databaseError: null,
      probes: [{ label: "Database reachable", status: "almost", detail: "Nope." }],
      preflightReport: {
        mode: "auto",
        hasRealDatabaseUrl: false,
        databaseReachable: false,
        databaseError: null,
        summary: "The current DATABASE_URL is missing or still using the placeholder value.",
        checks: [],
      },
      cutoverReport: {
        ok: false,
        stage: "preflight-blocked",
        stageHeadline: "Blocked before live verification",
        stageDescription:
          "Required database or Prisma setup is still missing before a live verification run can begin.",
        summary: "The current DATABASE_URL is missing or still using the placeholder value.",
        detailLines: [],
        runbookCommands: ["npm run verify:persistence:ops"],
        recommendedCommand:
          "DATABASE_URL=postgresql://username:password@host:5432/lessonforge",
        actionItems: [],
        preflightReport: {
          mode: "auto",
          hasRealDatabaseUrl: false,
          databaseReachable: false,
          databaseError: null,
          summary: "The current DATABASE_URL is missing or still using the placeholder value.",
          checks: [],
        },
        verificationReport: null,
      },
      nextActions: [],
      founderSummary:
        "Database setup is still blocked. The next founder-visible step is DATABASE_URL=postgresql://username:password@host:5432/lessonforge.",
    }),
    false,
  );
});

test("persistence readiness guard rejects malformed preflight checks", () => {
  assert.equal(
    isPersistenceReadiness({
      persistenceStatus: {
        mode: "auto",
        prismaEnabled: false,
        label: "Auto mode using demo JSON",
        detail:
        "Auto mode did not find a real database URL, so the app is currently using local demo JSON storage.",
      },
      hasRealDatabaseUrl: false,
      databaseReachable: false,
      databaseError: null,
      probes: [],
      preflightReport: {
        mode: "auto",
        hasRealDatabaseUrl: false,
        databaseReachable: false,
        databaseError: null,
        summary: "The current DATABASE_URL is missing or still using the placeholder value.",
        checks: [{ label: "Real DATABASE_URL configured", status: "later", detail: "Nope." }],
      },
      cutoverReport: {
        ok: false,
        stage: "preflight-blocked",
        stageHeadline: "Blocked before live verification",
        stageDescription:
          "Required database or Prisma setup is still missing before a live verification run can begin.",
        summary: "The current DATABASE_URL is missing or still using the placeholder value.",
        detailLines: [],
        runbookCommands: ["npm run verify:persistence:ops"],
        recommendedCommand:
          "DATABASE_URL=postgresql://username:password@host:5432/lessonforge",
        actionItems: [],
        preflightReport: {
          mode: "auto",
          hasRealDatabaseUrl: false,
          databaseReachable: false,
          databaseError: null,
          summary: "The current DATABASE_URL is missing or still using the placeholder value.",
          checks: [],
        },
        verificationReport: null,
      },
      nextActions: [],
      founderSummary:
        "Database setup is still blocked. The next founder-visible step is DATABASE_URL=postgresql://username:password@host:5432/lessonforge.",
    }),
    false,
  );
});

test("persistence readiness guard rejects malformed next actions", () => {
  assert.equal(
    isPersistenceReadiness({
      persistenceStatus: {
        mode: "auto",
        prismaEnabled: false,
        label: "Auto mode using demo JSON",
        detail:
        "Auto mode did not find a real database URL, so the app is currently using local demo JSON storage.",
      },
      hasRealDatabaseUrl: false,
      databaseReachable: false,
      databaseError: null,
      probes: [],
      preflightReport: {
        mode: "auto",
        hasRealDatabaseUrl: false,
        databaseReachable: false,
        databaseError: null,
        summary: "The current DATABASE_URL is missing or still using the placeholder value.",
        checks: [],
      },
      cutoverReport: {
        ok: false,
        stage: "preflight-blocked",
        stageHeadline: "Blocked before live verification",
        stageDescription:
          "Required database or Prisma setup is still missing before a live verification run can begin.",
        summary: "The current DATABASE_URL is missing or still using the placeholder value.",
        detailLines: [],
        runbookCommands: ["npm run verify:persistence:ops"],
        recommendedCommand:
          "DATABASE_URL=postgresql://username:password@host:5432/lessonforge",
        actionItems: [],
        preflightReport: {
          mode: "auto",
          hasRealDatabaseUrl: false,
          databaseReachable: false,
          databaseError: null,
          summary: "The current DATABASE_URL is missing or still using the placeholder value.",
          checks: [],
        },
        verificationReport: null,
      },
      nextActions: [{ label: "Switch mode", status: "soon", detail: "Nope." }],
      founderSummary:
        "Database setup is still blocked. The next founder-visible step is DATABASE_URL=postgresql://username:password@host:5432/lessonforge.",
    }),
    false,
  );
});

test("persistence readiness guard rejects invalid persistence modes", () => {
  assert.equal(
    isPersistenceReadiness({
      persistenceStatus: {
        mode: "maybe",
        prismaEnabled: false,
        label: "Auto mode using demo JSON",
        detail:
        "Auto mode did not find a real database URL, so the app is currently using local demo JSON storage.",
      },
      hasRealDatabaseUrl: false,
      databaseReachable: false,
      databaseError: null,
      probes: [],
      preflightReport: {
        mode: "auto",
        hasRealDatabaseUrl: false,
        databaseReachable: false,
        databaseError: null,
        summary: "The current DATABASE_URL is missing or still using the placeholder value.",
        checks: [],
      },
      cutoverReport: {
        ok: false,
        stage: "preflight-blocked",
        stageHeadline: "Blocked before live verification",
        stageDescription:
          "Required database or Prisma setup is still missing before a live verification run can begin.",
        summary: "The current DATABASE_URL is missing or still using the placeholder value.",
        detailLines: [],
        runbookCommands: ["npm run verify:persistence:ops"],
        recommendedCommand:
          "DATABASE_URL=postgresql://username:password@host:5432/lessonforge",
        actionItems: [],
        preflightReport: {
          mode: "auto",
          hasRealDatabaseUrl: false,
          databaseReachable: false,
          databaseError: null,
          summary: "The current DATABASE_URL is missing or still using the placeholder value.",
          checks: [],
        },
        verificationReport: null,
      },
      nextActions: [],
      founderSummary:
        "Database setup is still blocked. The next founder-visible step is DATABASE_URL=postgresql://username:password@host:5432/lessonforge.",
    }),
    false,
  );
});

test("persistence readiness guard rejects invalid preflight modes", () => {
  assert.equal(
    isPersistenceReadiness({
      persistenceStatus: {
        mode: "auto",
        prismaEnabled: false,
        label: "Auto mode using demo JSON",
        detail:
        "Auto mode did not find a real database URL, so the app is currently using local demo JSON storage.",
      },
      hasRealDatabaseUrl: false,
      databaseReachable: false,
      databaseError: null,
      probes: [],
      preflightReport: {
        mode: "later",
        hasRealDatabaseUrl: false,
        databaseReachable: false,
        databaseError: null,
        summary: "The current DATABASE_URL is missing or still using the placeholder value.",
        checks: [],
      },
      cutoverReport: {
        ok: false,
        stage: "preflight-blocked",
        stageHeadline: "Blocked before live verification",
        stageDescription:
          "Required database or Prisma setup is still missing before a live verification run can begin.",
        summary: "The current DATABASE_URL is missing or still using the placeholder value.",
        detailLines: [],
        runbookCommands: ["npm run verify:persistence:ops"],
        recommendedCommand:
          "DATABASE_URL=postgresql://username:password@host:5432/lessonforge",
        actionItems: [],
        preflightReport: {
          mode: "auto",
          hasRealDatabaseUrl: false,
          databaseReachable: false,
          databaseError: null,
          summary: "The current DATABASE_URL is missing or still using the placeholder value.",
          checks: [],
        },
        verificationReport: null,
      },
      nextActions: [],
      founderSummary:
        "Database setup is still blocked. The next founder-visible step is DATABASE_URL=postgresql://username:password@host:5432/lessonforge.",
    }),
    false,
  );
});

test("persistence readiness guard rejects invalid cutover stages", () => {
  assert.equal(
    isPersistenceReadiness({
      persistenceStatus: {
        mode: "auto",
        prismaEnabled: false,
        label: "Auto mode using demo JSON",
        detail:
        "Auto mode did not find a real database URL, so the app is currently using local demo JSON storage.",
      },
      hasRealDatabaseUrl: false,
      databaseReachable: false,
      databaseError: null,
      probes: [],
      preflightReport: {
        mode: "auto",
        hasRealDatabaseUrl: false,
        databaseReachable: false,
        databaseError: null,
        summary: "The current DATABASE_URL is missing or still using the placeholder value.",
        checks: [],
      },
      cutoverReport: {
        ok: false,
        stage: "almost-ready",
        stageHeadline: "Blocked before live verification",
        stageDescription:
          "Required database or Prisma setup is still missing before a live verification run can begin.",
        summary: "The current DATABASE_URL is missing or still using the placeholder value.",
        detailLines: [],
        runbookCommands: ["npm run verify:persistence:ops"],
        recommendedCommand:
          "DATABASE_URL=postgresql://username:password@host:5432/lessonforge",
        actionItems: [],
        preflightReport: {
          mode: "auto",
          hasRealDatabaseUrl: false,
          databaseReachable: false,
          databaseError: null,
          summary: "The current DATABASE_URL is missing or still using the placeholder value.",
          checks: [],
        },
        verificationReport: null,
      },
      nextActions: [],
      founderSummary:
        "Database setup is still blocked. The next founder-visible step is DATABASE_URL=postgresql://username:password@host:5432/lessonforge.",
    }),
    false,
  );
});

test("persistence readiness guard rejects mismatched cutover headlines", () => {
  assert.equal(
    isPersistenceReadiness({
      persistenceStatus: {
        mode: "auto",
        prismaEnabled: false,
        label: "Auto mode using demo JSON",
        detail:
        "Auto mode did not find a real database URL, so the app is currently using local demo JSON storage.",
      },
      hasRealDatabaseUrl: false,
      databaseReachable: false,
      databaseError: null,
      probes: [],
      preflightReport: {
        mode: "auto",
        hasRealDatabaseUrl: false,
        databaseReachable: false,
        databaseError: null,
        summary: "The current DATABASE_URL is missing or still using the placeholder value.",
        checks: [],
      },
      cutoverReport: {
        ok: false,
        stage: "preflight-blocked",
        stageHeadline: "Ready for live verification",
        stageDescription:
          "Required database or Prisma setup is still missing before a live verification run can begin.",
        summary: "The current DATABASE_URL is missing or still using the placeholder value.",
        detailLines: [],
        runbookCommands: ["npm run verify:persistence:ops"],
        recommendedCommand:
          "DATABASE_URL=postgresql://username:password@host:5432/lessonforge",
        actionItems: [],
        preflightReport: {
          mode: "auto",
          hasRealDatabaseUrl: false,
          databaseReachable: false,
          databaseError: null,
          summary: "The current DATABASE_URL is missing or still using the placeholder value.",
          checks: [],
        },
        verificationReport: null,
      },
      nextActions: [],
      founderSummary:
        "Database setup is still blocked. The next founder-visible step is DATABASE_URL=postgresql://username:password@host:5432/lessonforge.",
    }),
    false,
  );
});

test("persistence readiness guard rejects mismatched cutover stage descriptions", () => {
  assert.equal(
    isPersistenceReadiness({
      persistenceStatus: {
        mode: "auto",
        prismaEnabled: false,
        label: "Auto mode using demo JSON",
        detail:
        "Auto mode did not find a real database URL, so the app is currently using local demo JSON storage.",
      },
      hasRealDatabaseUrl: false,
      databaseReachable: false,
      databaseError: null,
      probes: [],
      preflightReport: {
        mode: "auto",
        hasRealDatabaseUrl: false,
        databaseReachable: false,
        databaseError: null,
        summary: "The current DATABASE_URL is missing or still using the placeholder value.",
        checks: [],
      },
      cutoverReport: {
        ok: false,
        stage: "preflight-blocked",
        stageHeadline: "Blocked before live verification",
        stageDescription:
          "The environment is ready, and the next live step is seller-flow verification.",
        summary: "The current DATABASE_URL is missing or still using the placeholder value.",
        detailLines: [],
        runbookCommands: ["npm run verify:persistence:ops"],
        recommendedCommand:
          "DATABASE_URL=postgresql://username:password@host:5432/lessonforge",
        actionItems: [],
        preflightReport: {
          mode: "auto",
          hasRealDatabaseUrl: false,
          databaseReachable: false,
          databaseError: null,
          summary: "The current DATABASE_URL is missing or still using the placeholder value.",
          checks: [],
        },
        verificationReport: null,
      },
      nextActions: [],
      founderSummary:
        "Database setup is still blocked. The next founder-visible step is DATABASE_URL=postgresql://username:password@host:5432/lessonforge.",
    }),
    false,
  );
});

test("persistence readiness guard rejects mismatched persistence status labels", () => {
  assert.equal(
    isPersistenceReadiness({
      persistenceStatus: {
        mode: "auto",
        prismaEnabled: false,
        label: "Prisma mode",
        detail:
        "Auto mode did not find a real database URL, so the app is currently using local demo JSON storage.",
      },
      hasRealDatabaseUrl: false,
      databaseReachable: false,
      databaseError: null,
      probes: [],
      preflightReport: {
        mode: "auto",
        hasRealDatabaseUrl: false,
        databaseReachable: false,
        databaseError: null,
        summary: "The current DATABASE_URL is missing or still using the placeholder value.",
        checks: [],
      },
      cutoverReport: {
        ok: false,
        stage: "preflight-blocked",
        stageHeadline: "Blocked before live verification",
        stageDescription:
          "Required database or Prisma setup is still missing before a live verification run can begin.",
        summary: "The current DATABASE_URL is missing or still using the placeholder value.",
        detailLines: [],
        runbookCommands: ["npm run verify:persistence:ops"],
        recommendedCommand:
          "DATABASE_URL=postgresql://username:password@host:5432/lessonforge",
        actionItems: [],
        preflightReport: {
          mode: "auto",
          hasRealDatabaseUrl: false,
          databaseReachable: false,
          databaseError: null,
          summary: "The current DATABASE_URL is missing or still using the placeholder value.",
          checks: [],
        },
        verificationReport: null,
      },
      nextActions: [],
      founderSummary:
        "Database setup is still blocked. The next founder-visible step is DATABASE_URL=postgresql://username:password@host:5432/lessonforge.",
    }),
    false,
  );
});

test("persistence readiness guard rejects mismatched persistence status details", () => {
  assert.equal(
    isPersistenceReadiness({
      persistenceStatus: {
        mode: "auto",
        prismaEnabled: false,
        label: "Auto mode using demo JSON",
        detail: "The app is intentionally running on local demo JSON storage instead of Prisma.",
      },
      hasRealDatabaseUrl: false,
      databaseReachable: false,
      databaseError: null,
      probes: [],
      preflightReport: {
        mode: "auto",
        hasRealDatabaseUrl: false,
        databaseReachable: false,
        databaseError: null,
        summary: "The current DATABASE_URL is missing or still using the placeholder value.",
        checks: [],
      },
      cutoverReport: {
        ok: false,
        stage: "preflight-blocked",
        stageHeadline: "Blocked before live verification",
        stageDescription:
          "Required database or Prisma setup is still missing before a live verification run can begin.",
        summary: "The current DATABASE_URL is missing or still using the placeholder value.",
        detailLines: [],
        runbookCommands: ["npm run verify:persistence:ops"],
        recommendedCommand:
          "DATABASE_URL=postgresql://username:password@host:5432/lessonforge",
        actionItems: [],
        preflightReport: {
          mode: "auto",
          hasRealDatabaseUrl: false,
          databaseReachable: false,
          databaseError: null,
          summary: "The current DATABASE_URL is missing or still using the placeholder value.",
          checks: [],
        },
        verificationReport: null,
      },
      nextActions: [],
      founderSummary:
        "Database setup is still blocked. The next founder-visible step is DATABASE_URL=postgresql://username:password@host:5432/lessonforge.",
    }),
    false,
  );
});

test("persistence readiness guard rejects mismatched founder summaries", () => {
  assert.equal(
    isPersistenceReadiness({
      persistenceStatus: {
        mode: "auto",
        prismaEnabled: false,
        label: "Auto mode using demo JSON",
        detail:
          "Auto mode did not find a real database URL, so the app is currently using local demo JSON storage.",
      },
      hasRealDatabaseUrl: false,
      databaseReachable: false,
      databaseError: null,
      probes: [],
      preflightReport: {
        mode: "auto",
        hasRealDatabaseUrl: false,
        databaseReachable: false,
        databaseError: null,
        summary: "The current DATABASE_URL is missing or still using the placeholder value.",
        checks: [],
      },
      cutoverReport: {
        ok: false,
        stage: "preflight-blocked",
        stageHeadline: "Blocked before live verification",
        stageDescription:
          "Required database or Prisma setup is still missing before a live verification run can begin.",
        summary: "The current DATABASE_URL is missing or still using the placeholder value.",
        detailLines: [],
        runbookCommands: ["npm run verify:persistence:ops"],
        recommendedCommand:
          "DATABASE_URL=postgresql://username:password@host:5432/lessonforge",
        actionItems: [],
        preflightReport: {
          mode: "auto",
          hasRealDatabaseUrl: false,
          databaseReachable: false,
          databaseError: null,
          summary: "The current DATABASE_URL is missing or still using the placeholder value.",
          checks: [],
        },
        verificationReport: null,
      },
      nextActions: [],
      founderSummary:
        "The database environment is ready for the first strict Prisma seller-flow verification run.",
    }),
    false,
  );
});

test("persistence readiness guard rejects mismatched prisma-enabled state", () => {
  assert.equal(
    isPersistenceReadiness({
      persistenceStatus: {
        mode: "auto",
        prismaEnabled: true,
        label: "Auto mode using demo JSON",
        detail:
          "Auto mode did not find a real database URL, so the app is currently using local demo JSON storage.",
      },
      hasRealDatabaseUrl: false,
      databaseReachable: false,
      databaseError: null,
      probes: [],
      preflightReport: {
        mode: "auto",
        hasRealDatabaseUrl: false,
        databaseReachable: false,
        databaseError: null,
        summary: "The current DATABASE_URL is missing or still using the placeholder value.",
        checks: [],
      },
      cutoverReport: {
        ok: false,
        stage: "preflight-blocked",
        stageHeadline: "Blocked before live verification",
        stageDescription:
          "Required database or Prisma setup is still missing before a live verification run can begin.",
        summary: "The current DATABASE_URL is missing or still using the placeholder value.",
        detailLines: [],
        runbookCommands: ["npm run verify:persistence:ops"],
        recommendedCommand:
          "DATABASE_URL=postgresql://username:password@host:5432/lessonforge",
        actionItems: [],
        preflightReport: {
          mode: "auto",
          hasRealDatabaseUrl: false,
          databaseReachable: false,
          databaseError: null,
          summary: "The current DATABASE_URL is missing or still using the placeholder value.",
          checks: [],
        },
        verificationReport: null,
      },
      nextActions: [],
      founderSummary:
        "Database setup is still blocked. The next founder-visible step is DATABASE_URL=postgresql://username:password@host:5432/lessonforge.",
    }),
    false,
  );
});

test("persistence readiness guard rejects reachable databases with connection errors", () => {
  assert.equal(
    isPersistenceReadiness({
      persistenceStatus: {
        mode: "prisma",
        prismaEnabled: true,
        label: "Prisma mode",
        detail:
          "The app is expected to use Prisma only. Database errors will not silently fall back to demo JSON storage.",
      },
      hasRealDatabaseUrl: true,
      databaseReachable: true,
      databaseError: "Connection refused",
      probes: [],
      preflightReport: {
        mode: "prisma",
        hasRealDatabaseUrl: true,
        databaseReachable: true,
        databaseError: "Connection refused",
        summary: "The first strict Prisma cutover checks are positioned to run.",
        checks: [],
      },
      cutoverReport: {
        ok: false,
        stage: "ready-for-verification",
        stageHeadline: "Ready for live verification",
        stageDescription:
          "The environment is ready, and the next live step is seller-flow verification.",
        summary: "The next cutover step is the real seller profile and product write/read verification.",
        detailLines: [],
        runbookCommands: ["npm run verify:persistence:ops"],
        recommendedCommand: "npm run prisma:verify-seller-flow",
        actionItems: [],
        preflightReport: {
          mode: "prisma",
          hasRealDatabaseUrl: true,
          databaseReachable: true,
          databaseError: "Connection refused",
          summary: "The first strict Prisma cutover checks are positioned to run.",
          checks: [],
        },
        verificationReport: null,
      },
      nextActions: [],
      founderSummary:
        "The database environment is ready for the first strict Prisma seller-flow verification run.",
    }),
    false,
  );
});

test("persistence readiness guard rejects reachable databases without a real database url", () => {
  assert.equal(
    isPersistenceReadiness({
      persistenceStatus: {
        mode: "auto",
        prismaEnabled: false,
        label: "Auto mode using demo JSON",
        detail:
          "Auto mode did not find a real database URL, so the app is currently using local demo JSON storage.",
      },
      hasRealDatabaseUrl: false,
      databaseReachable: true,
      databaseError: null,
      probes: [],
      preflightReport: {
        mode: "auto",
        hasRealDatabaseUrl: false,
        databaseReachable: true,
        databaseError: null,
        summary: "The first strict Prisma cutover checks are positioned to run.",
        checks: [],
      },
      cutoverReport: {
        ok: false,
        stage: "preflight-blocked",
        stageHeadline: "Blocked before live verification",
        stageDescription:
          "Required database or Prisma setup is still missing before a live verification run can begin.",
        summary: "The current DATABASE_URL is missing or still using the placeholder value.",
        detailLines: [],
        runbookCommands: ["npm run verify:persistence:ops"],
        recommendedCommand:
          "DATABASE_URL=postgresql://username:password@host:5432/lessonforge",
        actionItems: [],
        preflightReport: {
          mode: "auto",
          hasRealDatabaseUrl: false,
          databaseReachable: true,
          databaseError: null,
          summary: "The first strict Prisma cutover checks are positioned to run.",
          checks: [],
        },
        verificationReport: null,
      },
      nextActions: [],
      founderSummary:
        "Database setup is still blocked. The next founder-visible step is DATABASE_URL=postgresql://username:password@host:5432/lessonforge.",
    }),
    false,
  );
});

test("persistence readiness guard rejects preflight snapshots that drift from top-level database state", () => {
  assert.equal(
    isPersistenceReadiness({
      persistenceStatus: {
        mode: "auto",
        prismaEnabled: false,
        label: "Auto mode using demo JSON",
        detail:
          "Auto mode did not find a real database URL, so the app is currently using local demo JSON storage.",
      },
      hasRealDatabaseUrl: false,
      databaseReachable: false,
      databaseError: null,
      probes: [],
      preflightReport: {
        mode: "prisma",
        hasRealDatabaseUrl: true,
        databaseReachable: false,
        databaseError: null,
        summary: "The current DATABASE_URL is missing or still using the placeholder value.",
        checks: [],
      },
      cutoverReport: {
        ok: false,
        stage: "preflight-blocked",
        stageHeadline: "Blocked before live verification",
        stageDescription:
          "Required database or Prisma setup is still missing before a live verification run can begin.",
        summary: "The current DATABASE_URL is missing or still using the placeholder value.",
        detailLines: [],
        runbookCommands: ["npm run verify:persistence:ops"],
        recommendedCommand:
          "DATABASE_URL=postgresql://username:password@host:5432/lessonforge",
        actionItems: [],
        preflightReport: {
          mode: "prisma",
          hasRealDatabaseUrl: true,
          databaseReachable: false,
          databaseError: null,
          summary: "The current DATABASE_URL is missing or still using the placeholder value.",
          checks: [],
        },
        verificationReport: null,
      },
      nextActions: [],
      founderSummary:
        "Database setup is still blocked. The next founder-visible step is DATABASE_URL=postgresql://username:password@host:5432/lessonforge.",
    }),
    false,
  );
});

test("persistence readiness guard rejects next actions that drift from preflight checks", () => {
  assert.equal(
    isPersistenceReadiness({
      persistenceStatus: {
        mode: "auto",
        prismaEnabled: false,
        label: "Auto mode using demo JSON",
        detail:
          "Auto mode did not find a real database URL, so the app is currently using local demo JSON storage.",
      },
      hasRealDatabaseUrl: false,
      databaseReachable: false,
      databaseError: null,
      probes: [],
      preflightReport: {
        mode: "auto",
        hasRealDatabaseUrl: false,
        databaseReachable: false,
        databaseError: null,
        summary: "The current DATABASE_URL is missing or still using the placeholder value.",
        checks: [
          {
            label: "Real DATABASE_URL configured",
            status: "blocked",
            detail: "The current DATABASE_URL is missing or still using the placeholder value.",
            command: "DATABASE_URL=postgresql://username:password@host:5432/lessonforge",
          },
        ],
      },
      cutoverReport: {
        ok: false,
        stage: "preflight-blocked",
        stageHeadline: "Blocked before live verification",
        stageDescription:
          "Required database or Prisma setup is still missing before a live verification run can begin.",
        summary: "The current DATABASE_URL is missing or still using the placeholder value.",
        detailLines: [],
        runbookCommands: ["npm run verify:persistence:ops"],
        recommendedCommand:
          "DATABASE_URL=postgresql://username:password@host:5432/lessonforge",
        actionItems: [],
        preflightReport: {
          mode: "auto",
          hasRealDatabaseUrl: false,
          databaseReachable: false,
          databaseError: null,
          summary: "The current DATABASE_URL is missing or still using the placeholder value.",
          checks: [
            {
              label: "Real DATABASE_URL configured",
              status: "blocked",
              detail:
                "The current DATABASE_URL is missing or still using the placeholder value.",
              command: "DATABASE_URL=postgresql://username:password@host:5432/lessonforge",
            },
          ],
        },
        verificationReport: null,
      },
      nextActions: [
        {
          label: "Persistence mode switched to strict Prisma",
          status: "next",
          detail: "Switch to strict Prisma mode before the live cutover verification run.",
          command: "LESSONFORGE_PERSISTENCE_MODE=prisma",
        },
      ],
      founderSummary:
        "Database setup is still blocked. The next founder-visible step is DATABASE_URL=postgresql://username:password@host:5432/lessonforge.",
    }),
    false,
  );
});

test("persistence readiness guard rejects cutover preflight snapshots that drift from top-level preflight", () => {
  assert.equal(
    isPersistenceReadiness({
      persistenceStatus: {
        mode: "auto",
        prismaEnabled: false,
        label: "Auto mode using demo JSON",
        detail:
          "Auto mode did not find a real database URL, so the app is currently using local demo JSON storage.",
      },
      hasRealDatabaseUrl: false,
      databaseReachable: false,
      databaseError: null,
      probes: [],
      preflightReport: {
        mode: "auto",
        hasRealDatabaseUrl: false,
        databaseReachable: false,
        databaseError: null,
        summary: "The current DATABASE_URL is missing or still using the placeholder value.",
        checks: [
          {
            label: "Real DATABASE_URL configured",
            status: "blocked",
            detail: "The current DATABASE_URL is missing or still using the placeholder value.",
            command: "DATABASE_URL=postgresql://username:password@host:5432/lessonforge",
          },
        ],
      },
      cutoverReport: {
        ok: false,
        stage: "preflight-blocked",
        stageHeadline: "Blocked before live verification",
        stageDescription:
          "Required database or Prisma setup is still missing before a live verification run can begin.",
        summary: "The current DATABASE_URL is missing or still using the placeholder value.",
        detailLines: [],
        runbookCommands: ["npm run verify:persistence:ops"],
        recommendedCommand:
          "DATABASE_URL=postgresql://username:password@host:5432/lessonforge",
        actionItems: [],
        preflightReport: {
          mode: "auto",
          hasRealDatabaseUrl: false,
          databaseReachable: false,
          databaseError: null,
          summary: "The current DATABASE_URL is missing or still using the placeholder value.",
          checks: [
            {
              label: "Persistence mode switched to strict Prisma",
              status: "next",
              detail:
                "Switch to strict Prisma mode before the live cutover verification run.",
              command: "LESSONFORGE_PERSISTENCE_MODE=prisma",
            },
          ],
        },
        verificationReport: null,
      },
      nextActions: [
        {
          label: "Real DATABASE_URL configured",
          status: "blocked",
          detail: "The current DATABASE_URL is missing or still using the placeholder value.",
          command: "DATABASE_URL=postgresql://username:password@host:5432/lessonforge",
        },
      ],
      founderSummary:
        "Database setup is still blocked. The next founder-visible step is DATABASE_URL=postgresql://username:password@host:5432/lessonforge.",
    }),
    false,
  );
});
