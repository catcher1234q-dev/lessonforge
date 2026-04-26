import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type SupabaseServerConfig = {
  url: string;
  anonKey: string;
  serviceRoleKey: string;
};

let adminClient: SupabaseClient | null = null;

type SupabaseCookie = {
  name: string;
  value: string;
  options?: {
    domain?: string;
    expires?: Date;
    sameSite?: boolean | "lax" | "strict" | "none";
    secure?: boolean;
    httpOnly?: boolean;
    maxAge?: number;
    path?: string;
  };
};

type SupabaseCookieAdapter = {
  getAll: () => Array<{ name: string; value: string }>;
  setAll?: (cookies: SupabaseCookie[]) => void;
};

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

function getSupabaseServerConfig(): SupabaseServerConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (
    typeof url !== "string" ||
    typeof anonKey !== "string" ||
    typeof serviceRoleKey !== "string"
  ) {
    return null;
  }

  if (
    !hasNonPlaceholderValue(url, ["https://your-project-ref.supabase.co"]) ||
    !isValidUrl(url) ||
    !hasNonPlaceholderValue(anonKey, ["your-anon-key"]) ||
    !hasNonPlaceholderValue(serviceRoleKey, ["your-service-role-key"])
  ) {
    return null;
  }

  return {
    url,
    anonKey,
    serviceRoleKey,
  };
}

export function hasSupabaseServerEnv() {
  return Boolean(getSupabaseServerConfig());
}

export function getSupabaseServerAdminClient() {
  if (adminClient) {
    return adminClient;
  }

  const config = getSupabaseServerConfig();

  if (!config) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, or SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  adminClient = createClient(config.url, config.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return adminClient;
}

export function createSupabaseServerAuthClient(cookieAdapter: SupabaseCookieAdapter) {
  const config = getSupabaseServerConfig();

  if (!config) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, or SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  return createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return cookieAdapter.getAll();
      },
      setAll(cookiesToSet) {
        cookieAdapter.setAll?.(cookiesToSet);
      },
    },
  });
}

export type { SupabaseCookie, SupabaseCookieAdapter };
