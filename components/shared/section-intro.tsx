import type { ReactNode } from "react";

type SectionIntroProps = {
  align?: "left" | "center";
  body: ReactNode;
  bodyClassName?: string;
  eyebrow: string;
  level?: "h1" | "h2";
  titleClassName?: string;
  title: ReactNode;
};

export function SectionIntro({
  align = "left",
  body,
  bodyClassName = "",
  eyebrow,
  level = "h2",
  titleClassName = "",
  title,
}: SectionIntroProps) {
  const TitleTag = level;

  return (
    <div className={align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand">
        {eyebrow}
      </p>
      <TitleTag
        className={`mt-3 font-[family-name:var(--font-display)] text-4xl text-ink sm:text-5xl ${titleClassName}`.trim()}
      >
        {title}
      </TitleTag>
      <p className={`mt-4 text-lg leading-8 text-ink-soft ${bodyClassName}`.trim()}>{body}</p>
    </div>
  );
}
