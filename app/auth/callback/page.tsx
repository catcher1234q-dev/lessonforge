import { Suspense } from "react";

import { CallbackContent } from "@/app/auth/callback/callback-content";
import { SectionIntro } from "@/components/shared/section-intro";

export default function AuthCallbackPage() {
  return (
    <main className="page-shell flex min-h-screen items-center justify-center px-5 py-16 sm:px-6 lg:px-8">
      <Suspense
        fallback={
          <div className="w-full max-w-xl rounded-[2rem] border border-ink/5 bg-white p-8 text-center shadow-soft-xl">
            <SectionIntro
              align="center"
              body="One moment while we complete your sign-in."
              bodyClassName="text-base"
              eyebrow="Sign-in"
              level="h1"
              title="Preparing your access"
              titleClassName="text-4xl"
            />
          </div>
        }
      >
        <CallbackContent />
      </Suspense>
    </main>
  );
}
