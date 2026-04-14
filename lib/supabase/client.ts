import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  return { url, anonKey };
}

export function hasSupabaseEnv() {
  return Boolean(getSupabaseConfig());
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

  browserClient = createClient(config.url, config.anonKey, {
    auth: {
      flowType: "pkce",
    },
  });

  return browserClient;
}
