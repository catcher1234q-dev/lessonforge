export type PersistenceStatusDescriptorInput = {
  mode: "auto" | "json" | "prisma";
  hasRealDatabaseUrl: boolean;
  prismaEnabled: boolean;
};

export function getExpectedPrismaEnabled({
  mode,
  hasRealDatabaseUrl,
}: Omit<PersistenceStatusDescriptorInput, "prismaEnabled">) {
  if (mode === "json") {
    return false;
  }

  if (mode === "prisma") {
    return true;
  }

  return hasRealDatabaseUrl;
}

export function describePersistenceStatus({
  mode,
  hasRealDatabaseUrl,
  prismaEnabled,
}: PersistenceStatusDescriptorInput) {
  if (mode === "prisma") {
    return {
      mode,
      prismaEnabled,
      label: "Prisma mode",
      detail:
        "The app is expected to use Prisma only. Database errors will not silently fall back to local JSON storage.",
    };
  }

  if (mode === "json") {
    return {
      mode,
      prismaEnabled,
      label: "Local JSON mode",
      detail:
        "The app is intentionally running on local JSON storage instead of Prisma.",
    };
  }

  if (hasRealDatabaseUrl) {
    return {
      mode,
      prismaEnabled,
      label: "Auto mode using Prisma",
      detail:
        "Auto mode detected a real database URL, so the app is using the Prisma persistence path.",
    };
  }

  return {
    mode,
    prismaEnabled,
    label: "Auto mode using local JSON",
    detail:
      "Auto mode did not find a real database URL, so the app is currently using local JSON storage.",
  };
}
