import type { PrismaCutoverReport } from "@/lib/lessonforge/prisma-cutover";

export type PersistenceBadgeState = {
  label:
    | "Cutover blocked"
    | "Ready to verify"
    | "Verification failed"
    | "Cutover verified";
  toneClassName: string;
};

export function getPersistenceBadgeState(
  report: PrismaCutoverReport,
): PersistenceBadgeState {
  if (report.stage === "preflight-blocked") {
    return {
      label: "Cutover blocked",
      toneClassName: "bg-rose-50 text-rose-700",
    };
  }

  if (report.stage === "ready-for-verification") {
    return {
      label: "Ready to verify",
      toneClassName: "bg-amber-50 text-amber-700",
    };
  }

  if (report.stage === "verification-failed") {
    return {
      label: "Verification failed",
      toneClassName: "bg-rose-50 text-rose-700",
    };
  }

  return {
    label: "Cutover verified",
    toneClassName: "bg-emerald-50 text-emerald-700",
  };
}
