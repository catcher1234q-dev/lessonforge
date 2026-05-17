## Subject

Prisma Migrate baseline blocked by Supavisor advisory lock on port 5432 connection

## Support Message

Hi Supabase support,

I am using Prisma Migrate with Supabase Postgres and I am trying to finalize a baseline migration for an existing database without resetting data.

## Issue summary

Prisma baseline finalization fails with:

```text
P1002
Timed out trying to acquire a postgres advisory lock
SELECT pg_advisory_lock(72707369)
```

## Current connection setup

Secrets redacted:

- Runtime pooled connection:
  - `postgresql://postgres.<project-ref>…@aws-1-us-east-1.pooler.supabase.com:6543/postgres`
- Current direct migration connection:
  - `postgresql://postgres…@db.nhdlsdihxvoxzdizvjub.supabase.co:5432/postgres`

## Advisory lock holder details

I previously found a live holder for Prisma advisory lock `72707369`:

- `objid: 72707369`
- `mode: ExclusiveLock`
- `granted: true`
- `pid: 1134472`
- `application_name: Supavisor`
- `state: idle`
- `last visible query: COMMIT`

On a later read-only recheck, the holder was not visible, so the lock issue may be intermittent or retry-triggered.

## Current migration state

- Backup exists:
  - `/tmp/lessonforge-db-backup-20260428-135627`
- Baseline migration file exists:
  - `prisma/migrations/0_init/migration.sql`
- `_prisma_migrations` does not exist yet
- `Product.tags` exists in the database

## What has already been attempted

- validated Prisma schema
- generated Prisma client
- created a baseline migration from the current schema
- retried `npx prisma migrate resolve --applied 0_init`
- stopped local Next/Prisma processes before retrying
- retried with `DATABASE_URL` forced to the direct connection
- retried once with Prisma advisory-lock disabling enabled

Result:
- `_prisma_migrations` was still not created
- baseline was still not marked applied

## What has not been attempted

- no manual insert into `_prisma_migrations`
- no `prisma migrate reset`
- no destructive SQL
- no table drops
- no data deletion

## Questions

1. Can the Supavisor session holding advisory lock `72707369` be safely terminated?
2. Should Prisma Migrate use `db.<project>.supabase.co:5432` or the Supavisor session pooler URL on port `5432`?
3. What is the exact migration-safe connection format for this project?
4. Is Supavisor expected to retain a Prisma advisory lock while idle after `COMMIT`?
5. Is there a recommended Supabase-side way to clear this lock safely?

## Planned next step after your reply

Once you confirm the correct migration-safe connection path and whether the lock holder can be safely cleared, I will retry only:

- `npx prisma migrate resolve --applied 0_init`
- `npx prisma migrate status`

Thank you.
