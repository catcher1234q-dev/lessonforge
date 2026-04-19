import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { config as loadEnv } from "dotenv";
import { defineConfig, env } from "prisma/config";

for (const fileName of [".env", ".env.local"]) {
  const filePath = resolve(process.cwd(), fileName);

  if (existsSync(filePath)) {
    loadEnv({
      path: filePath,
      override: fileName === ".env.local",
    });
  }
}

function normalizePrismaRuntimeDatabaseUrl(databaseUrl: string) {
  try {
    const url = new URL(databaseUrl);

    if (url.hostname.includes(".pooler.supabase.com") && !url.searchParams.has("pgbouncer")) {
      url.searchParams.set("pgbouncer", "true");
    }

    return url.toString();
  } catch {
    return databaseUrl;
  }
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "node --import tsx prisma/seed.ts",
  },
  engine: "classic",
  datasource: {
    url: normalizePrismaRuntimeDatabaseUrl(env("DATABASE_URL")),
    directUrl: env("DIRECT_URL"),
  },
});
