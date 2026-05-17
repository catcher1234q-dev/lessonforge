# Prisma And Supabase Migration Safety

## Current State

LessonForge now has a Prisma baseline initialized for the current production-like database state.

Current confirmed state:

- `_prisma_migrations` exists.
- `0_init` is recorded as applied.
- The active local Prisma migrations folder contains only `0_init`.
- `public."Product"."tags"` exists.
- Runtime `DATABASE_URL` uses the Supabase transaction pooler on port `6543`.
- Migration commands must use `DIRECT_URL`, which points to the direct Supabase Postgres host on port `5432`.

## Connection Rules

Use `DIRECT_URL` for all Prisma migration commands.

Do not use the Supabase transaction pooler on port `6543` for migrations. That pooler is for runtime/serverless app traffic, not schema work.

It is okay for the app runtime `DATABASE_URL` to keep using the pooler. The important rule is to override `DATABASE_URL` with `DIRECT_URL` when running Prisma migration commands.

## Known Prisma Tooling Behavior

`npx prisma migrate status` may connect through `DIRECT_URL` and then stall after printing datasource information in this Supabase setup.

If that happens, do not assume the migration history is broken. Stop the command safely and verify the database state directly with read-only checks against:

- `_prisma_migrations`
- `information_schema.columns`
- expected table/column names

`npx prisma migrate diff` may fail with Prisma `P4002` because this Supabase database includes cross-schema references, such as `public.profiles` pointing to `auth.users`.

Do not assume `P4002` means app schema drift by itself. Treat it as an introspection limitation unless a direct database check proves a real mismatch.

## Future Schema Change Checklist

Before future schema changes:

1. Confirm there is a fresh database backup or snapshot.
2. Stop local app processes that may hold database sessions.
3. Check for Prisma advisory lock holders before running migration commands.
4. Use the direct migration URL only:

```bash
DATABASE_URL="$DIRECT_URL" npx prisma migrate status
```

5. If `migrate status` stalls, stop it safely and verify migration history directly.
6. Create and apply migrations only through the direct connection path.
7. Run validation before considering the work complete.

## Safe Command Checklist

Use this pattern for migration health checks and future schema work:

```bash
DATABASE_URL="$DIRECT_URL" npx prisma migrate status
```

Direct database verification examples:

```sql
select migration_name, finished_at
from public."_prisma_migrations"
order by finished_at asc nulls last;
```

```sql
select exists (
  select 1
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'Product'
    and column_name = 'tags'
) as product_tags_exists;
```

```sql
select a.pid, a.application_name, a.state, a.query, l.mode, l.granted, l.objid
from pg_locks l
join pg_stat_activity a on a.pid = l.pid
where l.locktype = 'advisory'
  and l.objid = 72707369;
```

Validation commands:

```bash
npm run prisma:validate
npm run prisma:generate
npm run typecheck
npm run build
git diff --check
```

## Safety Rules

Never run:

- `prisma migrate reset`
- destructive SQL
- table drops
- manual `_prisma_migrations` inserts unless explicitly approved as a one-off database operations task

When Prisma tooling behaves strangely, pause and verify the database directly before making changes. The goal is boring, repeatable migrations, not clever migration heroics.
