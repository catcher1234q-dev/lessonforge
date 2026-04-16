# LessonForge Phase Plan

## Phase 1: Foundation
Status: Built

Acceptance criteria:
- Repo has root instructions and founder docs.
- Environment values are centralized and validated.
- Feature flags and plan limits live in one place.
- A starter founder-facing roadmap page exists.
- Prisma setup, seed workflows, and test scaffolding exist, even if the full production implementation is not finished yet.

## Phase 2: Data Model And Core Services
Status: Built in working MVP form, still needs full production database cutover

Acceptance criteria:
- Prisma schema covers the core marketplace models.
- Seed strategy exists for demo users, products, and standards.
- Core service boundaries are defined for billing, AI usage, catalog, reviews, and moderation.
- Logging and analytics hooks are in place.
- Revenue split logic reflects the plan-based `50/50`, `60/40`, and `80/20` marketplace model everywhere.
- Repository persistence can fall back safely between demo JSON mode and Prisma mode during the transition.

## Phase 3: Public Marketplace
Status: Built and actively polished

Acceptance criteria:
- Homepage is aligned to LessonForge positioning.
- Marketplace browse and product detail flows work with realistic seed data.
- Search supports weighted title-first ranking and freshness boost.
- Product pages expose trust-building fields.

## Phase 4: Seller Flows
Status: Built and actively polished

Acceptance criteria:
- Seller onboarding exists.
- Stripe Connect Express onboarding flow is wired in.
- Seller can create draft listings and submit for review.
- Seller dashboard shows basic performance and status views.

## Phase 5: Buyer Checkout And Library
Status: Built in demo-safe form, still needs real Stripe checkout wiring later

Acceptance criteria:
- Buyer can add products to cart and check out.
- Orders and order items are recorded cleanly.
- Buyer library shows access, downloads, links, and update eligibility.
- Verified purchaser review eligibility is enforced.

## Phase 6: Subscriptions And AI Gating
Status: Built for current MVP demo and admin controls

Acceptance criteria:
- Plan limits are server-enforced.
- AI actions debit credits exactly once.
- Failures restore credits automatically.
- Admin kill switch works.
- Usage and cost visibility are available to admins.
- Starter, Basic, and Pro plans follow the latest founder pricing and credit rules.

## Phase 7: Admin And Moderation
Status: Built and actively polished

Acceptance criteria:
- Admin can review flagged products.
- Refund queue exists.
- Reports can be triaged by category.
- Admin audit logging is present for sensitive actions.
- Owner-only controls are separated clearly from admin-only controls.

## Phase 8: Demo Mode
Status: Built, but still should be formalized further before launch

Acceptance criteria:
- Guided tour is available.
- Free explore sandbox is available.
- Demo data is clearly separated from real user data.
- Demo ends with a clear account creation CTA.

## Phase 9: Hardening And Launch Prep
Status: In progress

Acceptance criteria:
- Critical flows have test coverage.
- Billing and payout logic are documented and verified.
- Error handling, analytics, and launch checklist are ready.
- Founder launch checklist is complete.
- Maintenance mode protects the site while preserving owner access.

Recommended verification during this phase:
- Run `npm run verify:contracts` for quick shared-logic confidence while iterating.
- Run `npm run verify:focused` when UI flows change.
- Run `npm run verify:app` before broader handoff or release-confidence passes.
- Run `npm run verify:persistence:ops` plus `npm run prisma:cutover-check` for live database and persistence preparation.

## Biggest Remaining Work
- Real Postgres/Prisma cutover instead of demo-first persistence
- Real auth and durable user identity
- Real Stripe Checkout, Connect Express, and Stripe Tax wiring
- Broader end-to-end browser coverage
- Final launch documentation and founder checklist polish
