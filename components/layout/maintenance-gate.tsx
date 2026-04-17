import Link from "next/link";

import { SectionIntro } from "@/components/shared/section-intro";
import { secondaryActionLinkClassName } from "@/components/shared/secondary-action-link";
import { StartHerePanel } from "@/components/shared/start-here-panel";
import { getCurrentViewer } from "@/lib/auth/viewer";
import { getSystemSettings } from "@/lib/lessonforge/data-access";

export async function MaintenanceGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const [viewer, systemSettings] = await Promise.all([
    getCurrentViewer(),
    getSystemSettings(),
  ]);

  if (!systemSettings.maintenanceModeEnabled || viewer.role === "owner") {
    return <>{children}</>;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-subtle px-5 py-10 sm:px-6 lg:px-8">
      <section className="w-full max-w-2xl rounded-[2rem] border border-black/5 bg-white p-8 shadow-soft-xl">
        <SectionIntro
          body={systemSettings.maintenanceMessage}
          eyebrow="Maintenance mode"
          level="h1"
          title="LessonForge is temporarily offline for platform updates."
          titleClassName="leading-tight"
        />
        <StartHerePanel
          className="border-amber-100 bg-amber-50/80"
          items={[
            {
              label: "What happened",
              detail: "The site is paused for non-owner users while platform updates or fixes are being made.",
            },
            {
              label: "What you can do now",
              detail: "Return home for now, or check the founder notes page if you just want context on the product.",
            },
            {
              label: "Good to know",
              detail: "This is a temporary protection step, not a problem with your account or a purchase you made.",
            },
          ]}
          title="Use this message as a temporary holding page while the platform is being updated safely."
        />
        <p className="mt-4 text-sm leading-7 text-ink-soft">
          Owner access stays live during maintenance so launch updates, pricing changes, and system controls can still be managed safely.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            className="inline-flex items-center justify-center rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
            href="/"
          >
            Return home
          </Link>
          <Link
            className={secondaryActionLinkClassName("px-5 py-3")}
            href="/founder"
          >
            Founder notes
          </Link>
        </div>
      </section>
    </main>
  );
}
