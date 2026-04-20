import { PrismaClient } from "@prisma/client";

const PLACEHOLDER_DATABASE_URL = "USER:PASSWORD@localhost:5432/lessonforge";
const PRISMA_RUNTIME_URL_ENV_KEYS = ["DATABASE_URL", "POSTGRES_PRISMA_URL", "POSTGRES_URL"] as const;

declare global {
  // eslint-disable-next-line no-var
  var __lessonforgePrisma__: PrismaClient | undefined;
}

type DatabaseEnv = Partial<Record<string, string | undefined>>;

function readDatabaseUrl(
  env: DatabaseEnv,
  keys: readonly string[],
): { value: string; source: string } | null {
  for (const key of keys) {
    const value = env[key]?.trim();

    if (value) {
      return {
        value,
        source: key,
      };
    }
  }

  return null;
}

function isSupabasePoolerUrl(databaseUrl: string) {
  try {
    const url = new URL(databaseUrl);
    return url.hostname.includes(".pooler.supabase.com");
  } catch {
    return false;
  }
}

export function normalizePrismaRuntimeDatabaseUrl(databaseUrl: string) {
  if (!databaseUrl || !isSupabasePoolerUrl(databaseUrl)) {
    return databaseUrl;
  }

  try {
    const url = new URL(databaseUrl);

    if (!url.searchParams.has("pgbouncer")) {
      url.searchParams.set("pgbouncer", "true");
    }

    return url.toString();
  } catch {
    return databaseUrl;
  }
}

export function getRuntimeDatabaseUrl(env: DatabaseEnv = process.env) {
  const resolved = readDatabaseUrl(env, PRISMA_RUNTIME_URL_ENV_KEYS);

  if (!resolved) {
    return {
      value: "",
      source: "DATABASE_URL",
    };
  }

  return {
    value: normalizePrismaRuntimeDatabaseUrl(resolved.value),
    source: resolved.source,
  };
}

export function hasRealDatabaseUrl(databaseUrl = getRuntimeDatabaseUrl().value) {
  return Boolean(databaseUrl) && !databaseUrl.includes(PLACEHOLDER_DATABASE_URL);
}

function createUnavailablePrismaClient(message: string) {
  return new Proxy({} as PrismaClient, {
    get() {
      throw new Error(message);
    },
  });
}

function createPrismaClient() {
  const { value: databaseUrl, source } = getRuntimeDatabaseUrl();

  if (!hasRealDatabaseUrl(databaseUrl)) {
    return createUnavailablePrismaClient(
      "Prisma is unavailable because DATABASE_URL is missing or still using the local placeholder value.",
    );
  }

  const host = (() => {
    try {
      return new URL(databaseUrl).host;
    } catch {
      return "unknown";
    }
  })();

  if (process.env.NODE_ENV !== "production") {
    console.info("[lessonforge.db] Prisma runtime datasource selected", {
      source,
      host,
      pooled: isSupabasePoolerUrl(databaseUrl),
    });
  }

  return new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
    log: process.env.NODE_ENV === "development" ? ["error"] : [],
  });
}

export const prisma = global.__lessonforgePrisma__ ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.__lessonforgePrisma__ = prisma;
}
