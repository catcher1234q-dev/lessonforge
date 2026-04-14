import assert from "node:assert/strict";
import test from "node:test";

import {
  checkAdminMutationRateLimit,
  resetAdminMutationRateLimitForTests,
} from "@/lib/lessonforge/admin-rate-limit";

test("admin mutation limiter allows requests until the admin threshold is reached", () => {
  resetAdminMutationRateLimitForTests();

  for (let index = 0; index < 12; index += 1) {
    const result = checkAdminMutationRateLimit({
      actorEmail: "admin@lessonforge.demo",
      actorRole: "admin",
      actionKey: "report-triage",
      now: 1_000 + index,
    });

    assert.equal(result.allowed, true);
  }
});

test("admin mutation limiter blocks the next request inside the active window", () => {
  resetAdminMutationRateLimitForTests();

  for (let index = 0; index < 12; index += 1) {
    checkAdminMutationRateLimit({
      actorEmail: "admin@lessonforge.demo",
      actorRole: "admin",
      actionKey: "report-triage",
      now: 10_000 + index,
    });
  }

  const blocked = checkAdminMutationRateLimit({
    actorEmail: "admin@lessonforge.demo",
    actorRole: "admin",
    actionKey: "report-triage",
    now: 10_500,
  });

  assert.equal(blocked.allowed, false);
  assert.ok(blocked.retryAfterSeconds > 0);
});

test("owner mutation limiter has a higher threshold than admin", () => {
  resetAdminMutationRateLimitForTests();

  for (let index = 0; index < 20; index += 1) {
    const result = checkAdminMutationRateLimit({
      actorEmail: "owner@lessonforge.demo",
      actorRole: "owner",
      actionKey: "system-settings",
      now: 20_000 + index,
    });

    assert.equal(result.allowed, true);
  }

  const blocked = checkAdminMutationRateLimit({
    actorEmail: "owner@lessonforge.demo",
    actorRole: "owner",
    actionKey: "system-settings",
    now: 20_500,
  });

  assert.equal(blocked.allowed, false);
});

test("mutation limiter resets after the rate-limit window passes", () => {
  resetAdminMutationRateLimitForTests();

  for (let index = 0; index < 12; index += 1) {
    checkAdminMutationRateLimit({
      actorEmail: "admin@lessonforge.demo",
      actorRole: "admin",
      actionKey: "refund-review",
      now: 30_000 + index,
    });
  }

  const afterWindow = checkAdminMutationRateLimit({
    actorEmail: "admin@lessonforge.demo",
    actorRole: "admin",
    actionKey: "refund-review",
    now: 91_000,
  });

  assert.equal(afterWindow.allowed, true);
});
