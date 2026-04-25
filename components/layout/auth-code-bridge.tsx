"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  hasSupabasePkceCodeVerifier,
  readRememberedAuthNextPath,
  sanitizeAuthNextPath,
} from "@/lib/auth/auth-redirect";
import { hasSupabaseEnv } from "@/lib/supabase/client";

export function AuthCodeBridge() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!hasSupabaseEnv()) {
      return;
    }

    if (pathname === "/auth/callback") {
      return;
    }

    if (pathname === "/auth/reset-password") {
      return;
    }

    const code = searchParams.get("code");
    const tokenHash = searchParams.get("token_hash");
    const callbackType = searchParams.get("type");
    const errorDescription = searchParams.get("error_description");
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");

    if (
      !code &&
      !tokenHash &&
      !errorDescription &&
      !(accessToken && refreshToken)
    ) {
      return;
    }

    const nextPath =
      readRememberedAuthNextPath("/") ||
      sanitizeAuthNextPath(pathname ? `${pathname}` : "/");
    const params = new URLSearchParams(searchParams.toString());

    if (!params.get("next")) {
      params.set("next", nextPath);
    }

    if (code && !hasSupabasePkceCodeVerifier() && !tokenHash && !accessToken) {
      params.set("auth_message", "Your magic link expired or could not be verified. Please request a new link.");
    }

    const queryString = params.toString();
    const nextUrl = `/auth/callback${queryString ? `?${queryString}` : ""}${
      accessToken && refreshToken ? window.location.hash : ""
    }`;
    void callbackType;
    router.replace(nextUrl);
  }, [pathname, router, searchParams]);

  return null;
}
