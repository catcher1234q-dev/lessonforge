export { hasRealDatabaseUrl, prisma } from "@/lib/prisma";

import {
  describePersistenceStatus,
  getExpectedPrismaEnabled,
} from "@/lib/lessonforge/persistence-status-view";
import { hasRealDatabaseUrl } from "@/lib/prisma";

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
