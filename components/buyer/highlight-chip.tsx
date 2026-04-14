"use client";

type HighlightChipProps = {
  label: string;
  body?: string;
  bordered?: boolean;
  toneClassName: string;
  testId?: string;
  className?: string;
};

export function HighlightChip({
  label,
  body,
  bordered = false,
  toneClassName,
  testId,
  className = "",
}: HighlightChipProps) {
  const shellClassName = bordered
    ? "inline-flex flex-wrap items-center gap-2 rounded-full border px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em]"
    : "inline-flex items-center rounded-full px-3.5 py-1.5 text-[11px] font-semibold";

  return (
    <span
      className={`${shellClassName} ${toneClassName} ${className}`.trim()}
      data-testid={testId}
    >
      <span>{label}</span>
      {body ? (
        <>
          <span className="h-1 w-1 rounded-full bg-current opacity-60" />
          <span className="normal-case tracking-normal text-current/80">{body}</span>
        </>
      ) : null}
    </span>
  );
}
