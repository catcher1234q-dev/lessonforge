"use client";

import Link from "next/link";
import { useEffect, useEffectEvent, useState } from "react";

import { getPersistenceBadgeState } from "@/lib/lessonforge/persistence-badge";
import { fetchPersistenceReadiness } from "@/lib/lessonforge/persistence-readiness-client";
import type { PrismaCutoverReport } from "@/lib/lessonforge/prisma-cutover";

type PersistenceHeaderBadgeProps = {
  href: string;
  initialReport: PrismaCutoverReport;
  initialSummary: string;
  autoRefreshMs?: number;
};

export function PersistenceHeaderBadge({
  href,
  initialReport,
  initialSummary,
  autoRefreshMs = 30000,
}: PersistenceHeaderBadgeProps) {
  const [report, setReport] = useState(initialReport);
  const [summary, setSummary] = useState(initialSummary);

  const refreshBadge = useEffectEvent(async () => {
    try {
      const payload = await fetchPersistenceReadiness();
      setReport(payload.cutoverReport);
      setSummary(payload.cutoverReport.summary);
    } catch {
      // Keep the last known-good badge state if refresh fails.
    }
  });

  useEffect(() => {
    if (autoRefreshMs <= 0) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void refreshBadge();
    }, autoRefreshMs);

    return () => window.clearInterval(intervalId);
  }, [autoRefreshMs, refreshBadge]);

  const badge = getPersistenceBadgeState(report);

  return (
    <Link
      className={`hidden rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] sm:inline-flex ${badge.toneClassName}`}
      data-testid="header-persistence-badge"
      href={href}
      title={summary}
    >
      {badge.label}
    </Link>
  );
}
