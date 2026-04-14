# LessonForge

LessonForge is a K-12 teacher marketplace where educators can create, upload, optimize, buy, and sell educational resources.

This repo is being shaped into a production-minded MVP with:
- plan-based revenue sharing
- strict AI cost controls
- Stripe and Stripe Connect Express support
- beginner-friendly documentation for a non-technical founder

## What This App Does
LessonForge supports:
- seller onboarding
- resource uploads and listings
- AI-assisted listing improvements
- standards tagging
- marketplace browsing and search
- checkout and buyer library
- subscription billing for AI features
- moderation, reports, and refunds
- demo mode for new users

## Current Working Product Areas
The current local MVP already includes:
- homepage and marketplace browse
- product detail pages with protected preview messaging
- seller storefronts
- shortlist / favorites
- seller onboarding and seller dashboard
- seller listing creation and remediation
- buyer library and protected demo delivery flow
- verified purchaser reviews
- refund requests and report triage
- admin moderation, audit logs, and owner controls
- AI plan controls, AI kill switch, and usage tracking
- founder-facing marketplace health summaries

## Current Direction
The existing app started as `TeachReady`. This repo is being aligned to the latest LessonForge founder prompt in phases so we can improve business rules and architecture without breaking working screens all at once.

## Tech Stack
Current and planned stack:
- Next.js App Router
- TypeScript
- Tailwind CSS
- Prisma
- PostgreSQL target database
- Stripe
- Stripe Connect Express

## Source Of Truth Plans
LessonForge now uses these plan definitions:

### Starter
- `$0/month`
- seller keeps `50%`
- platform keeps `50%`
- `5` one-time AI credits

### Basic
- `$19/month`
- seller keeps `60%`
- platform keeps `40%`
- `100` AI credits each billing cycle

### Pro
- `$39/month`
- seller keeps `70%`
- platform keeps `30%`
- `300` AI credits each billing cycle

Rules:
- credits reset each billing cycle when applicable
- unused credits expire
- no rollover
- no unlimited AI usage
- all AI usage enforced server-side

## Stripe In Simple Founder Language
Stripe is the payment system behind LessonForge.

We use Stripe in two ways:
- Stripe Checkout lets buyers pay safely
- Stripe Connect Express lets sellers complete payout onboarding and receive money

The amount a seller keeps depends on their plan. The platform keeps the rest. All of that should be easy to audit later.

For launch, real Stripe money flow should only be considered ready when all of these are true:
- `STRIPE_SECRET_KEY` is a real live or test key, not the placeholder
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is set
- `STRIPE_WEBHOOK_SECRET` is set
- `STRIPE_PRICE_SELLER_BASIC_MONTHLY` is set
- `STRIPE_PRICE_SELLER_PRO_MONTHLY` is set
- `STRIPE_CONNECT_WEBHOOK_SECRET` is set
- seller payout onboarding can create a real connected account link
- checkout returns buyers into the library after payment
- Stripe webhooks are pointed at `/api/stripe/webhook`
- `checkout.session.completed` can create a real buyer order record

If those are not ready, LessonForge safely falls back to the checkout preview flow instead of pretending real money is moving.

## AI Credits In Simple Founder Language
AI features are not unlimited.

Every AI action must:
- use credits
- be checked on the server
- follow plan limits
- avoid double charging
- restore credits if the AI provider fails and no usable result comes back

This helps prevent surprise costs and protects margins.

## Local Development
### 1. Install dependencies
```bash
npm install
```

### 2. Copy environment variables
```bash
cp .env.example .env.local
```

The template already uses the safest current database default:
- placeholder `DATABASE_URL`
- `LESSONFORGE_PERSISTENCE_MODE=auto`

That keeps local review flows on demo JSON until you intentionally move into the strict Prisma cutover.

### 3. Fill in required environment values
You will need values for things like:
- database connection
- auth
- Stripe
- app URLs
- AI provider keys if enabled

For safer private account access in production, make sure you also set:
- `LESSONFORGE_ACCESS_COOKIE_SECRET`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SITE_URL`

In plain language:
- Supabase handles real sign-in
- `SUPABASE_SERVICE_ROLE_KEY` is only for secure server-side writes like webhooks and subscription updates
- `LESSONFORGE_ACCESS_COOKIE_SECRET` signs the private LessonForge cookies that protect buyer, seller, admin, and owner flows
- do not launch with the placeholder cookie secret

Supabase bootstrap now lives in:
- [supabase/schema.sql](/Users/mikhailtripp/Documents/New%20project/supabase/schema.sql)

That file includes:
- the initial `profiles`, `subscriptions`, `products`, and `orders` tables
- the first Row Level Security policies
- the basic admin helper used by those policies

### 4. Run the app
```bash
npm run dev
```

This repo now uses webpack for local development by default because it is more reliable for browser-state testing in the current environment.

If you need the old Turbopack path for comparison:
```bash
npm run dev:turbo
```

### 5. Open the local site
- [http://localhost:3000](http://localhost:3000)

## Current Commands
```bash
npm run dev
npm run dev:turbo
npm run build
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run verify:contracts
npm run verify:app
npm run verify:focused
npm run verify:browser:focused
npm run verify:persistence
npm run verify:persistence:ops
npm run prisma:generate
npm run prisma:validate
npm run prisma:migrate
npm run prisma:seed
npm run prisma:import-demo
npm run prisma:preflight
npm run prisma:cutover-check
npm run prisma:verify-seller-flow
```

## Contributor Docs
- [CONTRIBUTING.md](/Users/mikhailtripp/Documents/New%20project/CONTRIBUTING.md)
- [Verification Checklist](/Users/mikhailtripp/Documents/New%20project/docs/verification-checklist.md)
- [Release Handoff Checklist](/Users/mikhailtripp/Documents/New%20project/docs/release-handoff-checklist.md)
- [Founder Review Checklist](/Users/mikhailtripp/Documents/New%20project/docs/founder-review-checklist.md)
- [Vercel Launch Setup](/Users/mikhailtripp/Documents/New%20project/docs/vercel-launch-setup.md)
- [Database Bootstrap](/Users/mikhailtripp/Documents/New%20project/docs/database-bootstrap.md)
- [Live Readiness Status](/Users/mikhailtripp/Documents/New%20project/docs/live-readiness-status.md)

`npm run prisma:preflight` is the safe first terminal check for the database cutover. It reports whether a real `DATABASE_URL` is configured, whether strict Prisma mode is selected, whether the database is reachable, and whether the repo is ready for the first live seller-flow verification.

`npm run verify:persistence` is the fastest non-browser confidence check for the persistence-prep layer. It runs typecheck plus the focused cutover/persistence contract tests before you move into the real database workflow.

`npm run verify:contracts` is the fastest broader non-browser verification pass for app logic and shared contracts. It runs `typecheck` plus the focused unit/contract suites around persistence, cutover reporting, moderation guidance, remediation focus, workflow rules, product validation, and related shared helpers.

`npm run verify:app` is the broadest local app-health check before a bigger handoff or push. It runs the shared contract suite first and then the full focused browser suite, so both the non-browser logic layer and the seller/admin/buyer/persistence flows get one pass together.

`npm run verify:focused` is the fastest full focused app-health check for everyday feature work. It runs `typecheck` and then the focused browser suite, so seller/admin continuity, buyer marketplace flows, shortlist/library actions, and the founder/admin persistence surfaces all get one quick pass together.

`npm run verify:browser:focused` is the fastest broad browser smoke check for the current LessonForge surfaces. It runs the full focused Playwright spec covering seller dashboard/remediation, admin moderation continuity, buyer marketplace/storefront/shortlist/library flows, and the founder/admin persistence surfaces.

`npm run verify:persistence:ops` is the fastest full ops check for the cutover support layer. It runs the persistence-prep verification plus the focused founder/admin browser flow, so you can confirm the header badge, top-level cutover cards, and live persistence card are all healthy before a live Prisma attempt.

Verification ladder:
- Use `npm run verify:contracts` when you want the fastest non-browser shared-logic check.
- Use `npm run verify:app` when you want the broadest local pre-ship app check.
- Use `npm run verify:focused` when you want the best everyday feature-health pass before or after UI work.
- Use `npm run verify:persistence:ops` when you are specifically preparing for database cutover or founder/admin persistence work.

Recommended handoff checklist:
- Before opening a normal feature PR, run `npm run verify:contracts`.
- Before opening a PR that touches buyer, seller, admin, or persistence UI flows, run `npm run verify:focused`.
- Before a broader release-confidence pass or handoff, run `npm run verify:app`.
- Before live Prisma or founder/admin persistence work, run `npm run verify:persistence:ops` and then `npm run prisma:cutover-check`.

The live founder/admin persistence card now starts its suggested run order with `npm run verify:persistence:ops`, so the in-product runbook matches the recommended local verification flow.

`npm run prisma:cutover-check` is the guided cutover command. It runs the preflight contract first, stops cleanly if setup is still blocked, and automatically continues into the seller-flow verification when the environment is truly ready.

It now returns the same core cutover model used by the founder/admin UI:
- stage
- stage headline
- stage description
- summary
- detail lines
- recommended next command
- ordered action list
- action-status descriptions

`npm run prisma:verify-seller-flow` is the first real cutover check for strict Prisma mode. It saves and reloads a temporary seller profile and seller-created product through the shared repository layer, then cleans those verification records up.

## Biggest Remaining Work
The app is now much further along than the early scaffold, but a few launch-critical areas still need to be finished:
- real Postgres/Prisma persistence as the default path instead of demo-first storage
- real auth and durable user identity
- real Stripe Checkout, Stripe Connect Express, and Stripe Tax wiring
- more end-to-end browser coverage for seller, buyer, admin, and founder flows
- final launch documentation and founder checklist polish

## Current Auth Hardening
LessonForge now signs both the viewer cookie and the private app-session cookie.

That matters because:
- buyer and seller private APIs should not trust plain browser state
- admin and owner access should stay private to you
- launch should not depend on unsigned local cookies

Current safe default:
- keep using Supabase for sign-in
- keep `LESSONFORGE_ACCESS_COOKIE_SECRET` set to a long random value
- rotate that secret before launch if it was ever shared

## Prisma Cutover Step
When a real Postgres database is configured, the next infrastructure milestone is:

```bash
npm run prisma:cutover-check
```

The intended order is:
- run `npm run prisma:cutover-check`
- fix any blocked setup items it reports
- rerun it until it can continue into seller-flow verification automatically

What to expect from the output:
- a cutover stage like `preflight-blocked` or `ready-for-verification`
- a human-readable stage headline and stage meaning
- a plain-language summary
- a short set of detail lines explaining the current state
- a recommended next command
- an action list showing what is already done, what is next, and what is still blocked

How to read the statuses:
- `preflight-blocked`: the environment is not ready for a live Prisma verification run yet
- `ready-for-verification`: the database and strict Prisma mode are ready, and the next step is the seller-flow verification
- `verification-passed`: the first strict Prisma seller/profile product path has passed
- `verification-failed`: Prisma was reachable, but the live seller-flow verification still found a persistence problem

How to read the action list:
- `done`: this step is already satisfied
- `next`: this is the step to run now
- `blocked`: this step is still waiting on an earlier setup condition

That sequence verifies the first strict Prisma path end to end:
- a real database is configured and reachable
- the app is in strict Prisma mode
- seller profile save and reload work
- seller-created product save and reload work
- no silent JSON fallback happens during the cutover

If you want the individual steps, you can still run:
- `npm run prisma:preflight`
- `npm run prisma:verify-seller-flow`

## Founder Review Focus
If you are reviewing the product today, focus on:
- whether the marketplace feels trustworthy before purchase
- whether the seller dashboard makes next actions obvious
- whether storefronts and related products feel connected
- whether the founder and admin summaries explain marketplace health simply
- whether the app still feels premium, clear, and not too busy

## Important Docs
Core docs to keep updated:
- `AGENTS.md`
- `PROJECT_BRIEF.md`
- `README.md`
- `.env.example`
- `docs/phase-plan.md`
- `docs/data-model-outline.md`
- `docs/database-bootstrap.md`

## Status
This project should be built in phases, not all at once.

At the end of each phase, the build should be summarized in plain language:
- what was built
- what still needs work
- what the founder should review next

Right now, the project is past the early foundation stage and into the later MVP-polish stage. The biggest remaining gap is not UI scaffolding anymore. It is replacing the last demo-first infrastructure with durable production integrations.
