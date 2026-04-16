# Data Model Outline

## Purpose
This document explains the main marketplace records in founder-friendly language before the app is fully wired to a live database.

## Main Groups

### People
- `User`: the base account record with a single role system
- `SellerProfile`: seller-specific profile, store details, and Stripe Connect status
- `Subscription`: the seller's AI plan and billing cycle state
- `CreditBalance`: the current available AI credits for the billing cycle

### Products
- `Product`: the main listing buyers see
- `ProductAsset`: uploaded files like PDFs or slide decks
- `ProductLink`: external resource links like Google Docs or video links
- `Standard`: the standards catalog, starting with Common Core Math and ELA
- `ProductStandard`: the approved standards attached to a product

### Commerce
- `Order`: the top-level purchase record
- `OrderItem`: each purchased product and license choice
- `Payout`: the seller payout record tied back to orders
- `LicenseAssignment`: future support for multi-seat license assignment

### Trust And Support
- `Review`: verified purchaser reviews
- `RefundRequest`: buyer refund requests and admin resolution
- `Report`: product issue and policy reports
- `Notification`: in-app alerts
- `AdminAuditLog`: audit trail for sensitive admin actions

### AI And Async Work
- `UsageLedger`: every AI credit debit, refund, or adjustment
- `AiJob`: long-running AI task state tracking

### Demo
- `DemoSession`: temporary demo mode state

## Important Business Rules Reflected In The Data
- Revenue split depends on plan: Starter `50/50`, Basic `60/40`, Pro `80/20`.
- AI credits never roll over.
- AI usage is enforced server-side.
- Reviews require a verified purchase.
- New products get a temporary freshness boost.
- Multi-seat licenses are planned even if the first UI only shows simpler options.
- Admin actions should be auditable.
- Products require rights-to-sell confirmation before publish.
