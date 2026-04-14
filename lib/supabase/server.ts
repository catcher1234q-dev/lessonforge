import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type SupabaseServerConfig = {
  url: string;
  anonKey: string;
  serviceRoleKey: string;
};

let adminClient: SupabaseClient | null = null;

function getSupabaseServerConfig(): SupabaseServerConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anonKey || !serviceRoleKey) {
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

