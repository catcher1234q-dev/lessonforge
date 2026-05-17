import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

type PremiumSurfaceVariant = "glass" | "light" | "dark" | "soft";

const variantClassNames: Record<PremiumSurfaceVariant, string> = {
  glass:
    "border border-white/50 bg-white/70 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur-xl",
  light:
    "border border-slate-200/80 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)]",
  dark:
    "border border-white/10 bg-[#0f172a] text-white shadow-[0_30px_100px_rgba(15,23,42,0.30)]",
  soft:
    "border border-[#dbe3f0] bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(244,247,252,0.96)_100%)] shadow-[0_20px_60px_rgba(15,23,42,0.08)]",
};

export function PremiumSurface({
  children,
  className,
  variant = "light",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  variant?: PremiumSurfaceVariant;
}) {
  return (
    <div
      className={cn("rounded-[2rem]", variantClassNames[variant], className)}
      {...props}
    >
      {children}
    </div>
  );
}

