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

export function readRememberedAuthNextPath() {
  if (typeof window === "undefined") {
    return "/";
  }

  return sanitizeAuthNextPath(
    window.localStorage.getItem(AUTH_REDIRECT_STORAGE_KEY),
  );
}

export function clearRememberedAuthNextPath() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(AUTH_REDIRECT_STORAGE_KEY);
}
