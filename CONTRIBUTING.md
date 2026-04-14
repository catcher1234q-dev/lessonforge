# Contributing

Thanks for contributing to LessonForge.

## Before You Open A PR

Choose the smallest verification command that matches the change:

- Shared logic or server-side changes: `npm run verify:contracts`
- Buyer, seller, admin, or founder-facing UI flow changes: `npm run verify:focused`
- Broader handoff or release-confidence pass: `npm run verify:app`
- Founder/admin persistence or live database work: `npm run verify:persistence:ops` and then `npm run prisma:cutover-check`

## Recommended PR Hygiene

- Keep changes scoped to one feature, fix, or verification pass when possible.
- Prefer updating or adding focused coverage when behavior changes.
- If you touch seller, buyer, admin, or persistence flows, mention which verification command you ran.
- If browser verification required running outside the sandbox, say that explicitly in the handoff note.

## Verification References

- Contributor-facing checklist: [docs/verification-checklist.md](/Users/mikhailtripp/Documents/New%20project/docs/verification-checklist.md)
- Release and handoff guide: [docs/release-handoff-checklist.md](/Users/mikhailtripp/Documents/New%20project/docs/release-handoff-checklist.md)
- Founder review guidance: [docs/founder-review-checklist.md](/Users/mikhailtripp/Documents/New%20project/docs/founder-review-checklist.md)
- Database cutover guidance: [docs/database-bootstrap.md](/Users/mikhailtripp/Documents/New%20project/docs/database-bootstrap.md)

## Suggested Default

When in doubt:

1. Run `npm run verify:contracts`.
2. Run `npm run verify:focused` if the change touched user-visible flows.
3. Run `npm run verify:app` before a bigger handoff.
