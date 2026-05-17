# Supabase Prisma Baseline Lock Support Package

## Summary

We prepared a Prisma baseline for an existing LessonForge database, but could not finalize it because Prisma Migrate timed out trying to acquire its advisory lock.

This package captures the current state, what has already been attempted, and the exact questions to send to Supabase before any more migration work happens.

## Current State

- Backup exists:
  - `/tmp/lessonforge-db-backup-20260428-135627`
- Baseline migration exists:
  - [prisma/migrations/0_init/migration.sql](/Users/mikhailtripp/Documents/New%20project/prisma/migrations/0_init/migration.sql)
- Archived pre-baseline migrations exist:
  - [prisma/migrations_archive_prebaseline_20260428135643/](/Users/mikhailtripp/Documents/New%20project/prisma/migrations_archive_prebaseline_20260428135643/)
- Prisma schema validates successfully.
- Prisma Client generates successfully.
- `_prisma_migrations` does not exist yet.
- `public."Product"."tags"` exists in the database.

## Redacted Connection Shapes

- Runtime pooled URL:
  - `postgresql://postgres.<project-ref>…@aws-1-us-east-1.pooler.supabase.com:6543/postgres`
- Direct migration URL currently configured:
  - `postgresql://postgres…@db.nhdlsdihxvoxzdizvjub.supabase.co:5432/postgres`

## Prisma Config Behavior

Relevant config:
- [prisma.config.ts](/Users/mikhailtripp/Documents/New%20project/prisma.config.ts)

Notes:
- Prisma loads both `.env` and `.env.local`
- runtime `DATABASE_URL` is normalized for Supabase pooler usage
- Prisma `directUrl` is configured separately

## Exact Prisma Error

Observed when attempting:

```bash
npx prisma migrate resolve --applied 0_init
```

Error:

```text
P1002
Timed out trying to acquire a postgres advisory lock
SELECT pg_advisory_lock(72707369)
```

## Advisory Lock Findings

### Earlier observed live lock holder

We previously found a live holder for Prisma advisory lock `72707369`:

- `objid: 72707369`
- `mode: ExclusiveLock`
- `granted: true`
- `pid: 1134472`
- `application_name: Supavisor`
- `state: idle`
- `last visible query: COMMIT`

### Current recheck

Latest read-only recheck found:

- advisory lock rows for `72707369`: none
- advisory lock holder rows: none

Interpretation:
- the blocker may be intermittent
- or the lock may be reacquired only during Prisma Migrate attempts
- or the connection path may still be interacting badly with Supavisor even when the lock is not visibly present at inspection time

## Read-Only Database State Checks

Confirmed:
- `_prisma_migrations` exists: `false`
- `Product.tags` exists: `true`

## Commands Already Attempted

Safe preparation steps already completed:

```bash
npm run prisma:validate
npm run prisma:generate
```

Baseline preparation already completed:

```bash
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/0_init/migration.sql
```

Migration-history finalization attempts that failed:

```bash
npx prisma migrate resolve --applied 0_init
```

Also attempted:
- retry with local app/db consumers stopped
- retry after terminating one stale advisory-lock holder
- retry with `DATABASE_URL` forced to `DIRECT_URL`
- retry with `PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK=1`

Result:
- `_prisma_migrations` still not created
- baseline still not marked applied

## What Has Not Been Attempted

Intentionally not attempted:
- manual insert into `_prisma_migrations`
- `prisma migrate reset`
- destructive SQL
- dropping tables
- deleting data
- forcing schema changes beyond the already-approved additive `tags` column

## Questions For Supabase Support

1. Can the Supavisor session holding advisory lock `72707369` be safely terminated?
2. Should Prisma Migrate use `db.<project>.supabase.co:5432` or the Supavisor session pooler URL on port `5432`?
3. What is the exact migration-safe connection format for this project?
4. Is Supavisor expected to retain a Prisma advisory lock while idle after `COMMIT`?
5. Is there a recommended Supabase-side way to clear this lock safely?

## Draft Support Message

```text
I am using Prisma Migrate with Supabase Postgres.

My runtime DATABASE_URL uses the Supabase pooler:
aws-1-us-east-1.pooler.supabase.com:6543

My current DIRECT_URL uses:
db.nhdlsdihxvoxzdizvjub.supabase.co:5432

I prepared a Prisma baseline migration for an existing database, but Prisma baseline finalization fails with:

P1002
Timed out trying to acquire a postgres advisory lock:
SELECT pg_advisory_lock(72707369)

I previously found a live holder for Prisma’s advisory lock:

Lock:
objid: 72707369
mode: ExclusiveLock
granted: true

Holder:
pid: 1134472
application_name: Supavisor
state: idle
last visible query: COMMIT

I also confirmed:
- _prisma_migrations does not exist yet
- Product.tags exists
- local Next/Prisma processes were stopped before retrying

Can you confirm:
1. Whether this Supavisor session can be safely terminated
2. Whether Prisma Migrate should use db.<project>.supabase.co:5432 or the session-mode pooler URL on port 5432
3. The exact migration-safe connection format for this project
4. Whether Supavisor is expected to retain Prisma advisory lock 72707369 while idle
5. Whether there is a Supabase-side recommended way to clear this lock safely
```

## Proposed Next Steps After Supabase Replies

1. Confirm the exact migration-safe connection string they recommend.
2. If Supabase approves it, terminate only the exact stale lock holder they say is safe to terminate.
3. Retry only:
   - `npx prisma migrate resolve --applied 0_init`
   - `npx prisma migrate status`
4. Verify:
   - `_prisma_migrations` exists
   - `0_init` is recorded as applied
   - Prisma migration status is healthy
5. Do not do any additional schema work until those checks pass.
