# LessonForge Project Brief

## What LessonForge Is
LessonForge is a production-ready K-12 teacher marketplace where educators can create, upload, improve, buy, and sell educational resources.

The product should feel modern, premium, simple, and trustworthy. AI is optional. The business must be cost-controlled, auditable, and structured for real launch.

## Founder Context
This project is being built for a first-time, non-technical founder.

That means the product and documentation should favor:
- simple explanations
- practical architecture
- maintainable systems
- strong cost controls
- realistic MVP scope

Avoid unnecessary complexity. Do not require the founder to make low-level technical decisions unless absolutely necessary.

## Core Goals
LessonForge must:
- let teachers upload and publish resources
- let buyers browse, preview, buy, and access purchased resources
- support optional AI listing assistance with strict server-side limits
- support seller onboarding and payouts through Stripe Connect Express
- support moderation, reporting, refunds, and admin oversight
- be structured as a real MVP that can launch and grow

## Roles And Permissions
Use one system for real application roles:
- `OWNER`
- `ADMIN`
- `USER`

Permission model:
- `OWNER`: pricing, revenue splits, Stripe settings, payouts, AI controls, maintenance mode, financial dashboard, system settings
- `ADMIN`: moderation, reports, bans, refund review, product review only
- `USER`: standard marketplace access

The old buyer/seller/admin phrasing may still appear in legacy demo flows, but the long-term source of truth is `OWNER / ADMIN / USER`.

## Product Creation Paths
The product must support:
- Manual upload
- Manual from scratch
- AI-assisted creation

AI must always be optional.

## Target Audience
LessonForge is for:
- K-12 teachers
- all major subjects
- a broad range of classroom resource types

## Supported Resource Types
MVP should support listings for:
- Lesson plans
- Worksheets
- Assessments
- Quizzes
- Projects
- Slide decks
- Centers
- Warm ups
- Exit tickets
- Study guides
- Unit plans
- Labs
- Graphic organizers
- Intervention resources
- SPED resources
- ELL resources
- Homeschool resources
- Supplemental teaching tools

## Supported Files And Links For MVP
MVP should support:
- PDF
- DOCX
- PPTX
- XLSX
- images
- ZIP
- Google Docs links
- Google Slides links
- Google Forms links
- video links

Do not build full video hosting in MVP.

## Business Model
LessonForge uses three plans with plan-based revenue splits.

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

Upgrade nudge:
- if a Starter user reaches `$100` in sales, show a message explaining how much more they would have kept on Basic and that Basic also includes `100` AI credits

## AI Rules
AI is optional and must be tightly controlled.

Every AI action must:
- consume credits or quota
- be enforced server-side only
- have hard caps
- have rate limits
- have input character limits
- have file size limits before scanning
- have timeouts
- use idempotency keys
- restore credits automatically if the AI request fails and produces no usable output

MVP AI actions:
- title suggestions
- description rewrite
- standards scan
- thumbnail generation
- preview generation

Do not build full lesson generation in MVP.

Admin controls:
- global AI kill switch
- usage dashboard
- cost monitoring

## Async Processing
Long-running AI work must use job states:
- Queued
- Processing
- Completed
- Failed

UI should show:
- Generating
- Processing
- Completed
- Failed
- Retry option

## Standards
Launch support:
- Common Core Math
- Common Core ELA

Flow:
- when a teacher uploads or creates a resource, scan content and suggest standards with confidence levels
- seller can accept, edit, remove, or add manually
- approved standards are stored on the product
- standards are searchable in the marketplace

## Licensing
Support these license types in schema and business logic:
- Single classroom
- Multiple classroom
- Schoolwide
- Districtwide

For MVP UI:
- expose at least Single classroom
- expose at least Multiple classroom

Also include a `LicenseAssignment` model so multi-seat purchases can be assigned later.

## Product Publishing Rules
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

Required checkbox:
- `I confirm I own or have rights to sell this content`

Rule:
- no preview, no publish

## Product Workflow
Use these product states:
- Draft
- Pending review
- Published
- Flagged
- Removed

## Versioning
Teachers will update resources over time.

MVP should support versioning with `versionNumber` so buyers can receive the newest eligible version.

## Search And Ranking
Search should prioritize:
- title highest
- tags and metadata second
- description lowest

Ranking should consider:
- relevance
- conversion rate
- sales velocity
- review quality
- refund penalty
- report penalty
- freshness boost for products published within the last 14 days

Include a field like:
- `boostScore`

Filters should support:
- grade
- subject
- standards
- price
- resource type

## Buyer Experience
Marketplace must include:
- search
- filters
- clean layout

Product page must show:
- thumbnail
- preview carousel
- short description
- full description
- standards
- what is included
- file types
- license
- reviews
- seller info
- related products
- buy button

Only verified purchasers can leave reviews.

## Buyer Library
Buyer library must include:
- purchased resources
- downloads
- external access links
- instructions for Google assets
- updated versions when eligible
- issue reporting

## Upload System
Uploads must support:
- file validation
- type detection
- preview generation
- thumbnail generation
- broken link detection
- link validation

## Accessibility Feature
Include a basic accessibility check that covers:
- alt text detection
- color contrast warning
- readability

Do not claim legal compliance.

## Moderation, Refunds, And Safety
Report categories:
- Broken file
- Copyright
- Misleading listing
- Low quality
- Spam
- Access issue

Moderation rules:
- reports affect ranking
- admin reviews requests
- owner approves or auto rules decide final refund outcomes
- do not include database wipe tools
- add `AdminAuditLog`
- rate limit admin actions

## Maintenance Mode
Support a global maintenance mode toggle.

Rules:
- non-owner users should be redirected out of the app
- owner must always retain access

## Payments
Use:
- Stripe
- Stripe Connect Express

Requirements:
- seller onboarding required
- Stripe handles identity and tax
- log order total, platform fee, and seller earnings
- one-dollar purchase acceptance test must show the correct split

## Security
Enforce sensitive rules server-side.

Minimum rules:
- users can only access their own data
- sellers can only access their own seller data
- admins are limited to moderation-style powers
- owner has full system access

## Database Requirements
Minimum models:
- User
- SellerProfile
- Subscription
- UsageLedger
- CreditBalance
- Product
- ProductAsset
- ProductLink
- ProductStandard
- Standard
- Review
- Favorite
- Order
- OrderItem
- Payout
- RefundRequest
- Report
- Notification
- AdminAuditLog
- DemoSession
- LicenseAssignment
- AiJob

Important fields and concepts:
- `User.role`
- `ProductAsset.versionNumber`
- `Product.boostScore`
- `UsageLedger.idempotencyKey`
- `UsageLedger.refundedCredits`
- `OrderItem.licenseSeatCount`
- `ProductLink.lastValidationStatus`
- `Subscription.rolloverPolicy = none`

## Demo Mode
Demo mode must include:
- guided walkthrough
- free explore sandbox
- mock dashboard
- mock products
- mock AI
- mock creation flow
- create-account CTA

## Homepage
Headline:
- `Build lessons. Sell smarter. Earn more.`

Subheadline:
- `Create, upload, and sell K to 12 resources your way. Use AI when you want it.`

Sections:
- Hero
- How it works
- Choose your way
- Core features
- Product examples
- Why better
- Final CTA

Design direction:
- modern
- minimal
- high whitespace

## Build Process
Before feature implementation, always return:
- phased build plan
- repo structure
- `AGENTS.md`
- schema outline
- MVP vs Phase 2 split
- risks

Then build in phases:
- Foundation
- Database
- Homepage
- Marketplace
- Product pages
- Seller flow
- Checkout
- Library
- AI system
- Subscriptions
- Admin
- Demo
- Polish

Explain each phase simply.

## Final Rule
Do not build a demo landing page.

Build a real MVP ready for launch, scaling, and revenue.
