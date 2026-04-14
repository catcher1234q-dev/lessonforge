# Release Handoff Checklist

Use this checklist before a broader handoff, release-confidence pass, or founder review round.

## 1. Run The Right Verification

Choose the highest relevant verification command for the work:

- Shared logic only: `npm run verify:contracts`
- UI flow changes: `npm run verify:focused`
- Broader app handoff: `npm run verify:app`
- Persistence or live database prep: `npm run verify:persistence:ops` and `npm run prisma:cutover-check`

## 2. Check The Main Product Surfaces

Before handoff, make sure these are still behaving the way the project expects:

- Seller dashboard and remediation flows
- Admin moderation continuity
- Buyer marketplace, storefront, shortlist, checkout-preview, and library flows
- Founder/admin persistence status and cutover surfaces

## 3. Capture Anything Special In The Handoff Note

Call out:

- which verification command you ran
- whether browser verification had to run outside the sandbox
- any known follow-up work
- any intentionally deferred issues or infrastructure blockers

## 4. Founder Review Prep

If the handoff is founder-facing:

- run `npm run verify:focused` at minimum
- use [docs/founder-review-checklist.md](/Users/mikhailtripp/Documents/New%20project/docs/founder-review-checklist.md)
- keep the handoff note focused on wording, trust, clarity, and launch readiness

## 5. Database Work

If the handoff involves real Prisma or persistence work:

- run `npm run verify:persistence:ops`
- run `npm run prisma:cutover-check`
- use [docs/database-bootstrap.md](/Users/mikhailtripp/Documents/New%20project/docs/database-bootstrap.md)

## 6. Payments And Payouts

Before a founder-facing launch handoff that involves real money movement:

- confirm `STRIPE_SECRET_KEY` is not a placeholder
- confirm `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is set
- confirm `STRIPE_WEBHOOK_SECRET` is set
- confirm `STRIPE_CONNECT_WEBHOOK_SECRET` is set
- confirm seller onboarding opens a real Stripe Connect onboarding link
- confirm checkout uses real Stripe Checkout instead of the preview fallback
- confirm a successful checkout returns the buyer into the library flow
- confirm Stripe sends `checkout.session.completed` to `/api/stripe/webhook`
- confirm that webhook creates one buyer order record without duplicates

## 7. Vercel Launch Setup

If the handoff involves a hosted preview or launch prep on Vercel:

- use [docs/vercel-launch-setup.md](/Users/mikhailtripp/Documents/New%20project/docs/vercel-launch-setup.md)
- confirm `NEXT_PUBLIC_APP_URL` matches the Vercel URL
- confirm `LESSONFORGE_ACCESS_COOKIE_SECRET` is not a placeholder
- confirm Supabase keys are set
- confirm owner access codes are set
- confirm Stripe keys and webhook secrets are set before treating checkout as live
