import type { ReactNode } from "react";

import { SectionIntro } from "@/components/shared/section-intro";

type EdgeStatePanelProps = {
  body: ReactNode;
  children?: ReactNode;
  eyebrow: string;
  title: ReactNode;
};

export function EdgeStatePanel({
  body,
  children,
  eyebrow,
  title,
}: EdgeStatePanelProps) {
  return (
    <section className="w-full rounded-[2rem] border border-black/5 bg-white p-8 shadow-soft-xl">
      <SectionIntro
        body={body}
        bodyClassName="max-w-2xl text-base"
        eyebrow={eyebrow}
        level="h1"
        title={title}
        titleClassName="max-w-3xl text-4xl sm:text-5xl"
      />
      {children ? <div className="mt-8">{children}</div> : null}
    </section>
  );
}
