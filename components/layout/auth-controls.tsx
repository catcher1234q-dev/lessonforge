"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import { AccountMenu } from "@/components/layout/account-menu";
import { AuthSheet } from "@/components/layout/auth-sheet";
import { ViewerRoleControls } from "@/components/layout/viewer-role-controls";
import {
  getSupabaseBrowserClient,
  hasSupabaseEnv,
} from "@/lib/supabase/client";
import { syncViewerCookie } from "@/lib/auth/viewer-sync";

export function AuthControls() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showLocalDemoControls, setShowLocalDemoControls] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const hostname = window.location.hostname.toLowerCase();
    setShowLocalDemoControls(
      hostname === "localhost" || hostname === "127.0.0.1",
    );
  }, []);

  useEffect(() => {
    if (!hasSupabaseEnv()) {
      setIsLoading(false);
      return;
    }

    const supabase = getSupabaseBrowserClient();
    let isActive = true;
    const loadingTimeout = window.setTimeout(() => {
      if (isActive) {
        setIsLoading(false);
      }
    }, 1500);

    void supabase.auth.getSession().then(({ data }) => {
      if (!isActive) {
        return;
      }

      window.clearTimeout(loadingTimeout);
      setSession(data.session);
      setIsLoading(false);
      if (data.session) {
        void syncViewerCookie({
          session: data.session,
          preserveCurrentRole: true,
        });
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isActive) {
        return;
      }

      window.clearTimeout(loadingTimeout);
      setSession(nextSession);
      setIsLoading(false);
      if (nextSession) {
        void syncViewerCookie({
          session: nextSession,
          preserveCurrentRole: true,
        });
      }
    });

    return () => {
      isActive = false;
      window.clearTimeout(loadingTimeout);
      subscription.unsubscribe();
    };
  }, []);

  if (isLoading) {
    return (
      <div className="rounded-full bg-surface-muted px-4 py-2 text-sm text-ink-soft">
        Checking sign-in...
      </div>
    );
  }

  if (!session) {
    if (!hasSupabaseEnv()) {
      if (showLocalDemoControls) {
        return <ViewerRoleControls />;
      }

      return (
        <div className="flex items-center gap-3">
          <AuthSheet triggerLabel="Log in" />
          <AuthSheet triggerLabel="Create account" triggerVariant="primary" />
        </div>
      );
    }

    return (
      <>
        <AuthSheet triggerLabel="Log in" />
        <AuthSheet triggerLabel="Create account" triggerVariant="primary" />
      </>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <AccountMenu session={session} />
    </div>
  );
}
