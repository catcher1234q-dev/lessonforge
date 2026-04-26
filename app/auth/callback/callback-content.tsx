"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { EmailOtpType } from "@supabase/supabase-js";

import { SectionIntro } from "@/components/shared/section-intro";
import { secondaryActionLinkClassName } from "@/components/shared/secondary-action-link";
import { StartHerePanel } from "@/components/shared/start-here-panel";
import {
  clearRememberedAuthNextPath,
  getAuthNextPathFromSearchParams,
  hasSupabasePkceCodeVerifier,
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
    () => getAuthNextPathFromSearchParams(searchParams, "/account"),
    [searchParams],
  );
  const expectsPasswordReset = nextPath === "/account/reset-password";

  useEffect(() => {
    async function handleCallback() {
      if (!hasSupabaseEnv()) {
        setState("error");
        setMessage(
          "Supabase environment variables are missing. Add them before using sign-in.",
        );
        return;
      }

      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const errorDescription =
        searchParams.get("error_description") || hashParams.get("error_description");
      const authMessage = searchParams.get("auth_message");
      if (errorDescription) {
        setState("error");
        setMessage(errorDescription);
        return;
      }

      if (authMessage) {
        setState("error");
        setMessage(authMessage);
        return;
      }

      const code = searchParams.get("code");
      const tokenHash = searchParams.get("token_hash");
      const callbackType = searchParams.get("type");
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      const hashType = hashParams.get("type");
      const isRecoveryFlow =
        expectsPasswordReset ||
        callbackType === "recovery" ||
        hashType === "recovery";

      if (!code && !tokenHash && !(accessToken && refreshToken)) {
        setState("error");
        setMessage(
          isRecoveryFlow
            ? "This reset link did not include the recovery details needed to update your password. Request a fresh reset email and try again."
            : "No sign-in code was returned from the provider.",
        );
        return;
      }

      try {
        const supabase = getSupabaseBrowserClient();
        let authError: Error | null = null;

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            authError = error;
          }
        } else if (
          tokenHash &&
          (callbackType === "email" ||
            callbackType === "magiclink" ||
            callbackType === "recovery")
        ) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: callbackType as Extract<EmailOtpType, "email" | "magiclink" | "recovery">,
          });

          if (error) {
            authError = error;
          }
        } else if (code) {
          if (!hasSupabasePkceCodeVerifier()) {
            setState("error");
            setMessage(
              isRecoveryFlow
                ? "This reset link could not be verified in this browser session. Request a new password reset email and open the newest link in the same browser."
                : "This sign-in link could not be verified in this browser session. Request a new link and open it on the same device and browser.",
            );
            return;
          }

          const { error } = await supabase.auth.exchangeCodeForSession(code);

          if (error) {
            authError = error;
          }
        }

        if (authError) {
          setState("error");
          setMessage(
            isRecoveryFlow
              ? `LessonForge could not finish the password reset handoff: ${authError.message}`
              : authError.message,
          );
          return;
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          setState("error");
          setMessage(
            isRecoveryFlow
              ? "LessonForge could not confirm a recovery session from this reset link. Request a new reset email and try again."
              : "LessonForge could not confirm a signed-in session from this link. Request a new link and try again.",
          );
          return;
        }

        await syncViewerCookie({ session, preserveCurrentRole: true });
        await fetch("/api/auth/profile-sync", {
          method: "POST",
        }).catch(() => null);
        clearRememberedAuthNextPath();

        setState("success");
        setMessage(
          isRecoveryFlow
            ? "Recovery verified. Redirecting you to choose a new password..."
            : "Sign-in successful. Redirecting back to the website...",
        );
        router.replace(nextPath);
      } catch (caughtError) {
        setState("error");
        setMessage(
          caughtError instanceof Error
            ? caughtError.message
            : isRecoveryFlow
              ? "Unable to complete the password reset link."
              : "Unable to complete the sign-in link.",
        );
      }
    }

    void handleCallback();
  }, [expectsPasswordReset, nextPath, router, searchParams]);

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
              href="/account"
            >
              Back to sign in
            </Link>
            <Link
              className={secondaryActionLinkClassName("px-5 py-3")}
              href={expectsPasswordReset ? "/account" : "/marketplace"}
            >
              {expectsPasswordReset ? "Request new reset email" : "Open marketplace"}
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
