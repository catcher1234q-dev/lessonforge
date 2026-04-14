# Database Bootstrap Guide

## What This Is
This guide explains how LessonForge moves from demo-mode data into a real Postgres database.

In simple terms:
- demo mode stores marketplace activity in a local JSON file
- Prisma mode stores that same activity in Postgres

The app now supports both paths so we can keep the local founder demo easy while also preparing for a launch-ready setup.

## When To Use Each Mode
Use demo JSON mode when:
- you are reviewing screens locally
- you want fast demo data without any database setup
- you are sharing the product flow internally

Use Prisma and Postgres when:
- you want real saved records
- you want durable product, order, review, and refund data
- you are preparing for Stripe, auth, and production hardening

## The One Setting That Controls This
LessonForge uses `LESSONFORGE_PERSISTENCE_MODE`.

Options:
- `json`: always use the local demo file store
- `auto`: use Prisma only when `DATABASE_URL` is real, otherwise fall back to demo JSON
- `prisma`: always use Prisma

Recommended default for now:
- `auto`

That gives you the safest behavior while the app is still in active build mode.

Important behavior:
- `auto` is forgiving and can still fall back to demo JSON when the database path is not ready
- `prisma` is strict and should be treated like a real cutover mode
- when `LESSONFORGE_PERSISTENCE_MODE=prisma`, Prisma failures are no longer silently masked by a JSON fallback

## Step By Step Setup
### 1. Add a real database URL
Update `.env.local` with a real Postgres connection string:

```bash
DATABASE_URL=postgresql://username:password@host:5432/lessonforge
LESSONFORGE_PERSISTENCE_MODE=auto
```

Why `auto` first:
- it matches the default in `.env.example`
- it keeps the app usable while the database path is still being verified
- it lets `npm run prisma:cutover-check` tell you when it is safe to switch to strict `prisma`

### 2. Generate the Prisma client
```bash
npm run prisma:generate
```

### 3. Run the migration
```bash
npm run prisma:migrate
```

This creates the tables in your database.

### 4. Seed starter data
```bash
npm run prisma:seed
```

This loads:
- starter standards
- demo users
- starter marketplace products

### 5. Optional: import current demo JSON data
If you already created products and orders in demo mode and want to bring them into Postgres too:

```bash
npm run prisma:import-demo
```

### 6. Run the guided cutover check
Once the database is ready, start with:

```bash
npm run verify:persistence
npm run verify:persistence:ops
npm run prisma:cutover-check
```

Use `npm run verify:persistence` first when you want a quick local confidence check before touching the live database path. It verifies the persistence-prep layer without requiring a real Postgres connection.

Use `npm run verify:persistence:ops` when you want the stronger pre-cutover check. It adds the focused founder/admin browser flow on top of the contract tests, so the top-nav badge, cutover cards, and live persistence card are all verified before the first strict Prisma run.

Verification ladder before a live database attempt:
- Use `npm run verify:contracts` when you want a fast non-browser shared-contract check.
- Use `npm run verify:focused` when you want a broader app-health pass across seller, admin, buyer, and persistence browser flows.
- Use `npm run verify:persistence:ops` right before the real cutover when founder/admin persistence surfaces need to be explicitly green.

Recommended handoff for database-related work:
- Before opening a normal non-database PR, `npm run verify:contracts` is usually enough.
- Before handing off UI changes that touch seller, buyer, admin, or persistence flows, run `npm run verify:focused`.
- Before a broader release-confidence pass, run `npm run verify:app`.
- Before a real database cutover attempt, run `npm run verify:persistence:ops` and then `npm run prisma:cutover-check`.

That same command now appears first in the live founder/admin persistence runbook, so the in-product guidance and the docs stay aligned.

This command:
- runs the preflight contract first
- checks whether `DATABASE_URL` is real
- checks whether strict Prisma mode is selected
- tests whether Prisma can reach the database
- stops with the exact next command when the cutover is still blocked
- automatically continues into seller-flow verification once the environment is ready
- returns the same shared action list used by the founder/admin cutover cards

The guided output now shows:
- the cutover stage
- the stage headline and stage meaning
- a plain-language summary
- short detail lines explaining the current state
- the recommended next command
- a step-by-step action list with `done`, `next`, and `blocked` statuses
- an inline meaning for each action-item status

How to read the cutover stage:
- `preflight-blocked`: the app is still missing a required database or Prisma setup condition
- `ready-for-verification`: setup is ready and the next live step is the seller-flow verification
- `verification-passed`: the first strict Prisma verification run succeeded
- `verification-failed`: Prisma was reachable, but the live verification still found a persistence-path problem

How to read the action list:
- `done`: already satisfied
- `next`: run this now
- `blocked`: waiting on an earlier prerequisite

If you want the lower-level commands individually, use:

```bash
npm run prisma:preflight
npm run prisma:verify-seller-flow
```

The seller-flow verification command:
- forces strict `LESSONFORGE_PERSISTENCE_MODE=prisma`
- saves a temporary seller profile through the shared repository layer
- saves a temporary seller product through the shared repository layer
- reloads both records to confirm the Prisma path is actually working
- cleans up the temporary verification records afterward

## What Data Moves First
The Prisma seed/import path is built to support the current working MVP flows:
- seller profiles
- products
- orders
- reviews
- refund requests
- subscriptions
- AI usage ledger

## What This Unlocks Next
Once Prisma is the active persistence path, the next big upgrades become much easier:
- real authentication and user accounts
- real Stripe checkout and payout records
- durable admin moderation history
- actual test coverage against database-backed flows

## Prisma Readiness Checklist
Use this checklist before treating the database path as the primary production path:
- a real `DATABASE_URL` is set in `.env.local`
- `npm run prisma:cutover-check` succeeds or clearly advances to seller-flow verification
- `npm run prisma:generate` succeeds
- `npm run prisma:migrate` succeeds
- `npm run prisma:seed` succeeds
- seller profiles can save and reload through Prisma-backed persistence
- seller-created products can save and reload through Prisma-backed persistence
- `npm run prisma:verify-seller-flow` succeeds
- the app is switched to `LESSONFORGE_PERSISTENCE_MODE=prisma`
- any Prisma failure is treated as a real blocker, not hidden by a JSON fallback

## Common Setup Problems
### Prisma says `DATABASE_URL` is missing
That means `.env.local` does not have a real database connection string yet.

### The app still looks like demo mode
That usually means one of these is true:
- `LESSONFORGE_PERSISTENCE_MODE` is still `json`
- `DATABASE_URL` is still the placeholder value
- migrations were not run yet

### What the preflight command is for
Use:

```bash
npm run prisma:cutover-check
```

when you want a simple answer to:
- is the database configured
- is Prisma reachable
- is strict mode selected
- what exact step is blocking the first live cutover
- whether the repo is ready to continue into the seller-flow verification automatically

### Why strict Prisma mode is useful
Once you explicitly set:

```bash
LESSONFORGE_PERSISTENCE_MODE=prisma
```

the app should behave like a real database-backed product, not a forgiving demo.

That means:
- Prisma problems become visible immediately
- the app does not quietly drop back to JSON and hide the failure
- database setup issues are easier to catch before launch

### Why `auto` is useful
`auto` lets the app stay usable even when the database is not ready yet.

That means:
- founders can still review the product
- developers can turn on Postgres when needed
- the app does not break just because the database is not configured

## Founder Summary
You do not need to switch to Postgres just to review the website.

But when we want the app to become truly launch-ready, this database path is the bridge from a polished demo into a durable real product.
