"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Provider, Session } from "@supabase/supabase-js";
import { Chrome, KeyRound, LoaderCircle, LogOut, Mail, X } from "lucide-react";
import { createPortal } from "react-dom";

import {
  getSupabaseBrowserClient,
  getSupabasePublicConfig,
  hasSupabaseEnv,
} from "@/lib/supabase/client";
import { trackFunnelEvent } from "@/lib/analytics/events";
import {
  buildClientAuthCallbackUrl,
  buildClientAuthRecoveryUrl,
  rememberAuthNextPath,
} from "@/lib/auth/auth-redirect";
import { syncViewerCookie } from "@/lib/auth/viewer-sync";

type AuthSheetProps = {
  triggerLabel?: string;
  triggerVariant?: "ghost" | "primary";
};

type EmailMode = "password" | "magic-link";

export function AuthSheet({
  triggerLabel = "Log in",
  triggerVariant = "ghost",
}: AuthSheetProps) {
  const authSetupMessage =
    "Login is not connected yet. The site owner still needs to finish the Supabase setup before accounts can be created.";
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isCreateAccountEntry = triggerLabel.toLowerCase().includes("create");
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailMode, setEmailMode] = useState<EmailMode>("password");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || typeof document === "undefined") {
      return;
    }

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [isOpen]);

  function getNextPath() {
    const queryString = searchParams.toString();
    return pathname ? `${pathname}${queryString ? `?${queryString}` : ""}` : "/";
  }

  async function completeSignedInSession(session: Session | null) {
    await syncViewerCookie({ session, preserveCurrentRole: true });
    await fetch("/api/auth/profile-sync", {
      method: "POST",
    }).catch(() => null);
    setIsOpen(false);
    router.replace(getNextPath());
    router.refresh();
  }

  const triggerClassName =
    triggerVariant === "primary"
      ? "inline-flex min-h-10 items-center justify-center rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
      : "inline-flex min-h-10 items-center justify-center rounded-full px-4 py-2 text-sm font-medium text-ink-soft transition hover:bg-surface-muted";

  async function handleOAuth(provider: Provider) {
    trackFunnelEvent("auth_oauth_started", {
      provider,
      surface: triggerLabel,
    });

    if (!hasSupabaseEnv()) {
      setError(authSetupMessage);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setMessage(null);

      const supabase = getSupabaseBrowserClient();
      rememberAuthNextPath(getNextPath());
      const redirectTo = buildClientAuthCallbackUrl();
      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
        },
      });

      if (signInError) {
        throw signInError;
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to start sign-in.",
      );
      setIsLoading(false);
    }
  }

  async function handleMagicLink() {
    trackFunnelEvent("auth_magic_link_started", {
      surface: triggerLabel,
    });

    if (!hasSupabaseEnv()) {
      setError(authSetupMessage);
      return;
    }

    if (!email.trim()) {
      setError("Enter an email address to receive a sign-in link.");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setMessage(null);

      const config = getSupabasePublicConfig();
      if (!config) {
        throw new Error(
          "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.",
        );
      }

      rememberAuthNextPath(getNextPath());
      const response = await fetch(
        `${config.url}/auth/v1/otp?redirect_to=${encodeURIComponent(buildClientAuthCallbackUrl())}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: config.anonKey,
            Authorization: `Bearer ${config.anonKey}`,
          },
          body: JSON.stringify({
            email: email.trim(),
            data: {},
            create_user: true,
            gotrue_meta_security: {},
          }),
        },
      );

      const payload = (await response.json().catch(() => null)) as
        | { error_description?: string; msg?: string; error?: string }
        | null;

      if (!response.ok) {
        throw new Error(
          payload?.error_description ||
            payload?.msg ||
            payload?.error ||
            "Unable to send the sign-in email.",
        );
      }

      if (payload?.error_description || payload?.error) {
        throw new Error(payload.error_description || payload.error);
      }

      setMessage("Check your email for a LessonForge magic link.");
      trackFunnelEvent("auth_magic_link_requested", {
        surface: triggerLabel,
      });
      setEmail("");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to send the sign-in email.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handlePasswordAuth() {
    trackFunnelEvent(
      isCreateAccountEntry ? "signup_password_started" : "login_password_started",
      {
        surface: triggerLabel,
      },
    );

    if (!hasSupabaseEnv()) {
      setError(authSetupMessage);
      return;
    }

    if (!email.trim()) {
      setError("Enter an email address to sign in.");
      return;
    }

    if (password.trim().length < 8) {
      setError("Enter a password with at least 8 characters.");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setMessage(null);

      const supabase = getSupabaseBrowserClient();
      rememberAuthNextPath(getNextPath());

      if (isCreateAccountEntry) {
        const config = getSupabasePublicConfig();
        if (!config) {
          throw new Error(
            "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.",
          );
        }

        const response = await fetch(
          `${config.url}/auth/v1/signup?redirect_to=${encodeURIComponent(buildClientAuthCallbackUrl())}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: config.anonKey,
              Authorization: `Bearer ${config.anonKey}`,
            },
            body: JSON.stringify({
              email: email.trim(),
              password,
              data: {},
            }),
          },
        );

        const payload = (await response.json().catch(() => null)) as
          | {
              error_description?: string;
              msg?: string;
              error?: string;
              access_token?: string;
              refresh_token?: string;
            }
          | null;

        if (!response.ok) {
          throw new Error(
            payload?.error_description ||
              payload?.msg ||
              payload?.error ||
              "Unable to create the account.",
          );
        }

        if (payload?.error_description || payload?.error) {
          throw new Error(payload.error_description || payload.error);
        }

        if (payload?.access_token && payload?.refresh_token) {
          const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token: payload.access_token,
            refresh_token: payload.refresh_token,
          });

          if (sessionError) {
            throw sessionError;
          }

          await completeSignedInSession(sessionData.session);
          setMessage("Account created. You are signed in and ready to continue.");
          setPassword("");
          return;
        }

        setMessage(
          "Account created. If your workspace requires email confirmation, check your inbox before signing in.",
        );
        setPassword("");
        return;
      }

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        throw signInError;
      }

      await completeSignedInSession(data.session);
      setMessage("You are signed in and ready to continue.");
      setPassword("");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to sign in with email and password.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handlePasswordReset() {
    trackFunnelEvent("password_reset_requested", {
      surface: triggerLabel,
    });

    if (!hasSupabaseEnv()) {
      setError(authSetupMessage);
      return;
    }

    if (!email.trim()) {
      setError("Enter your email address first so we know where to send the reset link.");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setMessage(null);

      const config = getSupabasePublicConfig();
      if (!config) {
        throw new Error(
          "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.",
        );
      }

      const response = await fetch(
        `${config.url}/auth/v1/recover?redirect_to=${encodeURIComponent(buildClientAuthRecoveryUrl())}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: config.anonKey,
            Authorization: `Bearer ${config.anonKey}`,
          },
          body: JSON.stringify({
            email: email.trim(),
          }),
        },
      );

      const payload = (await response.json().catch(() => null)) as
        | { error_description?: string; msg?: string; error?: string }
        | null;

      if (!response.ok) {
        throw new Error(
          payload?.error_description ||
            payload?.msg ||
            payload?.error ||
            "Unable to send the password reset email.",
        );
      }

      if (payload?.error_description || payload?.error) {
        throw new Error(payload.error_description || payload.error);
      }

      setMessage(
        "Check your email for a password reset link from LessonForge. Open the newest email in the same browser so we can finish the secure reset handoff.",
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to send the password reset email.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSignOut() {
    if (!hasSupabaseEnv()) {
      return;
    }

    setIsLoading(true);
    setError(null);
    setMessage(null);

    const supabase = getSupabaseBrowserClient();
    const { error: signOutError } = await supabase.auth.signOut();

    if (signOutError) {
      setError(signOutError.message);
    } else {
      await syncViewerCookie({ role: "buyer" });
      setMessage("You have been signed out.");
      const shouldLeavePrivateArea =
        pathname?.startsWith("/account") ||
        pathname?.startsWith("/library") ||
        pathname?.startsWith("/favorites") ||
        pathname?.startsWith("/sell");

      setIsOpen(false);

      if (shouldLeavePrivateArea) {
        router.replace("/");
        router.refresh();
      } else {
        router.refresh();
      }
    }

    setIsLoading(false);
  }

  const modalContent = isOpen ? (
    <div
      aria-modal="true"
      className="fixed inset-0 isolate z-[2147483647]"
      role="dialog"
    >
      <div className="absolute inset-0 bg-slate-950/60" />
      <div className="relative flex h-[100dvh] w-screen overflow-hidden px-4 py-4 sm:items-center sm:justify-center sm:py-6">
        <div className="relative z-10 mx-auto flex h-full w-full max-w-md flex-col overflow-hidden rounded-[2rem] border border-white/70 bg-white p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-soft-xl max-h-[calc(100dvh-2rem)] sm:h-auto sm:max-h-[calc(100dvh-3rem)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand">
                Welcome Back
              </p>
              <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-ink">
                Sign in to LessonForge
              </h2>
              <p className="mt-3 text-sm leading-6 text-ink-soft">
                Use Google, email and password, or a magic link to open your buyer and seller account spaces.
              </p>
            </div>

            <button
              aria-label="Close sign in"
              className="rounded-full p-2 text-ink-soft transition hover:bg-surface-muted"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-8 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
            <div className="grid gap-3">
              <button
                className="flex items-center justify-between rounded-2xl border border-ink/10 bg-white px-4 py-4 text-left transition hover:border-brand/30 hover:bg-brand-soft/40 disabled:cursor-not-allowed disabled:opacity-70"
                disabled={isLoading}
                onClick={() => void handleOAuth("google")}
              >
                <span className="flex items-center gap-3">
                  <Chrome className="h-5 w-5 text-brand" />
                  <span>
                    <span className="block text-sm font-semibold text-ink">
                      Continue with Google
                    </span>
                    <span className="block text-xs text-ink-muted">
                      Best for school Google Workspace accounts
                    </span>
                  </span>
                </span>
              </button>

            <div className="rounded-2xl border border-ink/10 bg-white p-4">
              <label className="block text-sm font-semibold text-ink">
                Continue with Email
              </label>
              <p className="mt-1 text-xs text-ink-muted">
                Use email and password for the most reliable sign-in, or request a magic link.
              </p>
              <div className="mt-3 inline-flex rounded-full border border-ink/10 bg-surface-subtle p-1">
                <button
                  className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                    emailMode === "password"
                      ? "bg-white text-ink shadow-sm"
                      : "text-ink-soft hover:text-ink"
                  }`}
                  onClick={() => setEmailMode("password")}
                  type="button"
                >
                  Email + Password
                </button>
                <button
                  className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                    emailMode === "magic-link"
                      ? "bg-white text-ink shadow-sm"
                      : "text-ink-soft hover:text-ink"
                  }`}
                  onClick={() => setEmailMode("magic-link")}
                  type="button"
                >
                  Magic Link
                </button>
              </div>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                  <input
                    className="w-full rounded-full border border-ink/10 bg-surface-subtle py-3 pl-10 pr-4 text-sm text-ink outline-none transition focus:border-brand"
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="teacher@school.org"
                    type="email"
                    value={email}
                  />
                </div>
              </div>
              {emailMode === "password" ? (
                <>
                  <div className="relative mt-3">
                    <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                    <input
                      className="w-full rounded-full border border-ink/10 bg-surface-subtle py-3 pl-10 pr-4 text-sm text-ink outline-none transition focus:border-brand"
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder={isCreateAccountEntry ? "Create a password" : "Enter your password"}
                      type="password"
                      value={password}
                    />
                  </div>
                  {!isCreateAccountEntry ? (
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <p className="text-xs leading-5 text-ink-muted">
                        Use your account password for the quickest way back into checkout.
                      </p>
                      <button
                        className="text-xs font-semibold text-brand transition hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
                        disabled={isLoading}
                        onClick={() => void handlePasswordReset()}
                        type="button"
                      >
                        Forgot password?
                      </button>
                    </div>
                  ) : null}
                  <button
                    className="mt-3 inline-flex w-full items-center justify-center rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
                    disabled={isLoading}
                    onClick={() => void handlePasswordAuth()}
                    type="button"
                  >
                    {isCreateAccountEntry ? "Create Account" : "Sign In"}
                  </button>
                  <p className="mt-2 text-xs leading-5 text-ink-muted">
                    {isCreateAccountEntry
                      ? "Create a buyer account with an email and password so you can sign in again before checkout."
                      : "Sign in directly with your email and password before starting checkout."}
                  </p>
                </>
              ) : (
                <button
                  className="mt-3 inline-flex w-full items-center justify-center rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={isLoading}
                  onClick={() => void handleMagicLink()}
                  type="button"
                >
                  Send Magic Link
                </button>
              )}
            </div>
          </div>

            {isLoading ? (
              <div className="mt-5 inline-flex items-center gap-2 text-sm text-ink-soft">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Working on your sign-in request...
              </div>
            ) : null}

            {message ? (
              <div className="mt-5 rounded-2xl border border-brand/10 bg-brand-soft px-4 py-3 text-sm leading-6 text-brand-700">
                {message}
              </div>
            ) : null}

            {error ? (
              <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
                {error}
              </div>
            ) : null}

            <div className="mt-6 rounded-2xl bg-surface-subtle px-4 py-3 text-xs leading-6 text-ink-muted">
              By continuing, teachers agree to LessonForge&apos;s{" "}
              <Link className="font-semibold text-ink transition hover:text-brand" href="/terms">
                Terms
              </Link>{" "}
              and{" "}
              <Link className="font-semibold text-ink transition hover:text-brand" href="/privacy">
                Privacy Policy
              </Link>
              .
            </div>

            {hasSupabaseEnv() ? (
              <button
                className="mt-4 inline-flex items-center gap-2 pb-[env(safe-area-inset-bottom)] text-sm font-medium text-ink-soft transition hover:text-ink"
                disabled={isLoading}
                onClick={() => void handleSignOut()}
                type="button"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        className={triggerClassName}
        onClick={() => {
          trackFunnelEvent(
            triggerLabel.toLowerCase().includes("create")
              ? "signup_entry_clicked"
              : "login_entry_clicked",
            { surface: pathname ?? "unknown" },
          );
          setIsOpen(true);
        }}
      >
        {triggerLabel}
      </button>
      {modalContent && typeof document !== "undefined"
        ? createPortal(modalContent, document.body)
        : null}
    </>
  );
}
