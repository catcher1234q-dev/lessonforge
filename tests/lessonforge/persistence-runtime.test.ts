import assert from "node:assert/strict";
import test from "node:test";

import { getPersistenceRuntimeInterpretation } from "@/lib/lessonforge/persistence-runtime";

test("runtime interpretation explains strict prisma mode clearly", () => {
  assert.equal(
    getPersistenceRuntimeInterpretation({
      mode: "prisma",
      label: "Prisma mode",
    }),
    "This session is already using strict Prisma mode, so database issues here reflect the live persistence path directly.",
  );
});

test("runtime interpretation explains demo json mode clearly", () => {
  assert.equal(
    getPersistenceRuntimeInterpretation({
      mode: "json",
      label: "Demo JSON mode",
    }),
    "This session is pinned to demo JSON storage, so the cutover status is informational until Prisma mode is enabled.",
  );
});

test("runtime interpretation distinguishes auto prisma from auto fallback", () => {
  assert.equal(
    getPersistenceRuntimeInterpretation({
      mode: "auto",
      label: "Auto mode using Prisma",
    }),
    "This session is already using the Prisma path through auto mode, but it can still fall back outside strict cutover conditions.",
  );
  assert.equal(
    getPersistenceRuntimeInterpretation({
      mode: "auto",
      label: "Auto mode using demo JSON",
    }),
    "This session is still using the demo-safe auto fallback, so the cutover status shows readiness without forcing strict Prisma behavior yet.",
  );
});
