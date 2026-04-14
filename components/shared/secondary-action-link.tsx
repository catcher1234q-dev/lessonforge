import type { ReactNode } from "react";

type SecondaryActionLinkProps = {
  children: ReactNode;
  className?: string;
};

export function secondaryActionSurfaceClassName(className = "") {
  return `rounded-full border border-slate-200 bg-white text-ink transition hover:border-slate-300 hover:bg-surface-subtle ${className}`.trim();
}

export function secondaryActionLinkClassName(className = "") {
  return `inline-flex items-center justify-center gap-2 ${secondaryActionSurfaceClassName("px-4 py-2.5 text-sm font-semibold")} ${className}`.trim();
}

export function SecondaryActionContent({
  children,
  className = "",
}: SecondaryActionLinkProps) {
  return <span className={secondaryActionLinkClassName(className)}>{children}</span>;
}
