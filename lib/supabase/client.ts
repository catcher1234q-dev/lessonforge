import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;
let passwordlessBrowserClient: SupabaseClient | null = null;

function hasNonPlaceholderValue(value?: string | null, placeholders: string[] = []) {
  if (!value) {
    return false;
  }

  if (value.includes("replace_me")) {
    return false;
  }

  return !placeholders.includes(value);
}

function isValidUrl(value: string) {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (typeof url !== "string" || typeof anonKey !== "string") {
    return null;
  }

  if (
    !hasNonPlaceholderValue(url, ["https://your-project-ref.supabase.co"]) ||
    !isValidUrl(url) ||
    !hasNonPlaceholderValue(anonKey, ["your-anon-key"])
  ) {
    return null;
  }

  return { url, anonKey };
}

export function hasSupabaseEnv() {
  return Boolean(getSupabaseConfig());
}

export function getSupabasePublicConfig() {
  return getSupabaseConfig();
}

export function getSupabaseBrowserClient() {
  if (browserClient) {
    return browserClient;
  }

  const config = getSupabaseConfig();

  if (!config) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  try {
    browserClient = createClient(config.url, config.anonKey, {
      auth: {
        flowType: "pkce",
      },
    });
  } catch (error) {
    console.error(
      "[lessonforge:supabase-client] Browser client initialization failed.",
      error instanceof Error ? error.message : error,
    );
    throw error;
  }

  return browserClient;
}

export function getSupabasePasswordlessBrowserClient() {
  if (passwordlessBrowserClient) {
    return passwordlessBrowserClient;
  }

  const config = getSupabaseConfig();

  if (!config) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  try {
    passwordlessBrowserClient = createClient(config.url, config.anonKey, {
      auth: {
        flowType: "implicit",
      },
    });
  } catch (error) {
    console.error(
      "[lessonforge:supabase-passwordless-client] Browser client initialization failed.",
      error instanceof Error ? error.message : error,
    );
    throw error;
  }

  return passwordlessBrowserClient;
}
