# Verification Checklist

Use this quick guide to choose the right local verification command before handing work to someone else.

## Everyday feature work

Run this before opening a normal feature PR that mostly touches shared logic or server-side behavior:

```bash
npm run verify:contracts
```

This covers:
- typecheck
- focused unit and contract coverage for persistence, cutover, moderation guidance, remediation focus, workflow rules, product validation, and related helpers

## UI and flow changes

Run this before handing off changes that touch buyer, seller, admin, or persistence UI flows:

```bash
npm run verify:focused
```

This covers:
- typecheck
- the focused browser suite in `tests/e2e/seller-admin.spec.ts`

## Broader app-confidence pass

Run this before a bigger handoff, release-confidence pass, or when you want both the shared logic layer and the focused browser flows checked together:

```bash
npm run verify:app
```

This covers:
- `npm run verify:contracts`
- `npm run verify:browser:focused`

## Live database and persistence prep

Run this before founder/admin persistence work or any live Prisma cutover attempt:

```bash
npm run verify:persistence:ops
npm run prisma:cutover-check
```

This covers:
- persistence-prep contracts
- focused founder/admin persistence browser checks
- the guided Prisma cutover status

## Suggested default

When in doubt:

1. Run `npm run verify:contracts` for ordinary code changes.
2. Run `npm run verify:focused` if the change touched user flows.
3. Run `npm run verify:app` before a broader handoff.
4. Run `npm run verify:persistence:ops` plus `npm run prisma:cutover-check` before real database work.

For a broader release-style handoff, use [docs/release-handoff-checklist.md](/Users/mikhailtripp/Documents/New%20project/docs/release-handoff-checklist.md).
