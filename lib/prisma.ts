import { PrismaClient } from "@prisma/client";

const PLACEHOLDER_DATABASE_URL = "USER:PASSWORD@localhost:5432/lessonforge";

declare global {
  // eslint-disable-next-line no-var
  var __lessonforgePrisma__: PrismaClient | undefined;
}

const DATABASE_URL_ENV_KEYS = [
  "POSTGRES_PRISMA_URL",
  "DATABASE_URL",
  "POSTGRES_URL",
  "DIRECT_URL",
] as const;

function getDatabaseUrl() {
  for (const key of DATABASE_URL_ENV_KEYS) {
    const value = process.env[key]?.trim();

    if (value) {
      return value;
    }
  }

  return "";
}

function getDatabaseUrlSource() {
  for (const key of DATABASE_URL_ENV_KEYS) {
    const value = process.env[key]?.trim();

    if (value) {
      return key;
    }
  }

  return "DATABASE_URL";
}

export function hasRealDatabaseUrl(databaseUrl = getDatabaseUrl()) {
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
  const databaseUrl = getDatabaseUrl();

  if (!hasRealDatabaseUrl(databaseUrl)) {
    return createUnavailablePrismaClient(
      "Prisma is unavailable because DATABASE_URL is missing or still using the local placeholder value.",
    );
  }

  const source = getDatabaseUrlSource();
  const host = (() => {
    try {
      return new URL(databaseUrl).host;
    } catch {
      return "unknown";
    }
  })();

  console.info("[lessonforge.db] Prisma runtime datasource selected", {
    source,
    host,
  });

  return new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
    log: process.env.NODE_ENV === "development" ? ["error"] : ["error"],
  });
}

export const prisma = global.__lessonforgePrisma__ ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.__lessonforgePrisma__ = prisma;
}
