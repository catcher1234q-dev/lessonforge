import type { PrismaCutoverReport } from "@/lib/lessonforge/prisma-cutover";

export function formatPrismaCutoverSummaryReport({
  report,
  summary,
  runtimeLabel,
  runtimeDetail,
  runtimeMode,
}: {
  report: PrismaCutoverReport;
  summary: string;
  runtimeLabel: string;
  runtimeDetail: string;
  runtimeMode: string;
}) {
  const lines = [
    `Database cutover: ${report.stageHeadline}`,
    `Founder summary: ${summary}`,
    `Current runtime storage: ${runtimeLabel} (mode: ${runtimeMode})`,
    `Runtime detail: ${runtimeDetail}`,
    `Cutover summary: ${report.summary}`,
  ];

  if (report.runbookCommands.length) {
    lines.push("Suggested run order:");
    for (const [index, command] of report.runbookCommands.entries()) {
      lines.push(`${index + 1}. ${command}`);
    }
  }

  if (report.detailLines.length) {
    lines.push("Cutover details:");
    for (const detail of report.detailLines) {
      lines.push(`- ${detail}`);
    }
  }

  if (report.actionItems.length) {
    lines.push("Cutover actions:");
    for (const item of report.actionItems) {
      lines.push(`- [${item.status}] ${item.label}: ${item.statusDescription}`);
    }
  }

  return lines.join("\n");
}
