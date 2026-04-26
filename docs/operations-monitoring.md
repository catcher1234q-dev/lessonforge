# Operations Monitoring

This document explains the safe monitoring setup for LessonForgeHub before launch.

The goal is simple:
- know quickly when the site breaks
- see auth and email trouble early
- review payment and dispute issues without unsafe automation
- keep the founder in control of money, seller, account, and legal decisions

## What This Setup Covers

LessonForgeHub now includes:
- a public health endpoint at `/api/health`
- a private founder monitoring page at `/founder/operations`
- optional Sentry wiring that stays inactive until a DSN is added

This setup does **not**:
- auto-refund buyers
- auto-ban sellers
- auto-delete products
- auto-change payouts
- auto-send support emails
- auto-write to Stripe, PayPal, or Supabase

## Recommended Public URLs To Monitor

Add these to Better Stack or UptimeRobot:

- `https://lessonforgehub.com`
- `https://lessonforgehub.com/marketplace`
- `https://lessonforgehub.com/support`
- `https://lessonforgehub.com/pricing`
- `https://lessonforgehub.com/api/health`

Recommended monitor rules:
- interval: every 5 minutes
- alert when 1 check fails for `/api/health`
- alert when 2 consecutive checks fail for public pages
- send alerts to founder email first

## Health Endpoint

Public route:
- `GET /api/health`

Response shape:

```json
{
  "status": "ok",
  "timestamp": "2026-04-26T18:00:00.000Z",
  "appName": "LessonForgeHub",
  "environment": "production",
  "version": {
    "commitSha": "abcdef1",
    "packageVersion": "0.1.0"
  }
}
```

It should never expose:
- secrets
- database URLs
- API keys
- user data
- stack traces

## Founder Monitoring Page

Private route:
- `/founder/operations`

This page is for the founder only. It should be used for:
- route health checks
- auth email setup review
- signup and support issue signals
- upload trouble signals
- seller onboarding friction
- dispute and refund drafting queues

AI may draft recommendations here, but founder approval is still required for:
- refunds
- seller removals
- account actions
- product takedowns
- payout changes
- legal or copyright decisions

## Better Stack Or UptimeRobot Setup

1. Create monitors for the public URLs listed above.
2. Use HTTPS checks, not ping-only checks.
3. Turn on email and mobile alerts.
4. Treat `/api/health` as the fastest “is the app alive?” check.
5. Treat homepage, marketplace, support, and pricing as customer-facing trust checks.

## Sentry Setup

Package installed:
- `@sentry/nextjs`

Environment variables:
- `SENTRY_DSN`
- `NEXT_PUBLIC_SENTRY_DSN`
- `SENTRY_AUTH_TOKEN` only if you later choose to upload source maps during build

Current behavior:
- if no DSN exists, Sentry stays off
- no DSN is hardcoded
- no private user data should be intentionally sent by default setup

Recommended founder setup:
1. Create a Sentry project for the Next.js app.
2. Add `SENTRY_DSN` to Vercel production env vars.
3. Add `NEXT_PUBLIC_SENTRY_DSN` only if you want client-side browser errors too.
4. Re-deploy after env vars are added.
5. Confirm a test frontend and backend error appears in Sentry before launch.

## Resend Or SMTP Email Logs

LessonForgeHub depends on reliable email for:
- signup confirmation
- magic link login
- password reset

Recommended setup:
1. Use custom SMTP in Supabase.
2. Keep domain email records healthy:
   - SPF
   - DKIM
   - DMARC
3. Check provider logs when reset or signup emails do not arrive.

Useful places to review:
- Resend logs if Resend is the SMTP provider
- Supabase Authentication logs
- founder monitoring page for auth setup warnings

## Supabase Logs

Use Supabase logs to review:
- auth delivery problems
- signup confirmation issues
- password reset attempts
- database connection failures
- API errors during launch week

Recommended founder habit:
- check auth logs first for email complaints
- check database logs first for route failures that are not obvious from uptime checks

## PayPal Visibility

Do not automate disputes or refunds.

Instead, review:
- PayPal webhook event history
- PayPal dispute dashboard
- founder operations dispute queue
- support inbox reports from buyers

Recommended founder checklist:
1. Confirm PayPal webhook deliveries are successful.
2. Check disputes daily during launch.
3. Draft responses inside the founder workflow before taking any money action.

## Manual Setup Still Required

Before launch, manually confirm:

- Better Stack or UptimeRobot monitors are live
- Sentry DSN is added in Vercel if you want production error tracking
- Supabase custom SMTP is configured
- sender domain records are healthy
- PayPal webhook events are visible and delivering

## Founder Review Next

Review these next:
- add the uptime monitors
- add the Sentry DSN when ready
- confirm custom SMTP and email records
- confirm PayPal webhook visibility
