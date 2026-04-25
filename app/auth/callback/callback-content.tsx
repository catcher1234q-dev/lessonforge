"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { SectionIntro } from "@/components/shared/section-intro";
import { secondaryActionLinkClassName } from "@/components/shared/secondary-action-link";
import { StartHerePanel } from "@/components/shared/start-here-panel";
import {
  clearRememberedAuthNextPath,
  readRememberedAuthNextPath,
  sanitizeAuthNextPath,
} from "@/lib/auth/auth-redirect";
import {
  getSupabaseBrowserClient,
  hasSupabaseEnv,
} from "@/lib/supabase/client";
import { syncViewerCookie } from "@/lib/auth/viewer-sync";

type CallbackState = "working" | "success" | "error";

export function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useState<CallbackState>("working");
  const [message, setMessage] = useState("Signing you in to LessonForge...");

  const nextPath = useMemo(
    () =>
      searchParams.get("next")
        ? sanitizeAuthNextPath(searchParams.get("next"))
        : readRememberedAuthNextPath(),
    [searchParams],
  );

  useEffect(() => {
    async function handleCallback() {
      if (!hasSupabaseEnv()) {
        setState("error");
        setMessage(
          "Supabase environment variables are missing. Add them before using sign-in.",
        );
        return;
      }

      const errorDescription = searchParams.get("error_description");
      if (errorDescription) {
        setState("error");
        setMessage(errorDescription);
        return;
      }

      const code = searchParams.get("code");
      if (!code) {
        setState("error");
        setMessage("No sign-in code was returned from the provider.");
        return;
      }

      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        setState("error");
        setMessage(error.message);
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      await syncViewerCookie({ session, preserveCurrentRole: true });
      await fetch("/api/auth/profile-sync", {
        method: "POST",
      }).catch(() => null);
      clearRememberedAuthNextPath();

      setState("success");
      setMessage("Sign-in successful. Redirecting back to the website...");
      router.replace(nextPath);
    }

    void handleCallback();
  }, [nextPath, router, searchParams]);

  return (
    <div className="w-full max-w-xl rounded-[2rem] border border-ink/5 bg-white p-8 text-center shadow-soft-xl">
      <SectionIntro
        align="center"
        body={message}
        bodyClassName="text-base"
        eyebrow="Sign-in"
        level="h1"
        title={
          state === "working"
            ? "Finishing your sign-in"
            : state === "success"
              ? "Welcome back"
              : "There was a sign-in issue"
        }
        titleClassName="text-4xl"
      />
      <StartHerePanel
        className={
          state === "error"
            ? "border-rose-100 bg-rose-50/80"
            : state === "success"
              ? "border-emerald-100 bg-emerald-50/80"
              : "border-sky-100 bg-sky-50/80"
        }
        items={
          state === "error"
            ? [
                {
                  label: "What happened",
                  detail: "The sign-in handoff did not finish cleanly, so you were not signed into the site.",
                },
                {
                  label: "Try next",
                  detail: "Go back to the page you came from, or return to the homepage and try sign-in again.",
                },
                {
                  label: "Good to know",
                  detail: "Nothing was purchased or changed here. This page only handles sign-in access.",
                },
              ]
            : state === "success"
              ? [
                  {
                    label: "Signed in",
                    detail: "Your access is ready and the site is sending you back to where you were headed.",
                  },
                  {
                    label: "What happens next",
                    detail: "You should land on the next page automatically in a moment without re-entering details.",
                  },
                  {
                    label: "If the page feels stuck",
                    detail: "Use the continue link below to jump back into the site manually.",
                  },
                ]
              : [
                  {
                    label: "Start here",
                    detail: "We are finishing the sign-in handoff from the provider back into LessonForge.",
                  },
                  {
                    label: "What happens next",
                    detail: "If everything is valid, you will be redirected automatically to the next page.",
                  },
                  {
                    label: "If it takes too long",
                    detail: "You can always return to the homepage and start again without losing a purchase.",
                  },
                ]
        }
        title={
          state === "error"
            ? "This page only completes sign-in, so the safest next step is simply to head back and try again."
            : state === "success"
              ? "You are already signed in, so this page should disappear as soon as the redirect finishes."
              : "This is a short transition page, not a separate setup step you need to complete yourself."
        }
      />
      <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
        {state === "success" ? (
          <Link
            className="inline-flex items-center justify-center rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
            href={nextPath}
          >
            Continue to the site
          </Link>
        ) : null}
        {state === "error" ? (
          <>
            <Link
              className="inline-flex items-center justify-center rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
              href="/"
            >
              Return home
            </Link>
            <Link
              className={secondaryActionLinkClassName("px-5 py-3")}
              href="/marketplace"
            >
              Open marketplace
            </Link>
          </>
        ) : null}
        {state === "working" ? (
          <Link
            className={secondaryActionLinkClassName("px-5 py-3")}
            href="/"
          >
            Return home
          </Link>
        ) : null}
      </div>
    </div>
  );
}
