import { PrismaClient } from "@prisma/client";

const PLACEHOLDER_DATABASE_URL = "USER:PASSWORD@localhost:5432/lessonforge";

declare global {
  // eslint-disable-next-line no-var
  var __lessonforgePrisma__: PrismaClient | undefined;
}

function getDatabaseUrl() {
  return process.env.DATABASE_URL?.trim() ?? "";
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
  if (!hasRealDatabaseUrl()) {
    return createUnavailablePrismaClient(
      "Prisma is unavailable because DATABASE_URL is missing or still using the local placeholder value.",
    );
  }

  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error"] : ["error"],
  });
}

export const prisma = global.__lessonforgePrisma__ ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.__lessonforgePrisma__ = prisma;
}
