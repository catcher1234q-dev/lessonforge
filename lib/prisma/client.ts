import { PrismaClient } from "@prisma/client";
import {
  describePersistenceStatus,
  getExpectedPrismaEnabled,
} from "@/lib/lessonforge/persistence-status-view";

declare global {
  // eslint-disable-next-line no-var
  var __lessonforgePrisma__: PrismaClient | undefined;
}

function hasRealDatabaseUrl() {
  const value = process.env.DATABASE_URL;

  if (!value) {
    return false;
  }

  return !value.includes("USER:PASSWORD@localhost:5432/lessonforge");
}

export function getPersistenceMode() {
  const mode = process.env.LESSONFORGE_PERSISTENCE_MODE;

  if (mode === "json" || mode === "prisma") {
    return mode;
  }

  return "auto";
}

export function getPersistenceStatus() {
  const mode = getPersistenceMode();
  const hasDatabaseUrl = hasRealDatabaseUrl();
  const prismaEnabled = isPrismaPersistenceEnabled();

  return describePersistenceStatus({
    mode,
    hasRealDatabaseUrl: hasDatabaseUrl,
    prismaEnabled,
  });
}

export function isPrismaPersistenceEnabled() {
  const mode = getPersistenceMode();
  return getExpectedPrismaEnabled({
    mode,
    hasRealDatabaseUrl: hasRealDatabaseUrl(),
  });
}

export const prisma =
  global.__lessonforgePrisma__ ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.__lessonforgePrisma__ = prisma;
}
