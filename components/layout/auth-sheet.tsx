"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Provider } from "@supabase/supabase-js";
import { Apple, Chrome, LoaderCircle, LogOut, Mail, X } from "lucide-react";

import {
  getSupabaseBrowserClient,
  hasSupabaseEnv,
} from "@/lib/supabase/client";
import { syncViewerCookie } from "@/lib/auth/viewer-sync";

type AuthSheetProps = {
  triggerLabel?: string;
  triggerVariant?: "ghost" | "primary";
};

export function AuthSheet({
  triggerLabel = "Log in",
  triggerVariant = "ghost",
}: AuthSheetProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function getAuthCallbackUrl() {
    const queryString = searchParams.toString();
    const nextPath = pathname
      ? `${pathname}${queryString ? `?${queryString}` : ""}`
      : "/";
    const safeNextPath = nextPath.startsWith("/") ? nextPath : "/";
    return `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNextPath)}`;
  }

  const triggerClassName =
    triggerVariant === "primary"
      ? "rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
      : "rounded-full px-4 py-2 text-sm font-medium text-ink-soft transition hover:bg-surface-muted";

  async function handleOAuth(provider: Provider) {
    if (!hasSupabaseEnv()) {
      setError(
        "Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable sign-in.",
      );
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setMessage(null);

      const supabase = getSupabaseBrowserClient();
      const redirectTo = getAuthCallbackUrl();
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
    if (!hasSupabaseEnv()) {
      setError(
        "Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable sign-in.",
      );
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

      const supabase = getSupabaseBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: getAuthCallbackUrl(),
        },
      });

      if (signInError) {
        throw signInError;
      }

      setMessage("Check your email for a LessonForge magic link.");
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

  return (
    <>
      <button className={triggerClassName} onClick={() => setIsOpen(true)}>
        {triggerLabel}
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[2rem] border border-white/70 bg-white p-6 shadow-soft-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand">
                  Welcome Back
                </p>
                <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-ink">
                  Sign in to LessonForge
                </h2>
                <p className="mt-3 text-sm leading-6 text-ink-soft">
                  Use Google, Apple, or a passwordless email link to open your buyer and seller account spaces.
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

            <div className="mt-8 grid gap-3">
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

              <button
                className="flex items-center justify-between rounded-2xl border border-ink/10 bg-white px-4 py-4 text-left transition hover:border-brand/30 hover:bg-brand-soft/40 disabled:cursor-not-allowed disabled:opacity-70"
                disabled={isLoading}
                onClick={() => void handleOAuth("apple")}
              >
                <span className="flex items-center gap-3">
                  <Apple className="h-5 w-5 text-ink" />
                  <span>
                    <span className="block text-sm font-semibold text-ink">
                      Continue with Apple
                    </span>
                    <span className="block text-xs text-ink-muted">
                      Fast private sign-in for personal devices
                    </span>
                  </span>
                </span>
              </button>

              <div className="rounded-2xl border border-ink/10 bg-white p-4">
                <label className="block text-sm font-semibold text-ink">
                  Continue with Email
                </label>
                <p className="mt-1 text-xs text-ink-muted">
                  Use a passwordless magic link.
                </p>
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
                  <button
                    className="inline-flex items-center justify-center rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
                    disabled={isLoading}
                    onClick={() => void handleMagicLink()}
                  >
                    Send Link
                  </button>
                </div>
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
                className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-ink-soft transition hover:text-ink"
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
      ) : null}
    </>
  );
}
