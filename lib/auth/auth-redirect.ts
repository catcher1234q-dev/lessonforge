import { env } from "@/lib/config/env";
import { siteConfig } from "@/lib/config/site";

const AUTH_REDIRECT_STORAGE_KEY = "lessonforge-auth-next-path";

export function sanitizeAuthNextPath(nextPath: string | null | undefined) {
  if (!nextPath || !nextPath.startsWith("/")) {
    return "/";
  }

  if (nextPath.startsWith("//")) {
    return "/";
  }

  return nextPath;
}

export function rememberAuthNextPath(nextPath: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    AUTH_REDIRECT_STORAGE_KEY,
    sanitizeAuthNextPath(nextPath),
  );
}

export function readRememberedAuthNextPath(fallback = "/") {
  if (typeof window === "undefined") {
    return fallback;
  }

  const storedValue = window.localStorage.getItem(AUTH_REDIRECT_STORAGE_KEY);

  return storedValue ? sanitizeAuthNextPath(storedValue) : fallback;
}

export function clearRememberedAuthNextPath() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(AUTH_REDIRECT_STORAGE_KEY);
}

export function hasSupabasePkceCodeVerifier() {
  if (typeof window === "undefined") {
    return false;
  }

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);

    if (!key || !key.endsWith("-code-verifier")) {
      continue;
    }

    if (window.localStorage.getItem(key)) {
      return true;
    }
  }

  return false;
}

function normalizeOrigin(candidate: string) {
  try {
    return new URL(candidate).origin;
  } catch {
    return siteConfig.productionUrl;
  }
}

export function getClientAuthOrigin() {
  const isProduction = process.env.NODE_ENV === "production";
  const fallbackOrigin = isProduction
    ? env.NEXT_PUBLIC_SITE_URL || siteConfig.productionUrl
    : env.NEXT_PUBLIC_SITE_URL || env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (typeof window === "undefined") {
    return normalizeOrigin(fallbackOrigin);
  }

  const browserOrigin = normalizeOrigin(window.location.origin);

  if (isProduction && browserOrigin.includes("localhost")) {
    return normalizeOrigin(fallbackOrigin);
  }

  return browserOrigin;
}

export function buildClientAuthCallbackUrl() {
  return `${getClientAuthOrigin()}/auth/callback`;
}

export function buildClientAuthResetPasswordUrl() {
  return `${getClientAuthOrigin()}/auth/reset-password`;
}
