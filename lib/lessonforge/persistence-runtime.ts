import type { PersistenceStatusView } from "@/lib/lessonforge/persistence-readiness-contract";

export function getPersistenceRuntimeInterpretation({
  mode,
  label,
}: Pick<PersistenceStatusView, "mode" | "label">) {
  if (mode === "prisma") {
    return "This session is already using strict Prisma mode, so database issues here reflect the live persistence path directly.";
  }

  if (mode === "json") {
    return "This session is pinned to local JSON storage, so the cutover status is informational until Prisma mode is enabled.";
  }

  if (label === "Auto mode using Prisma") {
    return "This session is already using the Prisma path through auto mode, but it can still fall back outside strict cutover conditions.";
  }

  return "This session is still using the local JSON auto fallback, so the cutover status shows readiness without forcing strict Prisma behavior yet.";
}
