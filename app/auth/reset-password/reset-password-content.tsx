"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { EmailOtpType } from "@supabase/supabase-js";

import { SectionIntro } from "@/components/shared/section-intro";
import { secondaryActionLinkClassName } from "@/components/shared/secondary-action-link";
import { StartHerePanel } from "@/components/shared/start-here-panel";
import { syncViewerCookie } from "@/lib/auth/viewer-sync";
import {
  getSupabaseBrowserClient,
  hasSupabaseEnv,
} from "@/lib/supabase/client";

type ResetState = "verifying" | "ready" | "saving" | "success" | "error";

export function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [state, setState] = useState<ResetState>("verifying");
  const [message, setMessage] = useState("Checking your password reset link...");

  const recoveryCode = searchParams.get("code");
  const recoveryType = searchParams.get("type");
  const recoveryTokenHash = searchParams.get("token_hash");
  const recoveryError = searchParams.get("error_description");

  const canSubmit = useMemo(
    () =>
      state === "ready" &&
      password.length >= 8 &&
      confirmPassword.length >= 8 &&
      password === confirmPassword,
    [confirmPassword, password, state],
  );

  useEffect(() => {
    async function prepareResetSession() {
      if (!hasSupabaseEnv()) {
        setState("error");
        setMessage(
          "Supabase environment variables are missing. Add them before using password reset.",
        );
        return;
      }

      if (recoveryError) {
        setState("error");
        setMessage(recoveryError);
        return;
      }

      try {
        const supabase = getSupabaseBrowserClient();
        let {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
          const accessToken = hashParams.get("access_token");
          const refreshToken = hashParams.get("refresh_token");

          if (accessToken && refreshToken) {
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (error) {
              setState("error");
              setMessage(error.message);
              return;
            }
          } else if (recoveryTokenHash && recoveryType === "recovery") {
            const { error } = await supabase.auth.verifyOtp({
              token_hash: recoveryTokenHash,
              type: "recovery" satisfies EmailOtpType,
            });

            if (error) {
              setState("error");
              setMessage(error.message);
              return;
            }
          } else if (recoveryCode && recoveryType === "recovery") {
            const { error } = await supabase.auth.exchangeCodeForSession(recoveryCode);

            if (error) {
              setState("error");
              setMessage(error.message);
              return;
            }
          }
        }

        ({
          data: { session },
        } = await supabase.auth.getSession());

        if (!session) {
          setState("error");
          setMessage(
            "LessonForge could not confirm a valid recovery session for this page. Request a new password reset email, open the newest link, and let it pass through the callback page first.",
          );
          return;
        }

        setState("ready");
        setMessage("Choose a new password for your LessonForge account.");
      } catch (caughtError) {
        setState("error");
        setMessage(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to verify the password reset link.",
        );
      }
    }

    void prepareResetSession();
  }, [recoveryCode, recoveryError, recoveryTokenHash, recoveryType]);

  async function handlePasswordReset() {
    if (password.length < 8) {
      setState("error");
      setMessage("Use a password with at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setState("error");
      setMessage("Password confirmation does not match yet.");
      return;
    }

    try {
      setState("saving");
      setMessage("Saving your new password...");
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        throw error;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      await syncViewerCookie({
        session,
        preserveCurrentRole: true,
      });
      await fetch("/api/auth/profile-sync", {
        method: "POST",
      }).catch(() => null);

      setState("success");
      setMessage("Password updated. Redirecting you back into your account...");
      setPassword("");
      setConfirmPassword("");

      window.setTimeout(() => {
        router.replace("/account");
        router.refresh();
      }, 1200);
    } catch (caughtError) {
      setState("error");
      setMessage(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to save your new password.",
      );
    }
  }

  return (
    <div className="w-full max-w-xl rounded-[2rem] border border-ink/5 bg-white p-8 shadow-soft-xl">
      <SectionIntro
        align="center"
        body={message}
        bodyClassName="text-base"
        eyebrow="Password reset"
        level="h1"
        title={
          state === "success"
            ? "Password updated"
            : state === "error"
              ? "Reset link issue"
              : "Reset your password"
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
                  detail:
                    "The reset link did not open a usable recovery session, so no password change was saved.",
                },
                {
                  label: "Try next",
                  detail:
                    "Request a new reset email from the sign-in form, open the newest email, and let LessonForge route through the callback page before you set a new password.",
                },
              ]
            : state === "success"
              ? [
                  {
                    label: "Saved",
                    detail:
                      "Your LessonForge password is updated, and your account session is being refreshed now.",
                  },
                  {
                    label: "What happens next",
                    detail:
                      "You should land in your account automatically in a moment without re-entering anything.",
                  },
                ]
              : [
                  {
                    label: "Start here",
                    detail:
                      "Open the reset email on this page, then enter a strong new password below.",
                  },
                  {
                    label: "Good to know",
                    detail:
                      "This only changes account access. It does not affect purchases, listings, or payout settings.",
                  },
                ]
        }
        title={
          state === "error"
            ? "The safest next step is to request a fresh reset email and start again."
            : "This page is only for securely setting a new password after you open a valid reset email."
        }
      />

      {state !== "error" && state !== "success" ? (
        <div className="mt-8 space-y-4">
          <label className="block text-sm font-semibold text-ink">
            New password
            <input
              autoComplete="new-password"
              className="mt-2 w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-brand"
              disabled={state !== "ready"}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              value={password}
            />
          </label>

          <label className="block text-sm font-semibold text-ink">
            Confirm new password
            <input
              autoComplete="new-password"
              className="mt-2 w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-brand"
              disabled={state !== "ready"}
              onChange={(event) => setConfirmPassword(event.target.value)}
              type="password"
              value={confirmPassword}
            />
          </label>

          <p className="text-xs leading-6 text-ink-muted">
            Use at least 8 characters so your account can sign in reliably on future visits.
          </p>

          <button
            className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!canSubmit || state === "saving"}
            onClick={() => void handlePasswordReset()}
            type="button"
          >
            {state === "saving" ? "Saving password..." : "Save new password"}
          </button>
        </div>
      ) : null}

      <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
        {state === "error" ? (
          <Link
            className="inline-flex items-center justify-center rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
            href="/account"
          >
            Return to sign in
          </Link>
        ) : null}
        <Link
          className={secondaryActionLinkClassName("px-5 py-3")}
          href={state === "success" ? "/account" : "/account"}
        >
          {state === "success" ? "Open account" : "Request new reset email"}
        </Link>
      </div>
    </div>
  );
}
