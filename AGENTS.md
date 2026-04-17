# AGENTS.md

## Mission
Build and maintain LessonForge as a production-minded K-12 teacher marketplace for a non-technical founder.

This repo should optimize for:
- launch realism
- maintainability
- cost control
- auditable money movement
- simple founder-facing explanations

## Founder Context
The founder is non-technical and new to websites, hosting, Stripe, and software architecture.

All explanations and summaries must:
- use plain founder-friendly language
- avoid unnecessary jargon
- explain tradeoffs simply
- avoid asking the founder to make low-level technical decisions unless absolutely necessary

When summarizing work, include:
- what was built
- why it matters
- what the founder should review next

## Working Style
Agents working in this repo must:
1. Read this file before making changes.
2. Follow the latest founder prompt and `PROJECT_BRIEF.md` as the source of truth.
3. Plan in phases before implementing major features.
4. Prefer practical, maintainable solutions over clever abstractions.
5. Keep scope realistic for MVP.
6. Add TODOs for deferred work instead of partial half-built systems.
7. Favor server-side enforcement for billing, access control, AI usage, credits, payouts, moderation, and publish rules.

## Build Priorities
Work in this order unless there is a strong reason to adjust:
1. Foundation and repo guardrails
2. Schema and domain modeling
3. Public experience
4. Seller flows
5. Buyer checkout and library
6. Subscription and AI controls
7. Admin and owner tooling
8. Demo mode
9. Hardening and launch preparation

## Preferred Stack
Default stack:
- Next.js App Router
- TypeScript
- Tailwind CSS
- Prisma
- PostgreSQL
- Stripe
- Stripe Connect Express

Do not change the stack without a clear reason. If a change is proposed, document:
- what is changing
- why it is better
- what the tradeoff is

## Product Scope
### Core Roles
Use one real application role system:
- `OWNER`
- `ADMIN`
- `USER`

Legacy buyer/seller/admin demo labels may still exist in transitional code, but new architecture should converge on `OWNER / ADMIN / USER`.

### Product Creation Paths
- Manual upload
- Manual from scratch
- AI-assisted creation

AI must always be optional.

### MVP Features
- Homepage
- Marketplace browse
- Product detail page
- Seller storefront
- Seller onboarding
- Seller dashboard
- Manual upload flow
- AI-assisted listing optimization
- Standards tagging
- Thumbnail and preview generation
- Cart and checkout
- Buyer library
- Subscription billing
- Admin dashboard
- Reports and moderation
- Refund queue
- Demo mode
- Legal and policy pages

### Explicitly Deferred To Phase 2
- Full AI lesson generation
- Custom video hosting
- Advanced recommendation engine
- Expanded standards systems beyond Common Core Math and ELA
- School and district team workflows beyond schema support
- Deep seller coaching automations

Do not quietly pull Phase 2 work into MVP.

## Business Model
LessonForge uses plan-based pricing and revenue splits.

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
- seller keeps `80%`
- platform keeps `20%`
- `300` AI credits each billing cycle

Rules:
- credits reset each billing cycle when applicable
- unused credits expire
- no rollover
- no unlimited AI usage
- all AI usage enforced server-side

Starter upgrade nudge:
- if a Starter user reaches `$100` in sales, surface an upgrade message explaining how much more they would have kept on Basic and that Basic includes `100` AI credits

## AI Rules
AI usage must be tightly controlled.

Required rules:
- every AI action consumes credits or quota
- all credit enforcement is server-side
- no unlimited AI path anywhere
- credits reset each billing cycle where applicable
- unused credits expire
- no rollover
- plan limits are centralized in one server-side config
- hard caps are required
- rate limits are required
- rate limit target is `2 requests per minute`
- input size limits are required
- file size limits are required before scanning
- target file limit is `10MB to 20MB`
- timeouts are required
- idempotency keys are required to prevent double-charging
- credits must be restored automatically when upstream AI work fails without usable output
- admin kill switch required
- admin AI usage and cost visibility required

MVP AI actions only:
- title suggestions
- description rewrite
- standards scan
- thumbnail generation
- preview generation

Do not implement full AI lesson generation in MVP.

## Async Job Rules
Long-running AI work must use:
- Queued
- Processing
- Completed
- Failed

The UI should always show:
- generating
- processing
- completed
- failed
- retry option

## Publishing Rules
Products cannot be published without:
- title
- description
- grade
- subject
- resource type
- license
- preview
- thumbnail
- rights-to-sell confirmation

Required confirmation:
- `I confirm I own or have rights to sell this content`

Rule:
- no preview, no publish

## Product Workflow
Use these statuses:
- Draft
- Pending review
- Published
- Flagged
- Removed

## Search And Ranking Rules
Search weighting:
- title highest
- tags/metadata next
- description lowest

Ranking signals should support:
- relevance
- conversion rate
- sales velocity
- review quality
- refund penalty
- report penalty
- temporary freshness boost for new listings

## Access, Admin, And Owner Rules
### Owner
- pricing
- revenue splits
- Stripe settings
- payouts
- AI settings
- maintenance mode
- financial dashboard
- system settings

### Admin
- moderation
- product review
- bans
- report handling
- refund review

Admins must not control:
- pricing
- Stripe settings
- revenue split configuration
- owner-only AI settings

### Maintenance Mode
- global maintenance mode toggle required
- non-owner users should be redirected out
- owner must always retain access

### Admin Safety
- do not include database wipe tools
- add `AdminAuditLog`
- track who, what, and when for sensitive actions
- rate limit admin actions

## Accessibility Feature
Support a basic accessibility check for:
- alt text detection
- color contrast warnings
- readability

Do not claim legal compliance.

## Repo Structure Expectations
The repo should include, early in the build:
- `README.md`
- `.env.example`
- `PROJECT_BRIEF.md`
- environment validation
- typed config
- feature flags
- Prisma schema
- seed scaffolding
- service layer
- error boundaries
- background job abstraction
- test scaffolding
- beginner-friendly docs

## Documentation Rules
Write docs for a beginner founder, not an experienced engineer.

Docs should explain:
- how to run locally
- what Stripe is doing
- how subscriptions work
- how credits work
- how payouts work
- what must happen before launch

When making architectural choices, explain the reason briefly in plain English.

## Decision Defaults
Unless there is a strong reason otherwise:
- choose the simpler architecture
- choose the cheaper safe default
- choose server-side enforcement
- choose launchable scope over ambitious scope
- choose explicit TODOs over partial unfinished systems

## If You Are Unsure
If something is ambiguous:
1. preserve MVP scope
2. prefer maintainability
3. prefer cost control
4. prefer founder clarity
5. document the assumption clearly
