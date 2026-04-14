import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

type DisclosureSummaryProps = {
  actionLabel?: string;
  body?: ReactNode;
  compact?: boolean;
  eyebrow?: string;
  meta?: ReactNode;
  title: ReactNode;
};

export function DisclosureSummary({
  actionLabel = "Expand",
  body,
  compact = false,
  eyebrow,
  meta,
  title,
}: DisclosureSummaryProps) {
  return (
    <summary className="list-none cursor-pointer">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          {eyebrow ? (
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">
              {eyebrow}
            </p>
          ) : null}
          <p
            className={`font-semibold text-ink ${
              compact ? "text-xl" : eyebrow ? "mt-3 text-2xl" : "text-2xl"
            }`}
          >
            {title}
          </p>
          {body ? (
            <p className={`text-sm leading-7 text-ink-soft ${compact ? "mt-2" : "mt-3"}`}>
              {body}
            </p>
          ) : null}
          {meta ? (
            <div className={`mt-3 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft ${compact ? "" : ""}`}>
              {meta}
            </div>
          ) : null}
        </div>
        <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-ink-soft">
          <span>{actionLabel}</span>
          <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
        </div>
      </div>
    </summary>
  );
}
