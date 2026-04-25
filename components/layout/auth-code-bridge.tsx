"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
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

    const code = searchParams.get("code");
    const errorDescription = searchParams.get("error_description");

    if (!code && !errorDescription) {
      return;
    }

    const nextPath =
      readRememberedAuthNextPath() ||
      sanitizeAuthNextPath(pathname ? `${pathname}` : "/");
    const params = new URLSearchParams(searchParams.toString());

    if (!params.get("next")) {
      params.set("next", nextPath);
    }

    router.replace(`/auth/callback?${params.toString()}`);
  }, [pathname, router, searchParams]);

  return null;
}
