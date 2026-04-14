import type { PersistenceReadiness } from "@/lib/lessonforge/persistence-readiness-contract";

export function formatPersistenceReadinessReport(readiness: PersistenceReadiness) {
  const lines = [
    `Persistence status: ${readiness.persistenceStatus.label} (mode: ${readiness.persistenceStatus.mode})`,
    `Status detail: ${readiness.persistenceStatus.detail}`,
    `Founder summary: ${readiness.founderSummary}`,
    `Cutover stage: ${readiness.cutoverReport.stageHeadline}`,
    `Cutover summary: ${readiness.cutoverReport.summary}`,
  ];

  if (readiness.databaseError) {
    lines.push(`Database note: ${readiness.databaseError}`);
  }

  if (readiness.cutoverReport.runbookCommands.length) {
    lines.push("Suggested run order:");
    for (const [index, command] of readiness.cutoverReport.runbookCommands.entries()) {
      lines.push(`${index + 1}. ${command}`);
    }
  }

  if (readiness.cutoverReport.detailLines.length) {
    lines.push("Cutover details:");
    for (const detail of readiness.cutoverReport.detailLines) {
      lines.push(`- ${detail}`);
    }
  }

  if (readiness.cutoverReport.actionItems.length) {
    lines.push("Cutover actions:");
    for (const item of readiness.cutoverReport.actionItems) {
      lines.push(`- [${item.status}] ${item.label}: ${item.statusDescription}`);
    }
  }

  return lines.join("\n");
}
