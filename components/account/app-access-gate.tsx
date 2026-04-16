"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import Link from "next/link";

import { AuthSheet } from "@/components/layout/auth-sheet";
import { SectionIntro } from "@/components/shared/section-intro";
import type { ViewerRole } from "@/types";
import { syncViewerCookie } from "@/lib/auth/viewer-sync";
import { getSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase/client";

type AppAccessGateProps = {
  area: "buyer" | "seller";
  children: ReactNode;
};

export function AppAccessGate({ area, children }: AppAccessGateProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [isViewerSyncing, setIsViewerSyncing] = useState(false);
  const [hasFallbackAccess, setHasFallbackAccess] = useState(false);
  const [isFallbackLoading, setIsFallbackLoading] = useState(true);

  useEffect(() => {
    let isActive = true;
    setIsFallbackLoading(true);

    void fetch("/api/session/viewer", {
      cache: "no-store",
    })
      .then(async (response) => {
        const payload = (await response.json()) as {
          viewer?: { role?: ViewerRole };
          signedIn?: boolean;
        };

        if (!isActive) {
          return;
        }

        setHasFallbackAccess(
          Boolean(payload.signedIn) && payload.viewer?.role === area,
        );
      })
      .catch(() => {
        if (isActive) {
          setHasFallbackAccess(false);
        }
      })
      .finally(() => {
        if (isActive) {
          setIsFallbackLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [area]);

  useEffect(() => {
    if (!hasSupabaseEnv()) {
      setIsSessionLoading(false);
      return;
    }

    const supabase = getSupabaseBrowserClient();
    let isActive = true;
    const loadingTimeout = window.setTimeout(() => {
      if (isActive) {
        setIsSessionLoading(false);
      }
    }, 1500);

    void supabase.auth.getSession().then(({ data }) => {
      if (!isActive) {
        return;
      }

      window.clearTimeout(loadingTimeout);
      setSession(data.session);
      setIsSessionLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isActive) {
        return;
      }

      window.clearTimeout(loadingTimeout);
      setSession(nextSession);
      setIsSessionLoading(false);
    });

    return () => {
      isActive = false;
      window.clearTimeout(loadingTimeout);
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!hasSupabaseEnv() || !session) {
      setIsViewerSyncing(false);
      return;
    }

    let isActive = true;
    setIsViewerSyncing(true);

    void (async () => {
      try {
        await syncViewerCookie({
          role: area === "seller" ? "seller" : "buyer",
          session,
        });
      } finally {
        if (isActive) {
          setIsViewerSyncing(false);
        }
      }
    })();

    return () => {
      isActive = false;
    };
  }, [area, session]);

  if (isSessionLoading || isFallbackLoading) {
    return (
      <div className="rounded-[2rem] border border-ink/5 bg-white p-8 text-sm text-ink-soft shadow-soft-xl">
        Checking your account access...
      </div>
    );
  }

  if (!hasSupabaseEnv()) {
    if (hasFallbackAccess) {
      return <>{children}</>;
    }

    return (
      <div className="rounded-[2rem] border border-ink/5 bg-white p-8 shadow-soft-xl">
        <SectionIntro
          body={`This ${area === "buyer" ? "buyer" : "seller"} area will open after the site owner finishes the Supabase sign-in setup. Public browsing still works while account access is being connected.`}
          eyebrow="Account access"
          level="h1"
          title="Accounts are being connected."
          titleClassName="text-4xl"
        />
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            className="inline-flex items-center justify-center rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
            href={area === "buyer" ? "/marketplace" : "/sell"}
          >
            {area === "buyer" ? "Open marketplace" : "Open seller flow"}
          </Link>
          <Link
            className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:border-slate-300"
            href="/"
          >
            Return home
          </Link>
        </div>
      </div>
    );
  }

  if (!session && !hasFallbackAccess) {
    return (
      <div className="rounded-[2rem] border border-ink/5 bg-white p-8 shadow-soft-xl">
        <SectionIntro
          body={
            area === "buyer"
              ? "Your purchases, saved items, and protected buyer tools live here, but this area is only for signed-in accounts."
              : "Your seller setup, listings, dashboard, and earnings live here, but this area is only for signed-in accounts."
          }
          eyebrow="Account access"
          level="h1"
          title={area === "buyer" ? "Sign in to open your buyer tools." : "Sign in to open your seller tools."}
          titleClassName="text-4xl"
        />
        <div className="mt-6 flex flex-wrap gap-3">
          <AuthSheet triggerLabel="Log in" />
          <AuthSheet triggerLabel="Create account" triggerVariant="primary" />
        </div>
      </div>
    );
  }

  if (session && isViewerSyncing) {
    return (
      <div className="rounded-[2rem] border border-ink/5 bg-white p-8 text-sm text-ink-soft shadow-soft-xl">
        {area === "seller"
          ? "Preparing your seller workspace..."
          : "Preparing your buyer workspace..."}
      </div>
    );
  }

  return <>{children}</>;
}
