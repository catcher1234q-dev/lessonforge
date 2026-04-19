import assert from "node:assert/strict";
import test from "node:test";

import {
  getRuntimeDatabaseUrl,
  hasRealDatabaseUrl,
  normalizePrismaRuntimeDatabaseUrl,
} from "@/lib/prisma";

test("runtime Prisma selection prefers explicit DATABASE_URL over legacy POSTGRES vars", () => {
  const result = getRuntimeDatabaseUrl({
    DATABASE_URL: "postgresql://supabase-user:secret@db.lessonforge.supabase.co:5432/postgres",
    POSTGRES_PRISMA_URL: "postgresql://wrong-user:secret@old-host.vercel-storage.com:5432/postgres",
    POSTGRES_URL: "postgresql://wrong-user:secret@old-host.vercel-storage.com:5432/postgres",
    DIRECT_URL: "postgresql://direct-user:secret@db.lessonforge.supabase.co:5432/postgres",
  });

  assert.equal(
    result.value,
    "postgresql://supabase-user:secret@db.lessonforge.supabase.co:5432/postgres",
  );
  assert.equal(result.source, "DATABASE_URL");
});

test("runtime Prisma selection never uses DIRECT_URL as the app datasource", () => {
  const result = getRuntimeDatabaseUrl({
    DIRECT_URL: "postgresql://direct-user:secret@db.lessonforge.supabase.co:5432/postgres",
  });

  assert.equal(result.value, "");
  assert.equal(result.source, "DATABASE_URL");
  assert.equal(hasRealDatabaseUrl(result.value), false);
});

test("Supabase pooled runtime URLs are normalized to disable prepared statements", () => {
  const normalized = normalizePrismaRuntimeDatabaseUrl(
    "postgresql://postgres.project-ref:secret@aws-0-us-east-1.pooler.supabase.com:6543/postgres",
  );
  const parsed = new URL(normalized);

  assert.equal(parsed.hostname, "aws-0-us-east-1.pooler.supabase.com");
  assert.equal(parsed.searchParams.get("pgbouncer"), "true");
});

test("existing pgbouncer query parameter is preserved", () => {
  const normalized = normalizePrismaRuntimeDatabaseUrl(
    "postgresql://postgres.project-ref:secret@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connect_timeout=15",
  );
  const parsed = new URL(normalized);

  assert.equal(parsed.searchParams.get("pgbouncer"), "true");
  assert.equal(parsed.searchParams.get("connect_timeout"), "15");
});
